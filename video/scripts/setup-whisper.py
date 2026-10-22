"""Download the pinned local model after installing video/whisper-requirements.txt."""
import json
from pathlib import Path
from huggingface_hub import snapshot_download
root = Path(__file__).resolve().parents[2]
config = json.loads((root / 'video/whisper-runtime.json').read_text())
snapshot_download(config['modelRepository'], revision=config['modelRevision'],
                  local_dir=root / config['modelPath'],
                  allow_patterns=['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt'])
print('Pinned Whisper model ready.')
