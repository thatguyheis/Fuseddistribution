import datetime as dt
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('coin_runner', ROOT / 'scripts/run-coin-history-drafts.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class DailyCapTest(unittest.TestCase):
    def setUp(self):
        self.saved = runner.DAILY_TARGET
        runner.DAILY_TARGET = 3
        self.today = runner.now().isoformat()
        self.yesterday = (runner.now() - dt.timedelta(days=2)).isoformat()

    def tearDown(self):
        runner.DAILY_TARGET = self.saved

    def state(self, published_stamps, extra=None):
        items = {f'done-{i}': {'blogPublished': True, 'blogPublishedAt': stamp, 'releaseReady': True}
                 for i, stamp in enumerate(published_stamps)}
        items.update(extra or {})
        return {'items': items}

    def test_new_post_starts_below_target(self):
        state = self.state([self.today, self.today])
        item, _ = runner.choose([{'slug': 'next-coin'}], state)
        self.assertEqual(item['slug'], 'next-coin')

    def test_new_post_waits_at_target(self):
        state = self.state([self.today] * 3)
        item, _ = runner.choose([{'slug': 'next-coin'}], state)
        self.assertIsNone(item)

    def test_published_post_can_finish_reel_at_target(self):
        state = self.state([self.today] * 2, {'live-coin': {'blogPublished': True, 'blogPublishedAt': self.today}})
        item, _ = runner.choose([{'slug': 'next-coin'}, {'slug': 'live-coin'}], state)
        self.assertEqual(item['slug'], 'live-coin')

    def test_earlier_days_do_not_count(self):
        state = self.state([self.yesterday] * 5)
        item, _ = runner.choose([{'slug': 'next-coin'}], state)
        self.assertEqual(item['slug'], 'next-coin')


if __name__ == '__main__':
    unittest.main()
