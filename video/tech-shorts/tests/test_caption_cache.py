"""Run with the Chatterbox Python environment used by the manual renderer."""
from pathlib import Path
import importlib.util
import sys
import unittest

sys.dont_write_bytecode = True
source = Path(__file__).resolve().parents[1] / 'tools/fused_tech_video.py'
spec = importlib.util.spec_from_file_location('tech_short', source)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class CaptionCacheTests(unittest.TestCase):
    def test_multiple_phrases_and_expired_text_clear(self):
        self.assertTrue(renderer.verify_caption_rendering())

    def test_regression_rejects_mutable_cached_chart(self):
        original = renderer.Chart.frame

        def broken(chart, time):
            if chart.final is not None and time >= 4.5:
                return chart.final
            return original(chart, time)

        renderer.Chart.frame = broken
        try:
            with self.assertRaises(RuntimeError):
                renderer.verify_caption_rendering()
        finally:
            renderer.Chart.frame = original


if __name__ == '__main__':
    unittest.main()
