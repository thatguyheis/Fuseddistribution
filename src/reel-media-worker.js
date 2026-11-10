// Public approved reel delivery, isolated from the website and its zone rules.
const mediaPath = /^\/(reels(?:-x)?)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/\2\.mp4$/;
const cors = {'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers':'Range', 'Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges'};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!mediaPath.test(url.pathname)) return new Response('Not found', {status:404});
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD, OPTIONS'}});
    try {
      // The existing uploader caps these objects at 25 MiB; range handling is bounded.
      const media = await env.REELS_KV.get(url.pathname.slice(1), 'arrayBuffer');
      if (!media) return new Response('Not found', {status:404, headers:cors});
      const size = media.byteLength;
      if (!size || size > 25 * 1024 * 1024) return new Response('Invalid media size', {status:502, headers:cors});
      const headers = new Headers({...cors, 'Content-Type':'video/mp4', 'Accept-Ranges':'bytes',
        'Content-Length':String(size), 'Cache-Control':'public, max-age=300',
        'Content-Disposition':`inline; filename="${url.pathname.split('/').at(-1)}"`, 'X-Content-Type-Options':'nosniff'});
      let start = 0, end = size - 1, status = 200;
      const range = request.headers.get('Range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) return invalidRange(size);
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end || (!match[1] && Number(match[2]) === 0)) return invalidRange(size);
        status = 206;
        headers.set('Content-Length', String(end-start+1));
        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
      }
      const body = request.method === 'HEAD' ? null : status === 206 ? media.slice(start,end+1) : media;
      return new Response(body,{status,headers});
    } catch (error) {
      console.error('Reel media delivery failed', {path:url.pathname, message:error.message});
      return new Response('Media temporarily unavailable', {status:503, headers:{...cors,'Retry-After':'30'}});
    }
  },
};

function invalidRange(size) {
  return new Response(null,{status:416,headers:{...cors,'Content-Range':`bytes */${size}`,'Accept-Ranges':'bytes'}});
}
