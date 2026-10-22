from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
root=Path(__file__).resolve().parents[3]
slug='walking-liberty-half-dollar-silver-eagle'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root/'public'),**kwargs)
 def translate_path(self,path):
  route=urlsplit(path).path
  routes={'/comparison/':root/'content/coin-history'/slug/'compare.html','/review-video/new.mp4':root/'video/out'/slug/(slug+'.mp4'),'/review-video/previous.mp4':root/'video/out/morgan-dollar-o-mint-mark-new-orleans/morgan-dollar-o-mint-mark-new-orleans.mp4'}
  return str(routes[route]) if route in routes else super().translate_path(path)
ThreadingHTTPServer(('127.0.0.1',8789),Handler).serve_forever()
