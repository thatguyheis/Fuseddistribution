#!/usr/bin/env python3
"""Generate unapproved music candidates with a local ACE-Step install."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from acestep.pipeline_ace_step import ACEStepPipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate an ACE-Step music candidate into video/music-candidates/."
    )
    parser.add_argument("--checkpoint-path", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--name", default="ace-step-candidate")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--lyrics", default="[inst]")
    parser.add_argument("--duration", type=float, default=90.0)
    parser.add_argument("--steps", type=int, default=27)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--guidance-scale", type=float, default=15.0)
    parser.add_argument("--scheduler-type", default="euler")
    parser.add_argument("--cfg-type", default="apg")
    parser.add_argument("--omega-scale", type=float, default=10.0)
    parser.add_argument("--bf16", action="store_true")
    parser.add_argument("--cpu-offload", action="store_true")
    parser.add_argument("--overlapped-decode", action="store_true")
    parser.add_argument("--force-cpu", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.force_cpu:
        import torch

        torch.backends.mps.is_available = lambda: False

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"{args.name}.wav"
    checkpoint_path = Path(args.checkpoint_path)
    checkpoint_path.mkdir(parents=True, exist_ok=True)

    pipeline = ACEStepPipeline(
        checkpoint_dir=str(checkpoint_path),
        dtype="bfloat16" if args.bf16 else "float32",
        cpu_offload=args.cpu_offload,
        overlapped_decode=args.overlapped_decode,
    )

    output = pipeline(
        format="wav",
        audio_duration=args.duration,
        prompt=args.prompt,
        lyrics=args.lyrics,
        infer_step=args.steps,
        guidance_scale=args.guidance_scale,
        scheduler_type=args.scheduler_type,
        cfg_type=args.cfg_type,
        omega_scale=args.omega_scale,
        manual_seeds=str(args.seed) if args.seed is not None else None,
        save_path=str(output_path),
    )

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "tool": "ACE-Step",
        "toolRepository": "https://github.com/ace-step/ACE-Step",
        "candidateStatus": "unapproved_candidate",
        "copyrightProtocol": (
            "Candidate must be listened to and promoted with "
            "video/scripts/register-music-track.mjs before production use."
        ),
        "checkpointPath": str(checkpoint_path),
        "prompt": args.prompt,
        "lyrics": args.lyrics,
        "duration": args.duration,
        "steps": args.steps,
        "seed": args.seed,
        "output": output,
    }
    manifest_path = output_dir / f"{args.name}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"outputDir": str(output_dir), "manifest": str(manifest_path), "output": output}, indent=2))
    return 0


if __name__ == "__main__":
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    raise SystemExit(main())
