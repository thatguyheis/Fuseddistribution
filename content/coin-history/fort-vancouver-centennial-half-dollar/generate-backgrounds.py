"""Local illustrative plates, deliberately not an exact historical reconstruction."""
from pathlib import Path
import json, subprocess, os, hashlib
root=Path(__file__).resolve().parents[3]
folder=Path(__file__).parent/'generated'
engine=Path.home()/'Library/Application Support/open-generative-ai/local-ai'
scenes=[('palisade-exterior',71431,'Cinematic historical illustration of a modest nineteenth century Pacific Northwest fur trading post, tall weathered vertical timber palisade enclosing low timber buildings, simple wooden gate, distant evergreen forest, soft overcast morning with luminous fog, ground level viewpoint, realistic timber textures, muted warm wood and cool blue green atmosphere, documentary concept art, elegant composition, vertical image, no people, no flags, no writing, no modern objects, not a castle'),('palisade-courtyard',71432,'Cinematic historical illustration inside a modest nineteenth century Pacific Northwest fur trading post courtyard, weathered timber palisade and low simple wooden workshops, stacked plain wooden barrels and simple crates beside a workshop, soft diagonal morning sunlight, realistic timber grain and earth path, atmospheric blue green shadows, elegant documentary concept art, vertical image, no people, no flags, no writing, no modern objects, no castle')]
for name,seed,prompt in scenes[:1]:
 out=folder/(name+'.png')
 record={'name':name,'prompt':prompt,'seed':seed,'model':'DreamShaper_8_pruned.safetensors','modelLicense':'creativeml-openrail-m','width':384,'height':640,'steps':12,'role':'AI illustration of a generic palisade trading post, not a reconstruction or archival evidence'}
 if not out.exists():
  env=dict(os.environ,DYLD_LIBRARY_PATH=str(engine/'bin'),LD_LIBRARY_PATH=str(engine/'bin'))
  subprocess.run([str(engine/'bin/sd-cli'),'-m',str(engine/'models'/record['model']),'-p',prompt,'-n','text, watermark, logos, modern buildings, cars, guns, people, castles, towers, fantasy, deformed architecture, blurry','-o',str(out),'--steps','12','-H','640','-W','384','--cfg-scale','7','--seed',str(seed),'--sampling-method','euler_a','--vae-tiling'],env=env,timeout=240,check=True)
 record['sha256']=hashlib.sha256(out.read_bytes()).hexdigest()
 (folder/(name+'.json')).write_text(json.dumps(record,indent=2)+'\n')
 print('COMPLETE',name,flush=True)
