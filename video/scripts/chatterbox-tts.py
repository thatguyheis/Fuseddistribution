#!/usr/bin/env python3
"""
Chatterbox TTS — higher quality than Coqui, voice cloning from short sample.
Usage: python3 chatterbox-tts.py --text=<text> --out_path=<wav> [--speaker_wav=<wav>]
   or: python3 chatterbox-tts.py --manifest=<json> [--speaker_wav=<wav>]
Falls back to default voice if no speaker_wav provided.
"""
import argparse
import json
import os
import re
import warnings
warnings.filterwarnings("ignore")

# The current local Chatterbox environment runs on Python 3.14. Numba's disk
# cache cannot locate a source file for several librosa decorators in that
# runtime, which aborts import before TTS starts. These calculations do not
# need persistence for a batch render, so disable only Numba's cache hooks.
from numba.core.dispatcher import Dispatcher
from numba.np.ufunc.ufuncbuilder import GUFuncBuilder, UFuncDispatcher

Dispatcher.enable_caching = lambda self: None
UFuncDispatcher.enable_caching = lambda self: None
_gufunc_builder_init = GUFuncBuilder.__init__


def _gufunc_builder_without_cache(self, py_func, signature, identity=None, cache=False, targetoptions=None, writable_args=()):
    return _gufunc_builder_init(
        self,
        py_func,
        signature,
        identity=identity,
        cache=False,
        targetoptions=targetoptions,
        writable_args=writable_args,
    )


GUFuncBuilder.__init__ = _gufunc_builder_without_cache

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
import torch
from chatterbox.tts import ChatterboxTTS

# MPS can enter an uninterruptible wait state under memory pressure on the
# production 8 GB Mac. CPU is slower but deterministic; MPS remains an explicit
# opt-in for supervised runs on machines with enough unified memory.
device = os.environ.get("CHATTERBOX_TTS_DEVICE", "cpu").strip().lower()
if device not in {"mps", "cpu"}:
    raise ValueError("CHATTERBOX_TTS_DEVICE must be either 'mps' or 'cpu'")
model = ChatterboxTTS.from_pretrained(device=device)

# Chatterbox 0.1.6 hardcodes 1,000 speech tokens for every generate() call.
# When stochastic sampling misses the EOS token, a short sentence can occupy
# MPS for an hour. Bound that internal call so the outer batch timeout and WAV
# checkpoints can provide predictable recovery. The default still allows
# roughly 24 seconds of speech per text chunk.
max_speech_tokens = int(os.environ.get("CHATTERBOX_TTS_MAX_SPEECH_TOKENS", "600"))
if not 100 <= max_speech_tokens <= 1000:
    raise ValueError("CHATTERBOX_TTS_MAX_SPEECH_TOKENS must be between 100 and 1000")

original_t3_inference = model.t3.inference


def bounded_t3_inference(*inference_args, **inference_kwargs):
    requested = int(inference_kwargs.get("max_new_tokens", max_speech_tokens))
    inference_kwargs["max_new_tokens"] = min(requested, max_speech_tokens)
    return original_t3_inference(*inference_args, **inference_kwargs)


model.t3.inference = bounded_t3_inference

kwargs = {"exaggeration": 0.4, "cfg_weight": 3.0}
if args.speaker_wav:
    kwargs["audio_prompt_path"] = args.speaker_wav

max_chunk_chars = int(os.environ.get("CHATTERBOX_TTS_CHUNK_CHARS", "220"))


def split_for_tts(text):
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    current = ""
    for sentence in sentences:
        words = sentence.split()
        pieces = []
        piece = ""
        for word in words:
            candidate = f"{piece} {word}".strip()
            if piece and len(candidate) > max_chunk_chars:
                pieces.append(piece)
                piece = word
            else:
                piece = candidate
        if piece:
            pieces.append(piece)
        for candidate_piece in pieces:
            candidate = f"{current} {candidate_piece}".strip()
            if current and len(candidate) > max_chunk_chars:
                chunks.append(current)
                current = candidate_piece
            else:
                current = candidate
    if current:
        chunks.append(current)
    return chunks or [text]


for job in jobs:
    parts = []
    for index, chunk in enumerate(split_for_tts(job["text"])):
        if index:
            parts.append(parts[0].new_zeros((1, int(model.sr * 0.10))))
        parts.append(model.generate(chunk, **kwargs))
    wav = torch.cat(parts, dim=-1)
    torchaudio.save(job["out_path"], wav, model.sr)
