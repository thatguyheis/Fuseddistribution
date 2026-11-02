import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest


MODULE_PATH = Path(__file__).with_name('run-coin-history-drafts.py')
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location('coin_history_drafts', MODULE_PATH)
WORKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(WORKER)


class OvernightRenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        WORKER.ROOT = self.root
        WORKER.STATE = self.root / '.workflow-state/state.json'
        WORKER.LOG = self.root / '.workflow-state/runner.log'
        WORKER.DAILY_TARGET = 0

    def tearDown(self):
        self.temp.cleanup()

    def test_worker_skips_queued_reel_until_nightly_release_evidence_exists(self):
        record = {'blogPublished': True, 'renderQueued': True, 'status': 'awaiting_overnight_render'}
        state = {'items': {'episode-one': record}}
        self.assertEqual(WORKER.choose([{'slug': 'episode-one'}], state), (None, None))

        release_path = self.root / 'video/out/episode-one/release-qa.json'
        release_path.parent.mkdir(parents=True)
        release_path.write_text(json.dumps({'readyForPosting': True}))

        self.assertTrue(WORKER.reconcile_overnight_render_results(state))
        self.assertTrue(record['releaseReady'])
        self.assertEqual(record['status'], 'release_ready')
        self.assertEqual(WORKER.choose([{'slug': 'episode-one'}], state), (None, None))

    def test_worker_does_not_reconcile_failed_nightly_release(self):
        record = {'blogPublished': True, 'renderQueued': True, 'status': 'awaiting_overnight_render'}
        state = {'items': {'episode-two': record}}
        release_path = self.root / 'video/out/episode-two/release-qa.json'
        release_path.parent.mkdir(parents=True)
        release_path.write_text(json.dumps({'readyForPosting': False}))

        self.assertFalse(WORKER.reconcile_overnight_render_results(state))
        self.assertFalse(record.get('releaseReady', False))
        self.assertEqual(record['status'], 'awaiting_overnight_render')


if __name__ == '__main__':
    unittest.main()
