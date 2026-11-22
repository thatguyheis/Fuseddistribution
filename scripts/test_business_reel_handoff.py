import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('business_handoff', Path(__file__).with_name('write-business-reel-handoff.py'))
handoff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handoff)


class FreshHandoffTests(unittest.TestCase):
    def test_older_or_unknown_exports_cannot_fill_new_topic_slots(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / 'production'
            for slug, stamp in [('old', '2026-11-15T10:00:00Z'), ('today', '2026-11-23T10:00:00Z'), ('unknown', None)]:
                out = root / 'video/out' / slug
                out.mkdir(parents=True)
                (out / f'{slug}.mp4').write_bytes(b'fixture')
                if stamp:
                    (out / 'render-meta.json').write_text(json.dumps({'renderedAt': stamp}))
            with patch.multiple(handoff, ROOT=root, PRODUCTION=state):
                self.assertEqual(handoff.fresh_topic_candidates(['old', 'today', 'unknown', 'new'], '2026-11-23'), ['today', 'new'])

    def test_repaired_old_topic_does_not_become_a_fresh_handoff_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = root / 'production'
            out = root / 'video/out/repaired'
            out.mkdir(parents=True)
            (out / 'repaired.mp4').write_bytes(b'fixture')
            (out / 'render-meta.json').write_text(json.dumps({'renderedAt': '2026-11-23T10:00:00Z'}))
            (state / 'topics').mkdir(parents=True)
            (state / 'topics/repaired.json').write_text(json.dumps({'firstRenderedAt': '2026-11-15T10:00:00Z'}))
            with patch.multiple(handoff, ROOT=root, PRODUCTION=state):
                self.assertEqual(handoff.fresh_topic_candidates(['repaired'], '2026-11-23'), [])


if __name__ == '__main__':
    unittest.main()
