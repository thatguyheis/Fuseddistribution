from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import re
ROOT = Path(__file__).resolve().parents[3]
SLUG = 'fort-vancouver-centennial-half-dollar'
VIDEO = ROOT / 'video/out' / SLUG / (SLUG + '.mp4')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)
    def translate_path(self, path):
        route = urlsplit(path).path
        routes = {'/': Path(__file__).with_name('presentation.html'), '/reel.mp4': VIDEO,
                  '/poster.jpg': ROOT / 'public/blog' / SLUG / 'hero.jpg',
                  '/article/': ROOT / 'public/blog' / SLUG / 'index.html'}
        return str(routes[route]) if route in routes else super().translate_path(path)
    def do_GET(self):
        if urlsplit(self.path).path != '/reel.mp4' or not VIDEO.exists():
            return super().do_GET()
        size = VIDEO.stat().st_size
        header = self.headers.get('Range')
        start, end = 0, size - 1
        if header:
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', header)
            if not match:
                self.send_error(416); return
            start = int(match[1]); end = min(int(match[2]) if match[2] else end, size - 1)
            if start > end or start >= size:
                self.send_error(416); return
        self.send_response(206 if header else 200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if header: self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        try:
            with VIDEO.open('rb') as source:
                source.seek(start); remaining = end - start + 1
                while remaining:
                    chunk = source.read(min(1024*1024, remaining))
                    if not chunk: break
                    self.wfile.write(chunk); remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
ThreadingHTTPServer(('127.0.0.1', 8790), Handler).serve_forever()
