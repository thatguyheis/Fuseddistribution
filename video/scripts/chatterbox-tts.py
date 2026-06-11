#!/usr/bin/env python3
"""
Chatterbox TTS — higher quality than Coqui, voice cloning from short sample.
Usage: python3 chatterbox-tts.py --text=<text> --out_path=<wav> [--speaker_wav=<wav>]
Falls back to default voice if no speaker_wav provided.
"""
import argparse
import warnings
warnings.filterwarnings("ignore")

parser = argparse.ArgumentParser()
parser.add_argument("--text", required=True)
parser.add_argument("--out_path", required=True)
parser.add_argument("--speaker_wav", default=None)
args = parser.parse_args()

import torchaudio
from chatterbox.tts import ChatterboxTTS

device = "mps"
model = ChatterboxTTS.from_pretrained(device=device)

kwargs = {"exaggeration": 0.4, "cfg_weight": 3.0}
if args.speaker_wav:
    kwargs["audio_prompt_path"] = args.speaker_wav

wav = model.generate(args.text, **kwargs)
torchaudio.save(args.out_path, wav, model.sr)
