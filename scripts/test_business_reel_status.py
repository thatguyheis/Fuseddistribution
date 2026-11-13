import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('business_status', Path(__file__).with_name('business-reel-status.py'))
status = importlib.util.module_from_spec(spec)
spec.loader.exec_module(status)


class BusinessDeliveryStatusTests(unittest.TestCase):
    def test_overdue_posts_survive_removal_from_the_active_topic_queue(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            records = [
                {'slug':'completed-old-topic','postId':'old-id','status':'scheduled','dueAt':'2026-11-12T01:00:00Z'},
                {'slug':'new-topic','postId':'future-id','status':'scheduled','dueAt':'2026-11-13T21:00:00Z'},
                {'slug':'sent-topic','postId':'sent-id','status':'sent','dueAt':'2026-11-12T01:00:00Z'},
                {'slug':'failed-topic','postId':'failed-id','status':'failed','dueAt':'2026-11-12T01:00:00Z'},
            ]
            (root/'.buffer-youtube-scheduled.json').write_text(json.dumps({'scheduled':records}))
            by_slug, due = status.buffer_delivery_records(root, dt.datetime(2026,11,13,17,tzinfo=dt.timezone.utc))
            self.assertEqual(due, ['old-id'])
            self.assertEqual(by_slug['completed-old-topic'][0]['platform'], 'youtube')

    def test_invalid_naive_dates_do_not_crash_health_monitoring(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'.buffer-x-scheduled.json').write_text(json.dumps({'scheduled':[{'slug':'invalid','postId':'bad-id','status':'scheduled','dueAt':'2026-11-12'}]}))
            by_slug, due = status.buffer_delivery_records(root, dt.datetime.now(dt.timezone.utc))
            self.assertEqual(due, [])
            self.assertTrue(by_slug['invalid'][0]['dueTimeInvalid'])


if __name__ == '__main__':
    unittest.main()
