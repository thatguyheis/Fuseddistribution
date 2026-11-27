const partSize = 512 * 1024;
export const validPhotoId = value => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value || '');
export function photoFormat(bytes) {
  const tag = (a,b) => String.fromCharCode(...bytes.subarray(a,b));
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return ['image/jpeg','jpg'];
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return ['image/png','png'];
  if (tag(0,4)==='RIFF' && tag(8,12)==='WEBP') return ['image/webp','webp'];
  if (tag(4,8)==='ftyp' && ['heic','heix','hevc','hevx','mif1','msf1'].includes(tag(8,12))) return ['image/heif','heif'];
  if (tag(4,8)==='ftyp' && ['avif','avis'].includes(tag(8,12))) return ['image/avif','avif'];
  return null;
}
export async function readPhoto(request,id,limit) {
  const size = Number(request.headers.get('Content-Length'));
  if (!validPhotoId(id)) return new Response('Invalid photo identifier.', {status:400});
  if (!Number.isSafeInteger(size) || size<=0 || size>limit) return new Response('Photo exceeds the per-file size limit.',{status:413});
  const bytes = new Uint8Array(await request.arrayBuffer());
  const format = photoFormat(bytes);
  if (size!==bytes.length || !format) return new Response('Choose a JPEG, PNG, WebP, HEIF or AVIF photo.',{status:415});
  let name;
  try {name=decodeURIComponent(request.headers.get('X-Photo-Name') || '').slice(0,180);} catch {}
  return {bytes, info:{id,size,type:format[0],extension:format[1],name:name || 'Photo.'+format[1]}};
}
export function storePhoto(sql,owner,{info,bytes}) {
  sql.exec('CREATE TABLE IF NOT EXISTS photo_blobs(owner TEXT,id TEXT,part INTEGER,bytes BLOB NOT NULL,PRIMARY KEY(owner,id,part))');
  for (let pos=0;pos<bytes.length;pos+=partSize) sql.exec('INSERT INTO photo_blobs VALUES(?,?,?,?)',owner,info.id,pos/partSize,bytes.slice(pos,pos+partSize).buffer);
}
export function servePhoto(sql,owner,info,download=false) {
  if (!info) return new Response('Photo unavailable.',{status:404});
  let offset=0;
  const body=new ReadableStream({pull(controller){
    const {bytes}=sql.exec('SELECT bytes FROM photo_blobs WHERE owner=? AND id=? AND part=?',owner,info.id,offset++).one();
    controller.enqueue(new Uint8Array(bytes));
    if(offset*partSize>=info.size)controller.close();
  }});
  const filename=info.name.replace(/[^a-zA-Z0-9._ -]/g,'-');
  return new Response(body,{headers:{'Content-Type':info.type,'Content-Length':String(info.size),'Content-Disposition':(download?'attachment':'inline')+'; filename="'+filename+'"'}});
}
