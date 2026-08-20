#!/usr/bin/env python3
"""
Wrapper for Coqui XTTS v2. Accepts ToS non-interactively.
Usage: python3 coqui-tts.py --speaker_wav=<wav> --text=<text> --out_path=<wav>
"""
import sys
import os
import argparse

# Pre-accept ToS before importing TTS (avoids interactive prompt)
os.environ["COQUI_TOS_AGREED"] = "1"

parser = argparse.ArgumentParser()
parser.add_argument("--speaker_wav", required=True)
parser.add_argument("--text", required=True)
parser.add_argument("--out_path", required=True)
args = parser.parse_args()

import warnings
warnings.filterwarnings("ignore")

from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
tts.tts_to_file(
    text=args.text,
    speaker_wav=args.speaker_wav,
    language="en",
    file_path=args.out_path,
)
