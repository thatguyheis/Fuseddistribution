import { photoFormat, validPhotoId, readPhoto, storePhoto, servePhoto } from './photos.js';
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
    const photoId = url.searchParams.get('photo');
    if (request.method === 'GET') {
      if (!photoId) return this.photo();
      const info=this.details()?.photos?.find(p=>p.id===photoId);
      return servePhoto(this.sql,'request',info);
    }
    if (request.method === 'PUT' && validPhotoId(photoId)) return this.stagePhoto(request,photoId);
    const id = url.pathname.slice(1);
    let data = this.details();
    if (!data) {
      const length = Number(request.headers.get('Content-Length'));
      if (!length || length > maxPhoto + 65536) return fail('Choose a photo under 12 MB.',413);
      let form;
      try { form = await request.formData(); } catch { return fail('Invalid request form.'); }
      const photo = form.get('photo');
      if (photo && (typeof photo === 'string' || !photo.size || photo.size > maxPhoto)) return fail('Choose a photo under 12 MB.',413);
      let ids;
      try { ids=JSON.parse(form.get('photoIds') || '[]'); } catch {return fail('Invalid photo selection.');}
      if (!Array.isArray(ids) || !ids.every(validPhotoId) || new Set(ids).size!==ids.length || (photo && ids.length)) return fail('Invalid photo selection.');
      let fields;
      try { fields = parseDetails(form, Boolean(photo || ids.length)); } catch (error) { return fail(error.message); }
      const bytes = photo ? new Uint8Array(await photo.arrayBuffer()) : null;
      const format = bytes && photoFormat(bytes);
      if (photo && !format) return fail('Choose a JPEG, PNG, WebP, HEIF or AVIF photo.',415);
      // A single synchronous transaction commits the metadata and every part of the
      // photo. An interrupted index update can be retried with the same request ID.
      this.sql.exec('CREATE TABLE IF NOT EXISTS photo (part INTEGER PRIMARY KEY, bytes BLOB NOT NULL)');
      this.prepareStaging();
      const photos=ids.map(pid=>this.sql.exec('SELECT meta FROM staged_photos WHERE id=?',pid).toArray()[0]).map(row=>row && JSON.parse(row.meta));
      if(photos.some(p=>!p))return fail('A photo upload is incomplete. Please resend.',409);
      data = this.storage.transactionSync(() => {
        const existing = this.details();
        if (existing) return existing;
        const entry = {...fields,id,photos,submitted:new Date().toISOString(),photo:format ? {type:format[0],extension:format[1],size:bytes.length} : null};
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
  prepareStaging() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS staged_photos(id TEXT PRIMARY KEY,meta TEXT NOT NULL)');
  }
  async stagePhoto(request,id) {
    const saved=this.details();
    if(saved)return saved.photos?.some(p=>p.id===id) ? new Response(null,{status:204}) : fail('This request was already submitted.',409);
    const upload=await readPhoto(request,id,maxPhoto);
    if(upload instanceof Response)return upload;
    await this.storage.setAlarm(Date.now()+86400000);
    return this.storage.transactionSync(()=>{
      if(this.details())return fail('This request was already submitted.',409);
      this.prepareStaging();
      if(!this.sql.exec('SELECT 1 FROM staged_photos WHERE id=?',id).toArray().length) {
        storePhoto(this.sql,'request',upload);
        this.sql.exec('INSERT INTO staged_photos VALUES(?,?)',id,JSON.stringify(upload.info));
      }
      return new Response(null,{status:204});
    });
  }
  alarm() {
    const kept=this.details()?.photos || [];
    this.prepareStaging();
    const ids=new Set(kept.map(photo=>photo.id));
    this.storage.transactionSync(()=>{
      for(const row of this.sql.exec('SELECT id FROM staged_photos').toArray()) {
        if(!ids.has(row.id))this.sql.exec('DELETE FROM photo_blobs WHERE owner=? AND id=?','request',row.id);
      }
      this.sql.exec('DELETE FROM staged_photos');
    });
  }
  details() {
    const row = this.sql.exec('SELECT data FROM submission WHERE id=1').toArray()[0];
    return row ? JSON.parse(row.data) : null;
  }
  photo() {
    const data = this.details();
    if (!data?.photo) return servePhoto(this.sql,'request',data?.photos?.[0]);
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
