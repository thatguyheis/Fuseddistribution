"""Validated sampling settings for the pinned Chatterbox runtimes."""
import math


def nano_generation_settings(config):
    values = config.get("nanoGeneration", {})
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
    values = config.get("turboGeneration", {})
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


def standard_generation_settings(config):
    values = config.get("generation", {})
    names = {
        "exaggeration": "exaggeration",
        "cfgWeight": "cfg_weight",
        "temperature": "temperature",
        "minP": "min_p",
        "topP": "top_p",
        "repetitionPenalty": "repetition_penalty",
    }
    defaults = {
        "exaggeration": 0.75,
        "cfg_weight": 0.3,
        "temperature": 0.8,
        "min_p": 0.05,
        "top_p": 1.0,
        "repetition_penalty": 1.2,
    }
    accepted = set(names) | {"chunkCharacters", "maxSpeechTokens", "seedPolicy"}
    unknown = set(values) - accepted
    if unknown:
        raise ValueError(f"Unsupported Standard generation settings: {sorted(unknown)}")
    settings = {**defaults, **{names[key]: values[key] for key in names if key in values}}
    env_names = {
        "exaggeration": "CHATTERBOX_TTS_EXAGGERATION",
        "cfg_weight": "CHATTERBOX_TTS_CFG_WEIGHT",
        "temperature": "CHATTERBOX_TTS_TEMPERATURE",
        "min_p": "CHATTERBOX_TTS_MIN_P",
        "top_p": "CHATTERBOX_TTS_TOP_P",
        "repetition_penalty": "CHATTERBOX_TTS_REPETITION_PENALTY",
    }
    import os
    for name, env_name in env_names.items():
        if os.environ.get(env_name):
            settings[name] = float(os.environ[env_name])
    for name, value in settings.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid Standard {name}")
    if not 0.25 <= settings["exaggeration"] <= 2:
        raise ValueError("Standard exaggeration must be between 0.25 and 2")
    if not 0 <= settings["cfg_weight"] <= 1:
        raise ValueError("Standard cfg_weight must be between 0 and 1")
    if settings["exaggeration"] >= 0.7 and settings["cfg_weight"] > 0.35:
        raise ValueError("Standard cfg_weight must be about 0.3 when exaggeration is 0.7 or higher")
    if not 0.05 <= settings["temperature"] <= 5:
        raise ValueError("Standard temperature must be between 0.05 and 5")
    if not 0 <= settings["min_p"] <= 1 or not 0 < settings["top_p"] <= 1:
        raise ValueError("Standard min_p/top_p are out of range")
    if not 1 <= settings["repetition_penalty"] <= 2:
        raise ValueError("Standard repetition_penalty must be between 1 and 2")
    return settings


def sampling_seed(base_seed, chunk_index):
    if isinstance(base_seed, bool) or not isinstance(base_seed, int) or not 0 <= base_seed < 2**32:
        raise ValueError("TTS seed must be an unsigned 32-bit integer")
    if isinstance(chunk_index, bool) or not isinstance(chunk_index, int) or chunk_index < 0:
        raise ValueError("Chunk index must be a non-negative integer")
    return (base_seed + chunk_index) % 2**32
