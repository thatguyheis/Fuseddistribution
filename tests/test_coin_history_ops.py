import datetime as dt
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from coin_history_ops import queue_health, throughput_report


def prepare(root, slug):
    work = root / 'content/coin-history' / slug
    blog = root / 'public/blog' / slug
    work.mkdir(parents=True)
    blog.mkdir(parents=True)
    transcript = b'Approved episode transcript.'
    (work / 'narration-v1-approved.txt').write_bytes(transcript)
    (work / 'script-approval.json').write_text(json.dumps({'transcriptApproved': True, 'approvedTranscriptSha256': hashlib.sha256(transcript).hexdigest()}))
    for path in [work / 'research.json', work / 'claim-map.json', blog / 'meta.json', blog / 'content-plan.json', blog / 'reel-script-approved.md', blog / 'image-sources.json']:
        path.write_text('{}')


class CoinHistoryOpsTests(unittest.TestCase):
    def test_queue_alert_counts_only_prepared_items_not_completed_items(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for slug in ['one', 'two']:
                prepare(root, slug)
            queue = [{'slug': 'one'}, {'slug': 'two'}, {'slug': 'missing'}]
            state = {'items': {'two': {'status': 'release_ready', 'releaseReady': True}}}
            report = queue_health(root, queue, state, target=3,
                                  now=dt.datetime(2026, 10, 22, 12, tzinfo=dt.timezone.utc))
            self.assertEqual(report['pendingPrepared'], 1)
            self.assertEqual(report['completedInQueue'], 1)
            self.assertEqual(report['invalidPackages'], ['missing'])
            self.assertTrue(report['alert'])

    def test_queue_is_healthy_at_three_prepared_packages(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            slugs = ['one', 'two', 'three']
            for slug in slugs:
                prepare(root, slug)
            report = queue_health(root, [{'slug': slug} for slug in slugs], {'items': {}}, target=3)
            self.assertEqual(report['status'], 'healthy')
            self.assertFalse(report['alert'])

    def test_throughput_report_counts_completed_pairs_by_pacific_date_and_stage(self):
        now = dt.datetime(2026, 10, 22, 18, tzinfo=dt.timezone.utc)
        state = {'items': {'coin-a': {'completedAt': '2026-10-22T17:00:00+00:00', 'attempts': 2,
                                      'stageMetrics': [{'stage': 'render', 'elapsedSeconds': 300, 'outcome': 'passed'}]},
                           'coin-b': {'completedAt': '2026-10-21T17:00:00+00:00', 'attempts': 1,
                                      'stageMetrics': [{'stage': 'render', 'elapsedSeconds': 600, 'outcome': 'passed'}]}}}
        report = throughput_report(state, target=3, now=now)
        self.assertEqual(report['todayCompletedPairs'], 1)
        self.assertFalse(report['targetMetToday'])
        self.assertEqual(report['stageDurations']['render']['medianSeconds'], 450)
        self.assertEqual(report['stageDurations']['render']['passed'], 2)


if __name__ == '__main__':
    unittest.main()
