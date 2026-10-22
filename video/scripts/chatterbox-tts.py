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
import hashlib
import time
import sys
from pathlib import Path
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
threads = int(os.environ.get("CHATTERBOX_TTS_THREADS", "2"))
if not 1 <= threads <= 4:
    raise ValueError("CHATTERBOX_TTS_THREADS must be between 1 and 4")
torch.set_num_threads(threads)
torch.set_num_interop_threads(1)
config_path = Path(__file__).resolve().parent.parent / "tts-runtime.json"
config = json.loads(config_path.read_text()) if config_path.exists() else {}
variant = os.environ.get("CHATTERBOX_TTS_VARIANT", config.get("variant", "standard"))
if variant not in {"standard", "nano"}:
    raise ValueError("Unsupported Chatterbox variant")
source = os.environ.get("CHATTERBOX_SOURCE_PATH", config.get("sourcePath", ""))
if source:
    source_path = Path(__file__).resolve().parents[2] / source
    if not (source_path / "chatterbox/tts_turbo.py").is_file():
        raise RuntimeError("Configured local Chatterbox source is missing")
    sys.path.insert(0, str(source_path))
from chatterbox.tts import ChatterboxTTS
from chatterbox.tts_turbo import ChatterboxTurboTTS

# MPS can enter an uninterruptible wait state under memory pressure on the
# production 8 GB Mac. CPU is slower but deterministic; MPS remains an explicit
# opt-in for supervised runs on machines with enough unified memory.
device = os.environ.get("CHATTERBOX_TTS_DEVICE", "cpu").strip().lower()
if device not in {"mps", "cpu"}:
    raise ValueError("CHATTERBOX_TTS_DEVICE must be either 'mps' or 'cpu'")
print(f"Loading Chatterbox {variant} on {device}, threads={threads}", flush=True)
model_path = os.environ.get("CHATTERBOX_MODEL_PATH", config.get("modelPath", ""))
standard_model_path = os.environ.get("CHATTERBOX_STANDARD_MODEL_PATH", "") or model_path
if variant == "nano":
    model = (ChatterboxTurboTTS.from_local(Path(model_path).expanduser(), device=device, nano=True)
             if model_path else ChatterboxTurboTTS.from_pretrained(device=device, nano=True))
else:
    model = (ChatterboxTTS.from_local(Path(standard_model_path).expanduser(), device=device)
             if standard_model_path else ChatterboxTTS.from_pretrained(device=device))

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
    tokens = original_t3_inference(*inference_args, **inference_kwargs)
    if not torch.any(tokens[0] == model.t3.hp.stop_speech_token):
        raise RuntimeError("TTS token limit reached before end of speech; refusing truncated audio")
    return tokens


if variant == "standard":
    model.t3.inference = bounded_t3_inference
else:
    original_turbo_inference = model.t3.inference_turbo

    def bounded_turbo_inference(*inference_args, **inference_kwargs):
        inference_kwargs["max_gen_len"] = max_speech_tokens
        tokens = original_turbo_inference(*inference_args, **inference_kwargs)
        # Turbo strips EOS before returning. A full cap means EOS was not
        # observed with enough headroom; never publish a possibly clipped chunk.
        if tokens.shape[-1] >= max_speech_tokens:
            raise RuntimeError("TTS token limit reached; refusing possibly truncated audio")
        return tokens

    model.t3.inference_turbo = bounded_turbo_inference

from tts_settings import nano_generation_settings, sampling_seed

generation = config.get("generation", {})
kwargs = (nano_generation_settings(config) if variant == "nano" else {
    "exaggeration": float(os.environ.get("CHATTERBOX_TTS_EXAGGERATION", generation.get("exaggeration", 0.4))),
    "cfg_weight": float(os.environ.get("CHATTERBOX_TTS_CFG_WEIGHT", generation.get("cfgWeight", 0.5))),
})
if args.speaker_wav:
    # NumPy 2 loudness scaling in this runtime promotes the reference to
    # float64, which the float32 speech tokenizer rejects. The curated voice
    # reference already has a fixed level; preserve its original samples.
    prepare_options = {"norm_loudness": False} if variant == "nano" else {}
    model.prepare_conditionals(args.speaker_wav, exaggeration=kwargs["exaggeration"], **prepare_options)

max_chunk_chars = int(os.environ.get("CHATTERBOX_TTS_CHUNK_CHARS", generation.get("chunkCharacters", 280)))


from tts_chunks import split_for_tts


# Each completed chunk is durable. Its key includes exact text, voice bytes and
# synthesis settings, so an interrupted segment can resume without stale audio.
voice_hash = hashlib.sha256(Path(args.speaker_wav).read_bytes()).hexdigest() if args.speaker_wav else "default"
for job in jobs:
    parts = []
    checkpoint_dir = Path(job["out_path"] + ".chunks")
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    for index, chunk in enumerate(split_for_tts(job["text"], max_chunk_chars)):
        key = hashlib.sha256(json.dumps(["v3", variant, config.get("sourceRevision", "installed"), config.get("modelRevision"), chunk, voice_hash, kwargs, max_speech_tokens, sampling_seed(config, index)], sort_keys=True).encode()).hexdigest()
        checkpoint = checkpoint_dir / (key + ".wav")
        if checkpoint.exists():
            part, sample_rate = torchaudio.load(str(checkpoint))
            if sample_rate != model.sr or not torch.isfinite(part).all() or part.numel() < model.sr // 10:
                raise RuntimeError(f"Invalid audio checkpoint: {checkpoint}")
            print(f"Recovered chunk {index + 1}", flush=True)
        else:
            started = time.monotonic()
            torch.manual_seed(sampling_seed(config, index))
            part = model.generate(chunk, **kwargs)
            if not torch.isfinite(part).all() or part.numel() < model.sr // 10:
                raise RuntimeError("Invalid generated audio")
            temporary = checkpoint.with_suffix(".partial.wav")
            torchaudio.save(str(temporary), part, model.sr)
            temporary.replace(checkpoint)
            print(f"Completed chunk {index + 1}: {time.monotonic() - started:.1f}s", flush=True)
        if index:
            parts.append(part.new_zeros((1, int(model.sr * 0.10))))
        parts.append(part)
    wav = torch.cat(parts, dim=-1)
    destination = Path(job["out_path"])
    temporary = destination.with_suffix(".partial.wav")
    torchaudio.save(str(temporary), wav, model.sr)
    temporary.replace(destination)
