#!/usr/bin/env python3
"""Run an explicitly approved, serial business-growth reel queue overnight.

The supervisor lease is a kernel flock and is inherited by the render child.
The renderer's separate shared Remotion lock remains authoritative for all
repository renderers and is never changed by this runner.
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / ".workflow-state/business-growth-ai-365/production"
RENDER_LOCK = Path("/tmp/fused-remotion-render.lock")
PUBLISHER_LOCK = Path("/tmp/fused-blog-publisher.lock")
COIN_DRAFT_LOCK = Path("/tmp/fused-coin-history-drafts.lock")
PACIFIC = ZoneInfo("America/Los_Angeles")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TTS_FAILURE_RE = re.compile(r"(?:tts circuit.*(?:blocked|failure)|chatterbox (?:tts )?.*failed|chatterbox (?:tts )?.*timed out|tts worker failed|narration synthesis failed)", re.I)


def now_pacific() -> dt.datetime:
    return dt.datetime.now(PACIFIC)


def in_window(now: dt.datetime) -> bool:
    return now.hour >= 0 and now.hour < 6


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    os.replace(tmp, path)


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def current_approval(slug: str) -> dict:
    qa = json.loads((ROOT / "public/blog" / slug / "qa.json").read_text())
    if qa.get("pass") is not True or qa.get("mode") != "codex-editorial" or qa.get("score", 0) < 85 or qa.get("blockers"):
        raise ValueError("business-growth editorial approval is not current and passing")
    hashes = qa.get("artifactSha256")
    if not isinstance(hashes, dict) or not hashes:
        raise ValueError("editorial approval has no artifact hashes")
    return hashes


def validate_handoff(queue_config: Path, config: dict, slugs: list[str], cap: int, target: int, date: str) -> str | None:
    """Return a blocker unless Luna handed off this exact approved queue today."""
    manifest_path = PRODUCTION / "handoffs" / f"{date}.json"
    try:
        manifest = json.loads(manifest_path.read_text())
        config_path = queue_config.resolve()
        expected_config = config_path.relative_to(ROOT.resolve()).as_posix()
        if manifest.get("version") != 1 or manifest.get("status") != "ready":
            return manifest.get("reason") or "dated Luna handoff is not marked ready"
        if manifest.get("productionDatePacific") != date:
            return "handoff production date does not match the Pacific run date"
        if manifest.get("queueConfig") != expected_config or manifest.get("queueConfigSha256") != digest(config_path):
            return "handoff queue config path or hash is stale"
        if manifest.get("slugs") != slugs or manifest.get("maxTopicsPerDay") != cap or manifest.get("targetRendersPerDay") != target:
            return "handoff topic order or daily limits do not match the active queue"
        approvals = manifest.get("approvalFingerprints")
        if not isinstance(approvals, dict) or set(approvals) != set(slugs):
            return "handoff does not contain approval evidence for every queued topic"
        for slug in slugs:
            current = hashlib.sha256(json.dumps(current_approval(slug), sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            if approvals.get(slug) != current:
                return f"{slug}: editorial approval changed after the Luna handoff"
        return None
    except FileNotFoundError:
        return f"dated Luna handoff is missing: {manifest_path}"
    except (OSError, ValueError, TypeError) as error:
        return f"dated Luna handoff could not be validated: {type(error).__name__}: {error}"


def persist_handoff_block(date: str, slugs: list[str], reason: str) -> dict:
    run_dir = PRODUCTION / "runs" / date
    run_dir.mkdir(parents=True, exist_ok=True)
    path = run_dir / "queue.json"
    prior = {}
    try:
        prior = json.loads(path.read_text())
    except (OSError, ValueError):
        pass
    prior.update(pacificDate=date, requestedSlugs=slugs, status="blocked_handoff",
                 handoffBlocker=reason, updatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
    atomic_json(path, prior)
    return prior


def output_digests(slug: str) -> dict[str, str] | None:
    out = ROOT / "video/out" / slug
    paths = {
        "mp4": out / f"{slug}.mp4",
        "renderMeta": out / "render-meta.json",
        "renderProps": out / "render-props.json",
        "script": out / "script.json",
        "captions": out / "captions.json",
        "captionsMeta": out / "captions-meta.json",
        "audioTiming": out / "audio-timing.json",
    }
    try:
        if not all(path.is_file() for path in paths.values()):
            return None
        return {name: digest(path) for name, path in paths.items()}
    except OSError:
        return None


def render_is_current(slug: str, approval: dict, checkpoint: dict | None) -> bool:
    out = ROOT / "video/out" / slug
    try:
        meta = json.loads((out / "render-meta.json").read_text())
        video = out / f"{slug}.mp4"
        captions = json.loads((out / "captions-meta.json").read_text())
        qa = json.loads((out / "release-qa.json").read_text())
        current_digests = output_digests(slug)
        checkpoint_valid = (
            checkpoint is not None
            and checkpoint.get("artifactDigests") == current_digests
            and current_digests is not None
        )
        timestamp_valid = False
        if not checkpoint_valid:
            render_time = dt.datetime.fromisoformat(meta["renderedAt"].replace("Z", "+00:00"))
            qa_time = dt.datetime.fromisoformat(qa["generatedAt"].replace("Z", "+00:00"))
            timestamp_valid = qa_time >= render_time
        presentation_valid = True
        plan_hash = approval.get("presentation-plan.json")
        if plan_hash:
            plan_path = ROOT / "public/blog" / slug / "presentation-plan.json"
            plan_bytes = plan_path.read_bytes()
            plan = json.loads(plan_bytes)
            if digest(plan_path) != plan_hash or meta.get("presentationPlanSha256") != plan_hash:
                presentation_valid = False
            elif plan.get("profile") == "business-growth-v1":
                presentation_valid = (
                    meta.get("qualityProfile") == "business-growth-1080p-crf20-slow"
                    and meta.get("presentationProfile") == "business-growth-v1"
                    and meta.get("outputDimensions") == {"width": 1080, "height": 1920}
                    and plan.get("safeZones") == {
                        "width": 1080, "height": 1920,
                        "captionBottomClearancePx": 250, "socialUiRightClearancePx": 150,
                    }
                )
            else:
                presentation_valid = (
                    meta.get("qualityProfile") == "presentation-720p-crf20-slow"
                    and meta.get("presentationProfile") in (None, "")
                    and meta.get("outputDimensions") == {"width": 720, "height": 1280}
                )
        return (
            (checkpoint_valid or timestamp_valid)
            and meta.get("slug") == slug
            and normalized_sources(meta.get("approvedSourceHashes")) == normalized_sources(approval)
            and presentation_valid
            and meta.get("voice") == "chatterbox"
            and video.is_file() and video.stat().st_size > 0
            and captions.get("mode") not in (None, "none")
            and qa.get("pass") is True
        )
    except (OSError, ValueError, TypeError):
        return False


def normalized_sources(value: object) -> dict:
    ignored = {"index.html", "social-video.json"}
    if not isinstance(value, dict):
        return {}
    return {key: digest for key, digest in value.items() if key.rsplit("/", 1)[-1] not in ignored}


def render_lock_busy() -> bool:
    # The legacy renderer may reclaim its own lock after a positively proven
    # dead PID. Missing/malformed PID, permission denial and all other outcomes
    # remain busy. This runner never removes or changes the shared lock.
    for path in (RENDER_LOCK, PUBLISHER_LOCK, COIN_DRAFT_LOCK):
        if not path.exists():
            continue
        probe = subprocess.run(
            [sys.executable, str(ROOT / "scripts/lock-owner-alive.py"), str(path)],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        if probe.returncode != 1:
            return True
    return False


def save_topic(slug: str, date: str, **fields: object) -> None:
    path = PRODUCTION / "topics" / f"{slug}.json"
    old = {}
    if path.exists():
        try:
            old = json.loads(path.read_text())
        except (OSError, ValueError):
            old = {}
    old.update(slug=slug, pacificDate=date, updatedAt=dt.datetime.now(dt.timezone.utc).isoformat(), **fields)
    atomic_json(path, old)


def command(args: list[str], *, log: Path | None = None, pass_fds: tuple[int, ...] = ()) -> subprocess.CompletedProcess:
    if log is None:
        return subprocess.run(args, cwd=ROOT, text=True, capture_output=True, check=False, pass_fds=pass_fds)
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as stream:
        return subprocess.run(args, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, check=False, pass_fds=pass_fds)


def dry_run(slugs: list[str], *, max_topics_per_day: int = 3, target_renders_per_day: int = 2, allow_daytime: bool = False,
            run_command=command, clock=now_pacific) -> dict:
    if not slugs or len(slugs) != len(set(slugs)) or any(not SLUG_RE.fullmatch(s) for s in slugs):
        raise ValueError("Provide unique, explicitly approved slugs using lowercase letters, digits, and single hyphens")
    if max_topics_per_day < 1 or target_renders_per_day < 1 or target_renders_per_day > max_topics_per_day or len(slugs) > 50:
        raise ValueError("max topics per day must be positive; queue may contain at most 50 approved slugs")
    report = []
    for slug in slugs:
        check = run_command(["node", "video/scripts/approved-sources.mjs", slug])
        if check.returncode:
            report.append({"slug": slug, "approval": "blocked", "detail": (check.stderr or check.stdout).strip()[-1200:]})
            continue
        try:
            approval = current_approval(slug)
            checkpoint_path = PRODUCTION / "topics" / f"{slug}.json"
            checkpoint = json.loads(checkpoint_path.read_text()) if checkpoint_path.exists() else None
            current = render_is_current(slug, approval, checkpoint)
            report.append({"slug": slug, "approval": "passed", "render": "current" if current else "pending"})
        except (OSError, ValueError, TypeError) as error:
            report.append({"slug": slug, "approval": "blocked", "detail": str(error)})
    now = clock()
    pending = [item for item in report if item.get("approval") == "passed" and item.get("render") == "pending"]
    return {
        "status": "dry_run_ready",
        "pacificDate": now.date().isoformat(),
        "windowOpen": allow_daytime or in_window(now),
        "maxTopicsPerDay": max_topics_per_day,
        "targetRendersPerDay": target_renders_per_day,
        "renderLockPresent": render_lock_busy(),
        "pendingRenderCount": min(max_topics_per_day, len(pending)),
        "topics": report,
    }


def run_queue(slugs: list[str], *, max_topics_per_day: int = 3, target_renders_per_day: int = 2, allow_daytime: bool = False,
              wait_seconds: int = 30, max_wait_seconds: int = 4 * 3600,
              clock=now_pacific, run_command=command) -> dict:
    if not slugs or len(slugs) != len(set(slugs)) or any(not SLUG_RE.fullmatch(s) for s in slugs):
        raise ValueError("Provide unique, explicitly approved slugs using lowercase letters, digits, and single hyphens")
    if max_topics_per_day < 1 or target_renders_per_day < 1 or target_renders_per_day > max_topics_per_day or len(slugs) > 50:
        raise ValueError("max topics per day must be positive; queue may contain at most 50 approved slugs")
    if wait_seconds < 1 or max_wait_seconds < 0:
        raise ValueError("wait intervals must be nonnegative and poll interval positive")

    PRODUCTION.mkdir(parents=True, exist_ok=True)
    lease_path = PRODUCTION / "runner.lock"
    lease = lease_path.open("a+")
    try:
        fcntl.flock(lease.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lease.close()
        return {"status": "busy", "reason": "another business queue supervisor holds the kernel lease", "processed": []}

    # Keep lease fd open in the renderer. If this supervisor is interrupted,
    # the in-flight render still excludes another scheduled business supervisor.
    os.set_inheritable(lease.fileno(), True)
    original_command = run_command

    def leased_command(args: list[str], **kwargs):
        kwargs.setdefault("pass_fds", (lease.fileno(),))
        return original_command(args, **kwargs)

    start = clock()
    date = start.date().isoformat()
    run_dir = PRODUCTION / "runs" / date
    run_dir.mkdir(parents=True, exist_ok=True)
    run_path = run_dir / "queue.json"
    run_state = {"pacificDate": date, "requestedSlugs": slugs, "status": "starting", "results": [], "startedAt": start.isoformat()}

    def persist(status: str, **more: object) -> None:
        run_state.update(status=status, updatedAt=dt.datetime.now(dt.timezone.utc).isoformat(), **more)
        atomic_json(run_path, run_state)

    # Preserve prior daily attempts, so repeated scheduler invocations cannot
    # exceed the configured cap or retry a failed topic on the same Pacific day.
    prior = json.loads(run_path.read_text()) if run_path.exists() else {}
    attempted = set(prior.get("attemptedSlugs", []))
    successful: set[str] = set()
    run_state["attemptedSlugs"] = sorted(attempted)
    run_state["results"] = prior.get("results", [])
    persist("waiting_for_render_owner")
    deadline = time.monotonic() + max_wait_seconds
    try:
        for slug in slugs:
            if len(successful) >= target_renders_per_day:
                persist("completed_target", attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful))
                return {**run_state, "status": "completed_target"}
            # Approvals are rechecked immediately before every topic's work.
            try:
                result = run_command(["node", "video/scripts/approved-sources.mjs", slug])
            except Exception as error:
                result = subprocess.CompletedProcess([], 127, "", f"{type(error).__name__}: {error}")
            if result.returncode:
                item = {"slug": slug, "status": "approval_blocked", "detail": (result.stderr or result.stdout).strip()[-1200:]}
                run_state["results"].append(item)
                save_topic(slug, date, status=item["status"], detail=item["detail"])
                persist("topic_failed_continue", attemptedSlugs=sorted(attempted))
                continue
            try:
                approval = current_approval(slug)
            except (OSError, ValueError, TypeError) as error:
                item = {"slug": slug, "status": "approval_blocked", "detail": str(error)}
                run_state["results"].append(item)
                save_topic(slug, date, status=item["status"], detail=item["detail"])
                persist("topic_failed_continue", attemptedSlugs=sorted(attempted))
                continue
            topic_path = PRODUCTION / "topics" / f"{slug}.json"
            try:
                checkpoint = json.loads(topic_path.read_text()) if topic_path.exists() else None
            except (OSError, ValueError):
                checkpoint = None
            if render_is_current(slug, approval, checkpoint):
                item = {"slug": slug, "status": "already_current", "renderMeta": f"video/out/{slug}/render-meta.json"}
                run_state["results"].append(item)
                successful.add(slug)
                persist("topic_current", attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful))
                continue
            if slug in attempted:
                run_state["results"].append({"slug": slug, "status": "already_attempted_today"})
                persist("topic_skipped_attempted", attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful))
                continue
            while True:
                now = clock()
                if not allow_daytime and not in_window(now):
                    persist("deferred_window", currentSlug=slug, attemptedSlugs=sorted(attempted), reason="outside 00:00–06:00 Pacific render window")
                    return {**run_state, "status": "deferred_window"}
                if render_lock_busy():
                    if time.monotonic() >= deadline or (not allow_daytime and now.hour >= 5 and now.minute >= 59):
                        persist("deferred_render_busy", currentSlug=slug, attemptedSlugs=sorted(attempted), reason="shared Remotion lock remains present; ownership was not modified")
                        return {**run_state, "status": "deferred_render_busy"}
                    persist("waiting_for_render_owner", currentSlug=slug, attemptedSlugs=sorted(attempted))
                    time.sleep(wait_seconds)
                    continue
                break
            # Recheck time/cap/approvals at the actual heavy-work boundary.
            now = clock()
            if not allow_daytime and not in_window(now):
                persist("deferred_window", currentSlug=slug, attemptedSlugs=sorted(attempted), reason="overnight window closed before render")
                return {**run_state, "status": "deferred_window"}
            if len(attempted) >= max_topics_per_day:
                persist("deferred_cap", attemptedSlugs=sorted(attempted), reason="Pacific-day topic cap reached")
                return {**run_state, "status": "deferred_cap"}
            try:
                result = run_command(["node", "video/scripts/approved-sources.mjs", slug])
            except Exception as error:
                result = subprocess.CompletedProcess([], 127, "", f"{type(error).__name__}: {error}")
            if result.returncode:
                item = {"slug": slug, "status": "approval_changed", "detail": (result.stderr or result.stdout).strip()[-1200:]}
                run_state["results"].append(item)
                save_topic(slug, date, status=item["status"], detail=item["detail"])
                persist("topic_failed_continue", attemptedSlugs=sorted(attempted))
                continue
            try:
                circuit = run_command([sys.executable, "scripts/tts-circuit.py", "check", "--voice=chatterbox"])
            except Exception as error:
                persist("deferred_tts_circuit", currentSlug=slug, attemptedSlugs=sorted(attempted), reason=f"Circuit check failed safely: {error}")
                return {**run_state, "status": "deferred_tts_circuit"}
            if circuit.returncode:
                item = {"slug": slug, "status": "tts_circuit_blocked", "detail": (circuit.stderr or circuit.stdout).strip()[-1200:]}
                run_state["results"].append(item)
                persist("deferred_tts_circuit", currentSlug=slug, attemptedSlugs=sorted(attempted), reason=item["detail"] or "Chatterbox circuit is blocked")
                return {**run_state, "status": "deferred_tts_circuit"}
            log_path = PRODUCTION / "runs" / date / f"{slug}.log"
            attempted.add(slug)
            persist("render_started", currentSlug=slug, attemptedSlugs=sorted(attempted))
            save_topic(slug, date, status="rendering", log=str(log_path.relative_to(ROOT)))
            render_args = ["node", "video/scripts/render.mjs", f"--post={slug}", "--voice=chatterbox", "--music=cycle"]
            presentation_plan = ROOT / "public/blog" / slug / "presentation-plan.json"
            if presentation_plan.is_file() and approval.get("presentation-plan.json") == digest(presentation_plan):
                render_args.append("--quality=presentation")
            try:
                result = leased_command(render_args, log=log_path)
            except Exception as error:
                log_path.parent.mkdir(parents=True, exist_ok=True)
                with log_path.open("a", encoding="utf-8") as stream:
                    stream.write(f"\nRunner caught render exception: {type(error).__name__}: {error}\n")
                result = subprocess.CompletedProcess(render_args, 127, "", str(error))
            render_code = result.returncode
            tts_success_code = None
            if render_code == 0:
                try:
                    circuit_success = leased_command(
                        [sys.executable, "scripts/tts-circuit.py", "success", "--voice=chatterbox"],
                        log=log_path,
                    )
                    tts_success_code = circuit_success.returncode
                except Exception as error:
                    with log_path.open("a", encoding="utf-8") as stream:
                        stream.write(f"\nRunner could not record successful Chatterbox run: {type(error).__name__}: {error}\n")
                    tts_success_code = 127
            release_code = 1
            if render_code == 0:
                try:
                    qa = leased_command(["node", "video/scripts/release-reel.mjs", f"--post={slug}"], log=log_path)
                    release_code = qa.returncode
                except Exception as error:
                    with log_path.open("a", encoding="utf-8") as stream:
                        stream.write(f"\nRunner caught release QA exception: {type(error).__name__}: {error}\n")
                    release_code = 127
            approval_after = None
            try:
                approval_after = current_approval(slug)
            except (OSError, ValueError, TypeError):
                pass
            current = approval_after is not None and render_is_current(slug, approval_after, {
                "status": "rendered-awaiting-review",
                "artifactDigests": output_digests(slug),
            })
            status = "rendered-awaiting-review" if render_code == 0 and release_code == 0 and current else "render_failed" if render_code else "release_qa_failed"
            item = {"slug": slug, "status": status, "renderReturnCode": render_code, "releaseReturnCode": release_code,
                    "currentArtifactsValid": current, "log": str(log_path.relative_to(ROOT))}
            if tts_success_code is not None:
                item["ttsCircuitSuccessReturnCode"] = tts_success_code
            run_state["results"].append(item)
            save_topic(slug, date, status=status, renderReturnCode=render_code, releaseReturnCode=release_code,
                       currentArtifactsValid=current, artifactDigests=output_digests(slug),
                       approvalSha256=hashlib.sha256(json.dumps(approval_after or approval, sort_keys=True).encode()).hexdigest(),
                       log=str(log_path.relative_to(ROOT)))
            persist("topic_finished", attemptedSlugs=sorted(attempted))
            if status == "rendered-awaiting-review":
                successful.add(slug)
                persist("topic_finished", attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful))
            if len(successful) >= target_renders_per_day:
                persist("completed_target", attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful))
                return {**run_state, "status": "completed_target"}
            if render_code and TTS_FAILURE_RE.search(log_path.read_text(errors="replace")):
                try:
                    run_command([sys.executable, "scripts/tts-circuit.py", "failure", "--voice=chatterbox"])
                    circuit_check = run_command([sys.executable, "scripts/tts-circuit.py", "check", "--voice=chatterbox"])
                except Exception as error:
                    persist("deferred_tts_circuit", attemptedSlugs=sorted(attempted), reason=f"Circuit update failed safely: {error}")
                    return {**run_state, "status": "deferred_tts_circuit"}
                if circuit_check.returncode:
                    persist("deferred_tts_circuit", attemptedSlugs=sorted(attempted), reason="repeated Chatterbox runtime failure; stop heavy work")
                    return {**run_state, "status": "deferred_tts_circuit"}
        final = "completed" if len(successful) >= target_renders_per_day else "completed_with_failures"
        persist(final, attemptedSlugs=sorted(attempted), successfulSlugs=sorted(successful), finishedAt=dt.datetime.now(dt.timezone.utc).isoformat())
        return run_state
    except BaseException as error:
        persist("exception", attemptedSlugs=sorted(attempted), error=f"{type(error).__name__}: {error}")
        raise
    finally:
        # Closing our fd releases only when every inherited in-flight child fd closes.
        lease.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue-config", type=Path, default=ROOT / "ops/business-reel-queue.json",
                        help="JSON config with version, slugs, and optional maxTopicsPerDay")
    parser.add_argument("--slugs", nargs="+", help="Explicit approved business-growth slug list; overrides config")
    parser.add_argument("--max-topics-per-day", type=int, help="Override configured daily render cap")
    parser.add_argument("--wait-seconds", type=int, default=30)
    parser.add_argument("--max-wait-seconds", type=int, default=4 * 3600)
    parser.add_argument("--allow-daytime", action="store_true", help="Nick-authorized manual recovery only")
    parser.add_argument("--dry-run", action="store_true", help="Check today's Luna handoff, approvals, window, and current outputs without rendering")
    args = parser.parse_args()
    try:
        config = json.loads(args.queue_config.read_text())
        if config.get("version") != 1 or not isinstance(config.get("slugs"), list):
            raise ValueError("queue config must contain version: 1 and a slugs array")
        slugs = args.slugs or config["slugs"]
        cap = args.max_topics_per_day or config.get("maxTopicsPerDay", 3)
        target = config.get("targetRendersPerDay", 2)
        date = now_pacific().date().isoformat()
        handoff_blocker = validate_handoff(args.queue_config, config, slugs, cap, target, date)
        if handoff_blocker:
            result = persist_handoff_block(date, slugs, handoff_blocker)
            print(json.dumps({"status": result["status"], "pacificDate": date,
                              "requestedSlugs": slugs, "handoffBlocker": handoff_blocker}, sort_keys=True))
            return 2
        if args.dry_run:
            result = dry_run(slugs, max_topics_per_day=cap, target_renders_per_day=target, allow_daytime=args.allow_daytime)
        else:
            result = run_queue(slugs, max_topics_per_day=cap,
                           target_renders_per_day=target,
                           allow_daytime=args.allow_daytime, wait_seconds=args.wait_seconds,
                           max_wait_seconds=args.max_wait_seconds)
    except Exception as error:
        print(json.dumps({"status": "error", "error": f"{type(error).__name__}: {error}"}))
        return 1
    print(json.dumps(result, sort_keys=True))
    if result.get("status") == "completed_with_failures":
        return 1
    return 0 if result.get("status") in ("completed", "completed_target", "dry_run_ready") else 2


if __name__ == "__main__":
    raise SystemExit(main())
