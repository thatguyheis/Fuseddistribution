from pathlib import Path
import subprocess,os,json,hashlib
root=Path(__file__).resolve().parents[3];engine=Path.home()/'Library/Application Support/open-generative-ai/local-ai'
jobs=[('pittman-act-silver-dollar-melting','silver-foundry',71481,'Cinematic documentary concept illustration, early twentieth century metal foundry interior, a small glowing crucible of molten silver on dark refractory brick hearth, unmarked silver ingots cooling on a rough iron workbench, dramatic amber furnace light and cool blue shadows, realistic materials, close composition, no people, no text, no coins, no logos'),('peace-dollar-history-and-symbolism','engraver-workbench',71482,'Cinematic documentary concept illustration, early twentieth century sculptor workbench beside tall window, simple steel engraving tools and small unmarked steel cylinder on dark wooden workbench, soft warm morning light, realistic metal and wood textures, elegant restrained composition, no people, no writing, no coins, no portrait, no modern devices')]
for slug,name,seed,prompt in jobs:
 p=root/'content/coin-history'/slug/'generated'/(name+'.png')
 if p.exists():continue
 env=dict(os.environ,DYLD_LIBRARY_PATH=str(engine/'bin'),LD_LIBRARY_PATH=str(engine/'bin'))
 subprocess.run([str(engine/'bin/sd-cli'),'-m',str(engine/'models/DreamShaper_8_pruned.safetensors'),'-p',prompt,'-n','text, watermark, people, faces, coins, logos, fantasy, blurry','-o',str(p),'--steps','8','-H','640','-W','384','--cfg-scale','7','--seed',str(seed),'--sampling-method','euler_a','--vae-tiling'],env=env,timeout=240,check=True)
 p.with_suffix('.json').write_text(json.dumps({'prompt':prompt,'seed':seed,'model':'DreamShaper_8_pruned.safetensors','modelLicense':'creativeml-openrail-m','engine':'local stable-diffusion.cpp','steps':8,'role':'AI illustration, not archival evidence or an exact reconstruction','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'review':'pending'},indent=2)+'\n')
 print('COMPLETE',slug,flush=True)
