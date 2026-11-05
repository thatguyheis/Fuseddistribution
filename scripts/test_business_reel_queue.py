import datetime as dt
import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo


SCRIPT = Path(__file__).with_name("run-business-reel-queue.py")
SPEC = importlib.util.spec_from_file_location("business_reel_queue", SCRIPT)
queue = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(queue)


class BusinessReelQueueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.production = self.root / ".workflow-state/business-growth-ai-365/production"
        self.render_lock = self.root / "fused-remotion-render.lock"
        self.now = dt.datetime(2026, 11, 5, 2, 0, tzinfo=ZoneInfo("America/Los_Angeles"))
        self.root_patch = patch.multiple(queue, ROOT=self.root, PRODUCTION=self.production, RENDER_LOCK=self.render_lock,
                                        PUBLISHER_LOCK=self.root / 'publisher.lock', COIN_DRAFT_LOCK=self.root / 'coin-drafts.lock')
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.addCleanup(self.temp.cleanup)

    def write_approval(self, slug):
        blog = self.root / "public/blog" / slug
        blog.mkdir(parents=True, exist_ok=True)
        (blog / "qa.json").write_text(json.dumps({
            "pass": True, "mode": "codex-editorial", "score": 90,
            "blockers": [], "artifactSha256": {"verified.md": "a" * 64},
        }))
        return blog

    def fake_commands(self, fail_slug=None, raise_slug=None, calls=None):
        calls = calls if calls is not None else []

        def run(args, *, log=None, pass_fds=()):
            calls.append((args, tuple(pass_fds)))
            if log:
                log.parent.mkdir(parents=True, exist_ok=True)
                with log.open("a") as stream:
                    stream.write("ordinary render output\n")
            if any("approved-sources.mjs" in arg or "tts-circuit.py" in arg for arg in args):
                return queue.subprocess.CompletedProcess(args, 0, "", "")
            if any("render.mjs" in arg for arg in args):
                slug = next(arg.split("=", 1)[1] for arg in args if arg.startswith("--post="))
                if slug == raise_slug:
                    raise OSError("mock child process could not be started")
                if slug == fail_slug:
                    if log:
                        with log.open("a") as stream:
                            stream.write("generic Remotion error\n")
                    return queue.subprocess.CompletedProcess(args, 1, "", "")
                out = self.root / "video/out" / slug
                out.mkdir(parents=True, exist_ok=True)
                (out / f"{slug}.mp4").write_bytes(b"mp4")
                (out / "captions-meta.json").write_text(json.dumps({"mode": "word-timed"}))
                for filename, contents in {
                    "render-props.json": "{}", "script.json": "{}", "captions.json": "{}", "audio-timing.json": "{}",
                }.items():
                    (out / filename).write_text(contents)
                approved_hashes = json.loads((self.root / "public/blog" / slug / "qa.json").read_text())["artifactSha256"]
                plan_path = self.root / "public/blog" / slug / "presentation-plan.json"
                plan = json.loads(plan_path.read_text()) if plan_path.exists() else {}
                business_profile = plan.get("profile") == "business-growth-v1"
                (out / "render-meta.json").write_text(json.dumps({
                    "slug": slug, "voice": "chatterbox", "approvedSourceHashes": approved_hashes,
                    "renderedAt": "2026-11-05T09:00:00Z",
                    "qualityProfile": "business-growth-1080p-crf20-slow" if business_profile else "presentation-720p-crf20-slow" if "presentation-plan.json" in approved_hashes else "standard",
                    "presentationProfile": "business-growth-v1" if business_profile else None,
                    "outputDimensions": {"width": 1080, "height": 1920} if business_profile else {"width": 720, "height": 1280},
                    "presentationPlanSha256": approved_hashes.get("presentation-plan.json"),
                }))
                return queue.subprocess.CompletedProcess(args, 0, "", "")
            if any("release-reel.mjs" in arg for arg in args):
                slug = next(arg.split("=", 1)[1] for arg in args if arg.startswith("--post="))
                out = self.root / "video/out" / slug
                (out / "release-qa.json").write_text(json.dumps({"pass": True, "readyForPosting": False, "generatedAt": "2026-11-05T09:01:00Z"}))
                return queue.subprocess.CompletedProcess(args, 0, "", "")
            self.fail(f"Unexpected command: {args}")

        return run, calls

    def test_topic_failure_is_checkpointed_and_next_approved_topic_runs(self):
        slugs = ["first-approved-topic", "second-approved-topic", "third-approved-topic"]
        for slug in slugs:
            self.write_approval(slug)
        fake, calls = self.fake_commands(fail_slug=slugs[0])
        result = queue.run_queue(slugs, target_renders_per_day=2, clock=lambda: self.now, run_command=fake, max_wait_seconds=0)

        self.assertEqual(result["status"], "completed_target")
        self.assertEqual([item["status"] for item in result["results"]], ["render_failed", "rendered-awaiting-review", "rendered-awaiting-review"])
        self.assertEqual([next(arg.split("=", 1)[1] for arg in args if arg.startswith("--post="))
                          for args, _ in calls if any("render.mjs" in arg for arg in args)], slugs)
        self.assertTrue(all(queue.PRODUCTION.joinpath("runs", "2026-11-05", f"{slug}.log").exists() for slug in slugs))
        self.assertEqual(json.loads((queue.PRODUCTION / "topics" / f"{slugs[0]}.json").read_text())["status"], "render_failed")
        render_call = next((args, fds) for args, fds in calls if any("render.mjs" in arg for arg in args))
        self.assertTrue(render_call[1], "render child must inherit the supervisor kernel lease")

    def test_render_exception_is_checkpointed_and_later_topic_runs(self):
        slugs = ["exception-topic", "healthy-topic"]
        for slug in slugs:
            self.write_approval(slug)
        fake, _ = self.fake_commands(raise_slug=slugs[0])
        result = queue.run_queue(slugs, max_topics_per_day=2, target_renders_per_day=1,
                                 clock=lambda: self.now, run_command=fake)
        self.assertEqual(result["status"], "completed_target")
        self.assertEqual([item["status"] for item in result["results"]], ["render_failed", "rendered-awaiting-review"])
        state = json.loads((queue.PRODUCTION / "topics" / f"{slugs[0]}.json").read_text())
        self.assertEqual(state["status"], "render_failed")

    def test_existing_supervisor_kernel_lease_reports_busy(self):
        self.production.mkdir(parents=True)
        lease = (self.production / "runner.lock").open("a+")
        fcntl.flock(lease.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.addCleanup(lease.close)
        result = queue.run_queue(["approved-topic"], clock=lambda: self.now, run_command=lambda *a, **k: self.fail("must not run"))
        self.assertEqual(result["status"], "busy")

    def test_inherited_flock_remains_held_after_parent_closes_its_handle(self):
        lock_path = self.root / "inherited.lock"
        parent_handle = lock_path.open("a+")
        fcntl.flock(parent_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        child = subprocess.Popen(
            [queue.sys.executable, "-c", "import time; print('ready', flush=True); time.sleep(0.4)"],
            pass_fds=(parent_handle.fileno(),), stdout=subprocess.PIPE, text=True,
        )
        self.assertEqual(child.stdout.readline().strip(), "ready")
        parent_handle.close()
        contender = lock_path.open("a+")
        with self.assertRaises(BlockingIOError):
            fcntl.flock(contender.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.assertEqual(child.wait(timeout=3), 0)
        child.stdout.close()
        fcntl.flock(contender.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        contender.close()

    def test_out_of_window_defers_without_starting_children(self):
        self.write_approval("approved-topic")
        fake, _ = self.fake_commands()
        daytime = self.now.replace(hour=10)
        result = queue.run_queue(["approved-topic"], clock=lambda: daytime, run_command=fake)
        self.assertEqual(result["status"], "deferred_window")
        self.assertEqual(result["results"], [])

    def test_daylight_dry_run_is_successful_preflight_and_never_starts_heavy_work(self):
        self.write_approval("approved-topic")
        calls = []

        def approval_only(args):
            calls.append(args)
            self.assertTrue(any("approved-sources.mjs" in arg for arg in args))
            return queue.subprocess.CompletedProcess(args, 0, "", "")

        with patch.object(queue, "render_lock_busy", return_value=False):
            result = queue.dry_run(["approved-topic"], run_command=approval_only,
                                   clock=lambda: self.now.replace(hour=10))
        self.assertEqual(result["status"], "dry_run_ready")
        self.assertFalse(result["windowOpen"])
        self.assertEqual(calls, [["node", "video/scripts/approved-sources.mjs", "approved-topic"]])

    def test_rejects_unsafe_slugs_and_over_cap_input(self):
        with self.assertRaises(ValueError):
            queue.run_queue(["../coin-topic"], clock=lambda: self.now)
        with self.assertRaises(ValueError):
            queue.run_queue([f"approved-{index}" for index in range(51)], clock=lambda: self.now)
        with self.assertRaises(ValueError):
            queue.run_queue(["approved-one"], max_topics_per_day=1, target_renders_per_day=2, clock=lambda: self.now)

    def test_current_checkpoint_skips_render_and_does_not_spend_daily_capacity(self):
        slugs = ["first-current", "second-pending", "third-pending"]
        fake, calls = self.fake_commands()
        for slug in slugs:
            self.write_approval(slug)
        slug = slugs[0]
        out = self.root / "video/out" / slug
        out.mkdir(parents=True)
        (out / f"{slug}.mp4").write_bytes(b"prior mp4")
        for filename, contents in {
            "render-props.json": "{}", "script.json": "{}", "captions.json": "{}",
            "audio-timing.json": "{}", "captions-meta.json": json.dumps({"mode": "word-timed"}),
            "render-meta.json": json.dumps({"slug": slug, "voice": "chatterbox", "approvedSourceHashes": {"verified.md": "a" * 64, "index.html": "old"}}),
            "release-qa.json": json.dumps({"pass": True, "readyForPosting": False}),
        }.items():
            (out / filename).write_text(contents)
        queue.save_topic(slug, "2026-11-04", status="rendered-awaiting-review", artifactDigests=queue.output_digests(slug))
        run_dir = queue.PRODUCTION / "runs" / "2026-11-05"
        run_dir.mkdir(parents=True)
        (run_dir / "queue.json").write_text(json.dumps({"attemptedSlugs": [slug], "successfulSlugs": []}))
        result = queue.run_queue(slugs, max_topics_per_day=2, target_renders_per_day=2,
                                 clock=lambda: self.now, run_command=fake)
        self.assertEqual([item["status"] for item in result["results"]], ["already_current", "rendered-awaiting-review"])
        render_slugs = [next(arg.split("=", 1)[1] for arg in args if arg.startswith("--post="))
                        for args, _ in calls if any("render.mjs" in arg for arg in args)]
        self.assertEqual(render_slugs, ["second-pending"])

    def test_global_render_lock_is_busy_unless_helper_proves_dead_owner(self):
        self.render_lock.mkdir()
        (self.render_lock / "pid").write_text("1234")
        for returncode, expected in [(0, True), (2, True), (1, False)]:
            with self.subTest(returncode=returncode), patch.object(
                queue.subprocess, "run", return_value=queue.subprocess.CompletedProcess([], returncode)
            ):
                self.assertEqual(queue.render_lock_busy(), expected)

    def test_active_or_indeterminate_article_writers_defer_memory_heavy_speech(self):
        for path in [queue.PUBLISHER_LOCK, queue.COIN_DRAFT_LOCK]:
            with self.subTest(path=path):
                path.mkdir()
                with patch.object(queue.subprocess, 'run', return_value=queue.subprocess.CompletedProcess([], 0)):
                    self.assertTrue(queue.render_lock_busy())
                with patch.object(queue.subprocess, 'run', return_value=queue.subprocess.CompletedProcess([], 1)):
                    self.assertFalse(queue.render_lock_busy())

    def test_valid_existing_render_without_runner_checkpoint_is_reused(self):
        slug = "prior-render-topic"
        self.write_approval(slug)
        out = self.root / "video/out" / slug
        out.mkdir(parents=True)
        (out / f"{slug}.mp4").write_bytes(b"prior mp4")
        for filename, contents in {
            "render-props.json": "{}", "script.json": "{}", "captions.json": "{}",
            "audio-timing.json": "{}", "captions-meta.json": json.dumps({"mode": "word-timed"}),
            "render-meta.json": json.dumps({"slug": slug, "voice": "chatterbox", "approvedSourceHashes": {"verified.md": "a" * 64}, "renderedAt": "2026-11-05T09:00:00Z"}),
            "release-qa.json": json.dumps({"pass": True, "readyForPosting": False, "generatedAt": "2026-11-05T09:01:00Z"}),
        }.items():
            (out / filename).write_text(contents)
        fake, calls = self.fake_commands()
        result = queue.run_queue([slug], max_topics_per_day=1, target_renders_per_day=1,
                                 clock=lambda: self.now, run_command=fake)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["results"][0]["status"], "already_current")
        self.assertFalse(any(any("render.mjs" in arg for arg in args) for args, _ in calls))

    def test_only_hash_approved_presentation_plan_enables_presentation_render(self):
        slug = "presentation-approved-topic"
        blog = self.write_approval(slug)
        plan = blog / "presentation-plan.json"
        plan.write_text(json.dumps({
            "profile": "business-growth-v1",
            "safeZones": {"width": 1080, "height": 1920, "captionBottomClearancePx": 250, "socialUiRightClearancePx": 150},
        }) + "\n")
        qa_path = blog / "qa.json"
        qa = json.loads(qa_path.read_text())
        qa["artifactSha256"]["presentation-plan.json"] = queue.digest(plan)
        qa_path.write_text(json.dumps(qa))
        fake, calls = self.fake_commands()
        result = queue.run_queue([slug], max_topics_per_day=1, target_renders_per_day=1,
                                 clock=lambda: self.now, run_command=fake)
        self.assertEqual(result["status"], "completed_target")
        render_args = next(args for args, _ in calls if any("render.mjs" in arg for arg in args))
        self.assertIn("--quality=presentation", render_args)

    def test_business_presentation_requires_exact_profile_dimensions_and_plan_hash(self):
        slug = "business-profile-validation"
        blog = self.write_approval(slug)
        plan = blog / "presentation-plan.json"
        plan.write_text(json.dumps({
            "profile": "business-growth-v1",
            "safeZones": {"width": 1080, "height": 1920, "captionBottomClearancePx": 250, "socialUiRightClearancePx": 150},
        }) + "\n")
        qa_path = blog / "qa.json"
        approval = json.loads(qa_path.read_text())["artifactSha256"]
        approval["presentation-plan.json"] = queue.digest(plan)
        qa_path.write_text(json.dumps({"pass": True, "mode": "codex-editorial", "score": 90, "blockers": [], "artifactSha256": approval}))
        out = self.root / "video/out" / slug
        out.mkdir(parents=True)
        (out / f"{slug}.mp4").write_bytes(b"mp4")
        for name, value in {
            "render-props.json": {}, "script.json": {}, "captions.json": {}, "audio-timing.json": {},
            "captions-meta.json": {"mode": "word-timed"}, "release-qa.json": {"pass": True, "generatedAt": "2026-11-05T09:01:00Z"},
        }.items():
            (out / name).write_text(json.dumps(value))
        meta = {
            "slug": slug, "voice": "chatterbox", "renderedAt": "2026-11-05T09:00:00Z",
            "approvedSourceHashes": approval, "presentationPlanSha256": approval["presentation-plan.json"],
            "qualityProfile": "business-growth-1080p-crf20-slow", "presentationProfile": "business-growth-v1",
            "outputDimensions": {"width": 1080, "height": 1920},
        }
        meta_path = out / "render-meta.json"
        meta_path.write_text(json.dumps(meta))
        checkpoint = {"status": "rendered-awaiting-review", "artifactDigests": queue.output_digests(slug)}
        self.assertTrue(queue.render_is_current(slug, approval, checkpoint))

        meta["qualityProfile"] = "presentation-720p-crf20-slow"
        meta_path.write_text(json.dumps(meta))
        checkpoint["artifactDigests"] = queue.output_digests(slug)
        self.assertFalse(queue.render_is_current(slug, approval, checkpoint))

        meta["qualityProfile"] = "business-growth-1080p-crf20-slow"
        meta["presentationPlanSha256"] = "0" * 64
        meta_path.write_text(json.dumps(meta))
        checkpoint["artifactDigests"] = queue.output_digests(slug)
        self.assertFalse(queue.render_is_current(slug, approval, checkpoint))


if __name__ == "__main__":
    unittest.main()
