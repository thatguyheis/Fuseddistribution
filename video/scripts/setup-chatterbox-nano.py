#!/usr/bin/env python3
"""Restore the pinned free voice runtime without changing the existing Python venv."""
import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
FILES = ['t3_nano_v1.safetensors', 's3gen_meanflow.safetensors', 've.safetensors',
         'tokenizer_config.json', 'vocab.json', 'merges.txt', 'added_tokens.json',
         'special_tokens_map.json', 'conds.pt']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    config = json.loads((ROOT / 'video/tts-runtime.json').read_text())
    revision = config['sourceRevision']
    if config['variant'] != 'nano' or not re.fullmatch('[a-f0-9]{40}', revision):
        raise ValueError('Expected a pinned Nano runtime configuration')
    source = ROOT / config['sourcePath']
    model = Path(config['modelPath']).expanduser()
    python = Path.home() / '.venvs/chatterbox/bin/python3'
    if not args.check and not (source / 'chatterbox/tts_turbo.py').exists():
        checkout = ROOT / '.workflow-state/runtime-sources' / revision
        if not checkout.exists():
            checkout.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['git', 'clone', '--no-checkout', 'https://github.com/resemble-ai/chatterbox.git', str(checkout)], check=True)
        subprocess.run(['git', '-C', str(checkout), 'checkout', '--detach', revision], check=True)
        shutil.copytree(checkout / 'src', source, dirs_exist_ok=True)
        shutil.copy2(checkout / 'LICENSE', source.parent / 'LICENSE')
        (source.parent / 'provenance.json').write_text(json.dumps({'repository': 'https://github.com/resemble-ai/chatterbox', 'revision': revision}, indent=2))
    missing = [name for name in FILES if not (model / name).is_file()]
    if not args.check and missing:
        code = 'from huggingface_hub import snapshot_download; snapshot_download("ResembleAI/chatterbox-nano", revision=' + repr(config['modelRevision']) + ', allow_patterns=' + repr(FILES) + ', max_workers=2)'
        subprocess.run([str(python), '-c', code], check=True)
        missing = [name for name in FILES if not (model / name).is_file()]
    if not python.exists() or not (source / 'chatterbox/tts_turbo.py').exists() or missing:
        raise RuntimeError(f'Runtime incomplete; missing model files: {missing}. Run this script without --check to restore pinned assets.')
    provenance = json.loads((source.parent / 'provenance.json').read_text())
    if provenance['revision'] != revision:
        raise RuntimeError('Runtime source revision does not match the configured pin')
    print('Pinned Nano runtime is available locally; no download is needed for narration.')


if __name__ == '__main__':
    main()
