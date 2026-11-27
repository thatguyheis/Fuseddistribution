const maxFile = 25000000;
const chunkSize = 512 * 1024;
const stages = ['Sourcing', 'Gate 1', 'Voice and scenes', 'Gate 2', 'Rendering', 'Quality check', 'In progress', 'Blocked'];
const allowed = ['video/mp4', 'application/zip', 'image/jpeg', 'image/png'];
const reply = (message, status) => new Response(message, { status });
const conflict = () => reply('This item changed. Refresh the log before editing it again.', 409);
const clean = (value, max) => typeof value === 'string' && value.length <= max ? value.trim() : null;
function fileMatches(type, bytes) {
  const sig = (...values) => values.every((v, i) => bytes[i] === v);
  if (type === 'video/mp4') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  if (type === 'application/zip') return sig(80, 75, 3, 4) || sig(80, 75, 5, 6);
  if (type === 'image/jpeg') return sig(255, 216, 255);
  return type === 'image/png' && sig(137, 80, 78, 71, 13, 10, 26, 10);
}
function mediaRange(header, size) {
  if (!header) return [0, size - 1];
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start <= end && start < size ? [start, end] : null;
}
function catalogUrl(input) {
  if (!input) return '';
  try {
    const url = new URL(input);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && url.hostname === 'auctions.coinssince1994.com') {
      url.hash = '';
      return url.toString();
    }
  } catch {}
  return null;
}
export class ShiftLog {
  constructor(ctx) {
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS tasks (slot INTEGER PRIMARY KEY, data TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS media (id TEXT, part INTEGER, body BLOB NOT NULL, PRIMARY KEY (id, part))');
    // An interrupted upload has no task reference. Reclaim it on the next cold start.
    this.sql.exec("DELETE FROM media WHERE id NOT IN (SELECT json_extract(data, '$.media') FROM tasks WHERE json_extract(data, '$.media') IS NOT NULL)");
  }
  list() { return this.sql.exec('SELECT data FROM tasks ORDER BY slot').toArray().map(r => JSON.parse(r.data)); }
  get(slot) {
    const row = this.sql.exec('SELECT data FROM tasks WHERE slot=?', slot).toArray()[0];
    return row ? JSON.parse(row.data) : { slot, version: 0, status: 'Open' };
  }
  save(task) {
    task.version++;
    task.updated = new Date().toISOString();
    this.sql.exec('INSERT OR REPLACE INTO tasks(slot,data) VALUES(?,?)', task.slot, JSON.stringify(task));
    return Response.json(task);
  }
  async fetch(request) {
    const parts = new URL(request.url).pathname.split('/');
    const slot = Number(parts[4]);
    const action = parts[5];
    const role = request.headers.get('X-Desk-Role');
    if (!slot && request.method === 'GET') return Response.json({ role, tasks: this.list() });
    if (!slot) return reply('Not found', 404);
    const task = this.get(slot);
    if (request.method === 'GET' && action === 'media') return this.play(task, request);
    if (request.method !== 'POST' || (action === 'decision' ? role !== 'reviewer' : role !== 'worker')) return reply('Forbidden', 403);
    if (String(task.version) !== request.headers.get('If-Match')) return conflict();
    if (action === 'media') return this.upload(task, request);
    const length = Number(request.headers.get('Content-Length'));
    if (!length || length > 12000) return reply('Invalid form size.', 400);
    let input;
    try { input = await request.json(); } catch { return reply('Invalid form.', 400); }
    if (!input || typeof input !== 'object') return reply('Invalid form.', 400);
    if (this.get(slot).version !== task.version) return conflict();
    if (action === 'decision') {
      if (task.status !== 'In review') return conflict();
      const note = clean(input.feedback, 1200);
      if (!['Approved','Changes requested'].includes(input.status) || note === null || (input.status === 'Changes requested' && !note)) return reply('Add feedback when requesting changes.', 400);
      return this.save({ ...task, status: input.status, feedback: note });
    }
    if (['In review','Approved'].includes(task.status)) return conflict();
    const title = clean(input.title, 160);
    const notes = clean(input.notes, 1200);
    const lot = clean(input.lot || '', 30);
    const source = catalogUrl(clean(input.source || '', 1500) ?? 'invalid');
    if (!title || notes === null || lot === null || source === null || !stages.includes(input.stage)) return reply('Check the title, stage and official catalog link.', 400);
    if (slot <= 5 && (!lot || !source)) return reply('Enter the lot number and its official listing link.', 400);
    if (slot <= 5 && this.list().some(other => other.slot !== slot && other.slot <= 5 && (other.source === source || other.lot.toLowerCase() === lot.toLowerCase()))) return reply('That lot already has a row in this shift.', 409);
    return this.save({ ...task, title, lot, source, notes, stage: input.stage, status: task.status === 'Changes requested' ? task.status : 'Draft' });
  }
  async upload(task, request) {
    if (!task.title || ['Approved','In review'].includes(task.status)) return conflict();
    const size = Number(request.headers.get('Content-Length'));
    const type = request.headers.get('Content-Type');
    if (!Number.isInteger(size) || size < 12 || size >= maxFile) return reply('Choose a file smaller than 25 MB.', 413);
    if (!allowed.includes(type) || (task.slot <= 5 && type !== 'video/mp4')) return reply('Unsupported file type.', 415);
    const reader = request.body?.getReader();
    if (!reader) return reply('Missing file.', 400);
    const id = crypto.randomUUID();
    let saved = false;
    let part = 0, total = 0, used = 0;
    const buffer = new Uint8Array(chunkSize);
    const write = () => {
      if (part === 0 && !fileMatches(type, buffer.subarray(0, used))) return false;
      this.sql.exec('INSERT INTO media VALUES(?,?,?)', id, part++, buffer.slice(0, used).buffer);
      used = 0;
      return true;
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > size) return reply('File exceeds declared size.', 413);
        for (let off = 0; off < value.length;) {
          const n = Math.min(chunkSize - used, value.length - off);
          buffer.set(value.subarray(off, off + n), used);
          used += n;
          off += n;
          if (used === chunkSize && !write()) return reply('The file contents do not match its type.', 415);
        }
      }
      if (total !== size || (used && !write())) return reply('Incomplete or invalid file.', 400);
      if (this.get(task.slot).version !== task.version) return conflict();
      const response = this.save({ ...task, media: id, size, type, status: 'In review' });
      saved = true;
      return response;
    } finally {
      if (!saved) {
        this.sql.exec('DELETE FROM media WHERE id=?', id);
        await reader.cancel().catch(() => {});
      }
    }
  }
  play(task, request) {
    if (!task.media) return reply('File unavailable.', 404);
    const range = request.headers.get('Range');
    const bounds = mediaRange(range, task.size);
    if (!bounds) return new Response(null, { status:416, headers:{ 'Content-Range':'bytes */' + task.size } });
    const [first, last] = bounds;
    const headers = { 'Content-Type': task.type, 'Accept-Ranges': 'bytes', 'Content-Length': String(last - first + 1) };
    if (range) headers['Content-Range'] = 'bytes ' + first + '-' + last + '/' + task.size;
    if (task.type === 'application/zip') headers['Content-Disposition'] = 'attachment; filename="project-assets.zip"';
    let pos = first;
    const sql = this.sql;
    const stream = new ReadableStream({
      pull(controller) {
        const part = Math.floor(pos / chunkSize);
        const row = sql.exec('SELECT body FROM media WHERE id=? AND part=?', task.media, part).one();
        const bytes = new Uint8Array(row.body);
        const offset = pos % chunkSize;
        const data = bytes.subarray(offset, Math.min(bytes.length, offset + last - pos + 1));
        controller.enqueue(data);
        pos += data.length;
        if (pos > last) controller.close();
      }
    });
    return new Response(stream, { status:range ? 206 : 200, headers });
  }
}
