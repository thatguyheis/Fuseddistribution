"""Master approved v2 and enforce the user's upload byte limit."""
import json,subprocess,hashlib,shutil,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];SLUG=sys.argv[1];OUT=ROOT/'video/out'/SLUG
VIDEO=OUT/(SLUG+'.mp4');SOURCE=OUT/(SLUG+'-v2-before-mastering.mp4');TEMP=OUT/(SLUG+'-v2-mastered.mp4')
if SOURCE.exists():raise RuntimeError('Source archive exists; inspect before repeating mastering')
shutil.copy2(VIDEO,SOURCE)
def run(args):return subprocess.run(['ffmpeg','-hide_banner','-nostats',*args],capture_output=True,text=True,check=True)
def measurement(log):return json.loads(log[log.rfind('{'):log.rfind('}')+1])
m=measurement(run(['-i',str(SOURCE),'-af','loudnorm=I=-16:TP=-1.8:LRA=11:print_format=json','-f','null','-']).stderr)
f='loudnorm=I=-16:TP=-1.8:LRA=11:'+':'.join(f'{n}={m[k]}' for n,k in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])+':linear=true:print_format=json'
r=run(['-y','-i',str(SOURCE),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',f,'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(TEMP)]);(OUT/'audio-mastering-v2.log').write_text(r.stderr)
def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
p=probe(TEMP);duration=float(p['format']['duration']);target=45_000_000;maximum=50_000_000
if TEMP.stat().st_size>=target:
 bitrate=int((target*8/duration-192000-96000)*.98);assert bitrate>500000
 encoded=OUT/(SLUG+'-v2-size-limited.mp4');common=['-y','-i',str(TEMP),'-map','0:v:0','-c:v','libx264','-preset','slow','-b:v',str(bitrate),'-pix_fmt','yuv420p','-passlogfile',str(OUT/'v2-size-pass')]
 run([*common,'-pass','1','-an','-f','null',os.devnull]);run([*common,'-pass','2','-map','0:a:0','-c:a','copy','-movflags','+faststart',str(encoded)]);TEMP=encoded;p=probe(TEMP)
v=next(s for s in p['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(720,1280);assert TEMP.stat().st_size<maximum
shutil.copy2(TEMP,VIDEO)
final=measurement(run(['-i',str(VIDEO),'-af','loudnorm=I=-16:TP=-1.8:LRA=11:print_format=json','-f','null','-']).stderr)
meta=json.loads((OUT/'render-meta.json').read_text());meta['uploadDelivery']={'width':720,'height':1280,'bytes':VIDEO.stat().st_size,'maximumBytesExclusive':maximum,'pass':True,'videoSha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'audioMeasured':final,'sourceArchive':str(SOURCE.relative_to(ROOT))};(OUT/'render-meta.json').write_text(json.dumps(meta,indent=2)+'\n');(OUT/'upload-size-qa.json').write_text(json.dumps(meta['uploadDelivery'],indent=2)+'\n');print(json.dumps(meta['uploadDelivery'],indent=2))
