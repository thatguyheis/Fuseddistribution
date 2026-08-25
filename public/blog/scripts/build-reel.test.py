#!/usr/bin/env python3

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("build-reel.py")
SPEC = importlib.util.spec_from_file_location("build_reel", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BuildReelTests(unittest.TestCase):
    def test_prefers_measurable_stat_over_year_range(self):
        text = (
            "The market was valued at $1.78 billion in 2023 and is projected "
            "to grow 4.7 percent from 2024 to 2028."
        )

        figure = MODULE.find_figure(text)

        self.assertIsNotNone(figure)
        self.assertEqual(figure.group(0), "$1.78 billion")

    def test_ignores_bare_ordered_list_number(self):
        self.assertIsNone(MODULE.find_figure("Refine the response and ask a follow-up question. 5."))

    def test_builds_complete_timed_reel(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            article = root / "verified.md"
            hooks = root / "hooks.json"
            output = root / "reel-data.md"
            sentence = (
                "Local businesses improve results when they publish useful answers, measure customer actions, "
                "and revise each page using evidence from real search behavior and direct customer feedback."
            )
            article.write_text(
                "# Test Article\n\n"
                + " ".join(
                    f"{i + 10} percent of surveyed owners reported measurable improvement after the change. {sentence}"
                    for i in range(32)
                )
                + "\n\n## Related\n\nRead next: [Unrelated Post](/blog/unrelated/)"
            )
            hooks.write_text(json.dumps({"hook": "Most websites lose customers before the first click.", "discussion_question": "What would you fix first"}))
            args = MODULE.argparse.Namespace(slug="test-post", input=str(article), hooks=str(hooks), output=str(output), brand="tech", keyword="website conversion")

            _, script_path, body_count, duration = MODULE.build(args)
            script = script_path.read_text()

            self.assertGreaterEqual(body_count, 8)
            self.assertLessEqual(body_count, 12)
            self.assertGreaterEqual(duration, 180)
            self.assertLessEqual(duration, 240)
            self.assertIn("## STAT:", script)
            self.assertIn("Text: What would you fix first?", script)
            self.assertIn("Narration: What would you fix first?", script)
            self.assertNotIn("Read next", script)
            reel_data = output.read_text()
            self.assertEqual(reel_data.count("prefer: video"), 1)

    def test_content_plan_limits_reel_to_selected_topic_cluster(self):
        paragraphs = {}
        for index in range(1, 9):
            marker = "CORETOPIC" if index <= 4 else "OFFTOPIC"
            paragraphs[f"s{index:02d}"] = " ".join(
                f"{marker} action {index} gives the reader one concrete step and a measurable check for reliable execution."
                for _ in range(12)
            )
        article = "# Planned Article\n\nOpening.\n\n" + "\n\n".join(
            f"## Section {index}\n\n{paragraphs[f's{index:02d}']}" for index in range(1, 9)
        )
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            article_path = root / "verified.md"
            plan_path = root / "content-plan.json"
            article_path.write_text(article)
            plan_path.write_text(json.dumps({
                "sections": [{"id": f"s{index:02d}", "heading": f"Section {index}"} for index in range(1, 9)],
                "reel": {"topic": "One narrow fix", "sectionIds": ["s01", "s02", "s03", "s04"]},
            }))

            source, focus = MODULE.planned_reel_source(article, plan_path)

            self.assertEqual(focus, "One narrow fix")
            self.assertIn("CORETOPIC", source)
            self.assertNotIn("OFFTOPIC", source)


if __name__ == "__main__":
    unittest.main()
