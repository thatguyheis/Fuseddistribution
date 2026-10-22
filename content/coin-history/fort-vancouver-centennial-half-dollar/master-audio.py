"""Two-pass presentation loudness mastering, preserving the original encode."""
import json,subprocess,hashlib,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];SLUG='fort-vancouver-centennial-half-dollar'
OUT=ROOT/'video/out'/SLUG;VIDEO=OUT/(SLUG+'.mp4');SOURCE=OUT/(SLUG+'-unmastered.mp4')
if SOURCE.exists():raise RuntimeError('Unmastered archive exists; inspect before repeating mastering')
shutil.copy2(VIDEO,SOURCE)
first=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(SOURCE),'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
log=first.stderr;measurement=json.loads(log[log.rfind('{'):log.rfind('}')+1])
filter_='loudnorm=I=-16:TP=-1.5:LRA=11:'+':'.join(f'{name}={measurement[key]}' for name,key in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])+':linear=true:print_format=json'
run=subprocess.run(['ffmpeg','-v','info','-nostats','-y','-i',str(SOURCE),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',filter_,'-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart',str(VIDEO)],capture_output=True,text=True,check=True)
(OUT/'audio-mastering.log').write_text(run.stderr)
meta=json.loads((OUT/'render-meta.json').read_text());props=json.loads((OUT/'render-props.json').read_text());shots=[s for group in props['presentation']['segments'].values() for s in group];meta['presentationShots']={'total':len(shots),'videoShots':sum(s['type']=='video' for s in shots),'photoShots':sum(s['type']=='photo' for s in shots)};meta['presentationMastering']={'targetLufs':-16,'truePeakCeilingDbtp':-1.5,'method':'two-pass loudnorm, video stream copied','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'inputMeasurement':measurement};(OUT/'render-meta.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Presentation audio mastered; picture stream preserved.')
