"""Validated sampling settings for the pinned Nano and Turbo runtimes."""
import math


def nano_generation_settings(config):
    values = config.get("generation", {})
    defaults = {"temperature": 0.8, "top_p": 0.95, "top_k": 1000, "repetition_penalty": 1.2}
    unknown = set(values) - set(defaults)
    if unknown:
        raise ValueError(f"Unsupported Nano generation settings: {sorted(unknown)}")
    settings = {**defaults, **values}
    for name, value in settings.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid Nano {name}")
    if not 0 < settings["temperature"] <= 2 or not 0 < settings["top_p"] <= 1:
        raise ValueError("Nano temperature/top_p are out of range")
    if not isinstance(settings["top_k"], int) or settings["top_k"] < 1 or settings["repetition_penalty"] < 1:
        raise ValueError("Nano top_k/repetition_penalty are out of range")
    # Nano ignores CFG, exaggeration and min_p. Keep them disabled explicitly.
    return {**settings, "exaggeration": 0.0, "cfg_weight": 0.0, "min_p": 0.0}


def turbo_generation_settings(config):
    values = config.get("generation", {})
    defaults = {"temperature": 0.8, "top_p": 0.95, "top_k": 1000, "repetition_penalty": 1.2}
    unknown = set(values) - set(defaults) - {"maxSpeechTokens", "chunkCharacters"}
    if unknown:
        raise ValueError(f"Unsupported Turbo generation settings: {sorted(unknown)}")
    settings = {**defaults, **{key: value for key, value in values.items() if key in defaults}}
    for name, value in settings.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid Turbo {name}")
    if not 0 < settings["temperature"] <= 2 or not 0 < settings["top_p"] <= 1:
        raise ValueError("Turbo temperature/top_p are out of range")
    if not isinstance(settings["top_k"], int) or settings["top_k"] < 1 or settings["repetition_penalty"] < 1:
        raise ValueError("Turbo top_k/repetition_penalty are out of range")
    return {**settings, "exaggeration": 0.0, "cfg_weight": 0.0, "min_p": 0.0}


def sampling_seed(config, chunk_index):
    seed = config.get("seed", 1337)
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed < 2**32:
        raise ValueError("TTS seed must be an unsigned 32-bit integer")
    if isinstance(chunk_index, bool) or not isinstance(chunk_index, int) or chunk_index < 0:
        raise ValueError("Chunk index must be a non-negative integer")
    return seed + chunk_index
