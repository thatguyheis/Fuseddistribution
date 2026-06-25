#!/usr/bin/env python3
"""
Chatterbox TTS — higher quality than Coqui, voice cloning from short sample.
Usage: python3 chatterbox-tts.py --text=<text> --out_path=<wav> [--speaker_wav=<wav>]
   or: python3 chatterbox-tts.py --manifest=<json> [--speaker_wav=<wav>]
Falls back to default voice if no speaker_wav provided.
"""
import argparse
import json
import warnings
warnings.filterwarnings("ignore")

parser = argparse.ArgumentParser()
parser.add_argument("--text")
parser.add_argument("--out_path")
parser.add_argument("--manifest")
parser.add_argument("--speaker_wav", default=None)
args = parser.parse_args()
if args.manifest:
    jobs = json.load(open(args.manifest))
elif args.text and args.out_path:
    jobs = [{"text": args.text, "out_path": args.out_path}]
else:
    parser.error("provide --manifest or both --text and --out_path")

import torchaudio
from chatterbox.tts import ChatterboxTTS

device = "mps"
model = ChatterboxTTS.from_pretrained(device=device)

kwargs = {"exaggeration": 0.4, "cfg_weight": 3.0}
if args.speaker_wav:
    kwargs["audio_prompt_path"] = args.speaker_wav

for job in jobs:
    wav = model.generate(job["text"], **kwargs)
    torchaudio.save(job["out_path"], wav, model.sr)
