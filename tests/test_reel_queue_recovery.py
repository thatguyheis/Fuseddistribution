import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('recovery', Path(__file__).parents[1] / 'scripts/recover-approved-reel-queues.py')
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)

class QueueRecoveryTests(unittest.TestCase):
    def test_exact_dated_queue_order_and_deduplication(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            research = root / 'public/blog/research'
            research.mkdir(parents=True)
            for day, slugs in [('2026-09-29', ['older', 'shared']), ('2026-09-30', ['shared', 'newer'])]:
                (research / f'{day}-queue.json').write_text(json.dumps({'posts': [{'slug': s} for s in slugs]}))
                for slug in slugs:
                    p = root / 'public/blog' / slug
                    p.mkdir(exist_ok=True)
                    (p / 'qa.json').write_text(json.dumps({'pass': True, 'mode': 'codex-editorial'}))
            self.assertEqual(recovery.queue_slugs(root, ['2026-09-30', '2026-09-29']), ['older', 'shared', 'newer'])
            (root / 'public/blog/older/qa.json').write_text(json.dumps({'pass': True, 'mode': 'deterministic-local'}))
            with self.assertRaisesRegex(ValueError, 'Editorial review required'):
                recovery.queue_slugs(root, ['2026-09-29'])

    def test_empty_and_unsafe_queues_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            research = root / 'public/blog/research'
            research.mkdir(parents=True)
            p = research / '2026-10-01-queue.json'
            for data, error in [({'posts': []}, 'Empty queue'), ({'posts': [{'slug': '../other'}]}, 'Unsafe slug')]:
                p.write_text(json.dumps(data))
                with self.assertRaisesRegex(ValueError, error):
                    recovery.queue_slugs(root, ['2026-10-01'])

if __name__ == '__main__':
    unittest.main()
