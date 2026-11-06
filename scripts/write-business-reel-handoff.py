#!/usr/bin/env python3
"""Write a date-bound handoff after the selected queue is editorially ready."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / ".workflow-state/business-growth-ai-365/production"
PACIFIC = ZoneInfo("America/Los_Angeles")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def approval_fingerprint(slug: str) -> str:
    path = ROOT / "public/blog" / slug / "qa.json"
    qa = json.loads(path.read_text())
    if (qa.get("pass") is not True or qa.get("mode") != "codex-editorial"
            or qa.get("score", 0) < 85 or qa.get("blockers")
            or not isinstance(qa.get("artifactSha256"), dict) or not qa["artifactSha256"]):
        raise ValueError(f"{slug}: editorial approval is missing, incomplete, or not passing")
    payload = json.dumps(qa["artifactSha256"], sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    os.replace(tmp, path)


def handoff_path(date: str) -> Path:
    return PRODUCTION / "handoffs" / f"{date}.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue-config", type=Path, default=ROOT / "ops/business-reel-queue.json")
    parser.add_argument("--date", help="Pacific production date; defaults to today")
    parser.add_argument("--blocked", action="store_true", help="Write a fail-closed blocked handoff")
    parser.add_argument("--reason", default="", help="Concise blocker recorded in a blocked handoff")
    args = parser.parse_args()

    production_date = args.date or dt.datetime.now(PACIFIC).date().isoformat()
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", production_date) or dt.date.fromisoformat(production_date).isoformat() != production_date:
            raise ValueError("production date must use YYYY-MM-DD")
    except ValueError as error:
        print(json.dumps({"status": "error", "reason": str(error)}))
        return 2
    manifest = {
        "version": 1,
        "productionDatePacific": production_date,
        "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    try:
        config_path = args.queue_config.resolve()
        config_bytes = config_path.read_bytes()
        config_hash = hashlib.sha256(config_bytes).hexdigest()
        relative_config = config_path.relative_to(ROOT.resolve()).as_posix()
        manifest.update(queueConfig=relative_config, queueConfigSha256=config_hash)

        if args.blocked:
            manifest.update(status="blocked", reason=args.reason.strip() or "Preparation did not complete")
            atomic_json(handoff_path(production_date), manifest)
            print(json.dumps({"status": "blocked", "date": production_date, "reason": manifest["reason"]}))
            return 2

        config = json.loads(config_bytes)
        if not isinstance(config, dict):
            raise ValueError("queue config must be a JSON object")
        slugs = config.get("slugs")
        cap = config.get("maxTopicsPerDay", 3)
        target = config.get("targetRendersPerDay", 2)
        if (config.get("version") != 1 or not isinstance(slugs, list) or not slugs
                or len(slugs) != len(set(slugs)) or len(slugs) > 50
                or any(not isinstance(slug, str) or not SLUG_RE.fullmatch(slug) for slug in slugs)
                or type(cap) is not int or type(target) is not int
                or cap < 1 or target < 1 or target > cap or target > len(slugs)):
            raise ValueError("queue config has invalid slugs or daily limits")

        approvals = {}
        for slug in slugs:
            result = subprocess.run(
                ["node", "video/scripts/approved-sources.mjs", slug],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
            if result.returncode:
                detail = (result.stderr or result.stdout).strip()[-1200:]
                raise ValueError(f"{slug}: approved-sources gate failed: {detail}")
            approvals[slug] = approval_fingerprint(slug)

        if sha256(config_path) != config_hash:
            raise ValueError("queue config changed during handoff validation; rerun preparation")

        manifest.update(
            status="ready",
            slugs=slugs,
            maxTopicsPerDay=cap,
            targetRendersPerDay=target,
            approvalFingerprints=approvals,
        )
        atomic_json(handoff_path(production_date), manifest)
        print(json.dumps({"status": "ready", "date": production_date, "slugs": slugs,
                          "manifest": str(handoff_path(production_date).relative_to(ROOT.resolve()))}))
        return 0
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        manifest.update(status="blocked", reason=f"{type(error).__name__}: {error}")
        atomic_json(handoff_path(production_date), manifest)
        print(json.dumps({"status": "blocked", "date": production_date, "reason": manifest["reason"]}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
