"""Bounded local illustrative scenes. These are atmosphere, not historical evidence."""
from pathlib import Path
import hashlib, json, os, subprocess

work = Path(__file__).resolve().parent
out_dir = work / 'generated'
out_dir.mkdir(exist_ok=True)
engine = Path.home() / 'Library/Application Support/open-generative-ai/local-ai'
model = engine / 'models' / 'DreamShaper_8_pruned.safetensors'
cli = engine / 'bin' / 'sd-cli'
scenes = [
    ('treasury-vault-illustration', 391204, 'Museum-quality documentary concept art of a generic historic government coin storage vault, imposing circular steel vault door open to a quiet stone and steel archive room, carefully arranged metal storage shelves and shallow coin trays, soft amber practical lamps, restrained archival color with cool shadows, vertical composition, highly detailed realistic materials, no people, no cloth sacks or bags, no readable text, no labels, no logos, no identifiable real vault, no claim this depicts a documented discovery'),
]
negative = 'cloth bag, burlap sack, text, letters, numbers, watermark, logo, modern electronics, modern clothing, fantasy, deformed hands, malformed architecture, blurry, sharp coin date, invented mint mark'
for name, seed, prompt in scenes:
    image = out_dir / f'{name}.png'
    record = {
        'name': name, 'prompt': prompt, 'negativePrompt': negative,
        'seed': seed, 'model': model.name, 'modelLicense': 'creativeml-openrail-m',
        'generator': 'open-generative-ai local sd-cli', 'width': 384, 'height': 640,
        'steps': 20, 'timeoutSeconds': 14400, 'role': 'Illustrative atmosphere only; not archival evidence or a depiction of an identified historical event.'
    }
    if not image.exists():
        env = dict(os.environ, DYLD_LIBRARY_PATH=str(engine / 'bin'), LD_LIBRARY_PATH=str(engine / 'bin'))
        subprocess.run([str(cli), '-m', str(model), '-p', prompt, '-n', negative,
            '-o', str(image), '--steps', '20', '-H', '640', '-W', '384',
            '--cfg-scale', '7', '--seed', str(seed), '--sampling-method', 'euler_a', '--vae-tiling'],
            env=env, timeout=14400, check=True)
    record['sha256'] = hashlib.sha256(image.read_bytes()).hexdigest()
    (out_dir / f'{name}.json').write_text(json.dumps(record, indent=2) + '\n')
    print(f'COMPLETE {name} {record["sha256"]}', flush=True)
