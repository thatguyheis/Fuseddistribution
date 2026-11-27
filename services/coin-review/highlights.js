// Each request keeps its photo in its own object. A separate indexed object lists
// all completed requests independently of shift dates, daily slots and photo sizes.
const maxPhoto = 12 * 1024 * 1024;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export const validRequestId = value => uuid.test(value || '');
const fail = (message, status = 400) => new Response(message, {status});
function dateOK(s) {
  if (!s) return true;
  const d = new Date(s + 'T12:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(+d) && d.toISOString().slice(0,10) === s;
}
export function parseDetails(form, hasPhoto) {
  const details = {};
  for (const [field, max] of Object.entries({role:30,name:100,highlight:2400,deadline:10,deadlineTime:5,showName:160,platform:100,showDate:10,showTime:5})) {
    const value = form.get(field) ?? '';
    if (typeof value !== 'string' || value.length > max) throw Error('Check the ' + field + ' field.');
    details[field] = value.trim();
  }
  if (!['Streamer','Back office','Social media','Other'].includes(details.role)) throw Error('Choose your role.');
  if (!details.highlight && !hasPhoto) throw Error('Describe the highlight or attach a photo.');
  for (const [day,time] of [[details.deadline,details.deadlineTime],[details.showDate,details.showTime]]) {
    if (!dateOK(day) || (time && (!day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) throw Error('Enter a valid date for each time you specify.');
  }
  return details;
}
function photoFormat(bytes) {
  const tag = (a,b) => String.fromCharCode(...bytes.subarray(a,b));
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return ['image/jpeg','jpg'];
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return ['image/png','png'];
  if (tag(0,4)==='RIFF' && tag(8,12)==='WEBP') return ['image/webp','webp'];
  if (tag(4,8)==='ftyp' && ['heic','heix','hevc','hevx','mif1','msf1'].includes(tag(8,12))) return ['image/heif','heif'];
  if (tag(4,8)==='ftyp' && ['avif','avis'].includes(tag(8,12))) return ['image/avif','avif'];
  return null;
}
export class HighlightRequests {
  constructor(ctx, env) { this.storage = ctx.storage; this.sql = ctx.storage.sql; this.env = env; }
  inbox() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS inbox (seq INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, details TEXT NOT NULL)');
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/register') {
      const data = await request.json();
      this.inbox();
      this.sql.exec('INSERT INTO inbox(id,details) VALUES(?,?) ON CONFLICT(id) DO NOTHING',data.id,JSON.stringify(data));
      return new Response(null,{status:204});
    }
    if (url.pathname === '/list') {
      this.inbox();
      const cursor = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
      if (!Number.isSafeInteger(cursor) || cursor < 1) return fail('Invalid page.');
      const rows = this.sql.exec('SELECT seq,details FROM inbox WHERE seq < ? ORDER BY seq DESC LIMIT 21', cursor).toArray();
      return Response.json({items:rows.slice(0,20).map(r=>JSON.parse(r.details)),next:rows.length>20?rows[19].seq:null});
    }
    if (!validRequestId(url.pathname.slice(1))) return fail('Not found.',404);
    this.sql.exec('CREATE TABLE IF NOT EXISTS submission (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    if (request.method === 'GET') return this.photo();
    const id = url.pathname.slice(1);
    let data = this.details();
    if (!data) {
      const length = Number(request.headers.get('Content-Length'));
      if (!length || length > maxPhoto + 65536) return fail('Choose a photo under 12 MB.',413);
      let form;
      try { form = await request.formData(); } catch { return fail('Invalid request form.'); }
      const photo = form.get('photo');
      if (photo && (typeof photo === 'string' || !photo.size || photo.size > maxPhoto)) return fail('Choose a photo under 12 MB.',413);
      let fields;
      try { fields = parseDetails(form, Boolean(photo)); } catch (error) { return fail(error.message); }
      const bytes = photo ? new Uint8Array(await photo.arrayBuffer()) : null;
      const format = bytes && photoFormat(bytes);
      if (photo && !format) return fail('Choose a JPEG, PNG, WebP, HEIF or AVIF photo.',415);
      // A single synchronous transaction commits the metadata and every part of the
      // photo. An interrupted index update can be retried with the same request ID.
      this.sql.exec('CREATE TABLE IF NOT EXISTS photo (part INTEGER PRIMARY KEY, bytes BLOB NOT NULL)');
      data = this.storage.transactionSync(() => {
        const existing = this.details();
        if (existing) return existing;
        const entry = {...fields,id,submitted:new Date().toISOString(),photo:format ? {type:format[0],extension:format[1],size:bytes.length} : null};
        if (bytes) for(let pos=0;pos<bytes.length;pos+=524288) this.sql.exec('INSERT INTO photo VALUES(?,?)',pos/524288,bytes.slice(pos,pos+524288).buffer);
        this.sql.exec('INSERT INTO submission VALUES(1,?)',JSON.stringify(entry));
        return entry;
      });
    }
    const index = this.env.HIGHLIGHTS.get(this.env.HIGHLIGHTS.idFromName('inbox'));
    const registered = await index.fetch('https://requests.internal/register',{method:'POST',body:JSON.stringify(data)});
    if (!registered.ok) return fail('Could not complete the handoff. Please retry.',503);
    return Response.json({id:data.id},{status:201});
  }
  details() {
    const row = this.sql.exec('SELECT data FROM submission WHERE id=1').toArray()[0];
    return row ? JSON.parse(row.data) : null;
  }
  photo() {
    const data = this.details();
    if (!data?.photo) return fail('Photo unavailable.',404);
    const sql = this.sql;
    let offset = 0;
    const body = new ReadableStream({pull(controller){
      const part = sql.exec('SELECT bytes FROM photo WHERE part=?',offset++).one();
      controller.enqueue(new Uint8Array(part.bytes));
      if (offset*524288 >= data.photo.size) controller.close();
    }});
    return new Response(body,{headers:{'Content-Type':data.photo.type,'Content-Length':String(data.photo.size),'Content-Disposition':'inline; filename="highlight-'+data.id+'.'+data.photo.extension+'"'}});
  }
}
