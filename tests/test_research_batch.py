import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('batch',Path(__file__).resolve().parents[1]/'scripts/gemma-research-batch.py')
batch=importlib.util.module_from_spec(spec);spec.loader.exec_module(batch)
class BatchTests(unittest.TestCase):
    @patch.dict(os.environ,{},clear=True)
    def test_twice_weekly_covers_seven_days(self):
        self.assertEqual(batch.preparation_days(dt.datetime(2026,10,5,23)),['2026-10-06','2026-10-07','2026-10-08'])
        self.assertEqual(batch.preparation_days(dt.datetime(2026,10,8,23)),['2026-10-09','2026-10-10','2026-10-11','2026-10-12'])
    @patch.dict(os.environ,{},clear=True)
    def test_daytime_catchup_does_not_skip_today(self):
        self.assertEqual(batch.preparation_days(dt.datetime(2026,10,6,9))[0],'2026-10-06')
    def test_explicit_recovery_date_is_preserved(self):
        with patch.dict(os.environ,{'GEMMA_RUN_DATE':'2026-10-01'}):
            self.assertEqual(batch.preparation_days(dt.datetime(2026,10,5,23)),['2026-10-01'])
    def test_partial_or_failed_input_requires_owner_not_regeneration(self):
        root=Path(tempfile.mkdtemp());r=root/'public/blog/research';r.mkdir(parents=True)
        day='2026-10-06';self.assertEqual(batch.input_state(root,day),'needs_draft')
        (r/f'{day}-plan.json').write_text(json.dumps({'posts':[{'slug':'a'},{'slug':'b'}]}))
        self.assertEqual(batch.input_state(root,day),'owner_repair_required')
        q=r/f'{day}-queue.json';q.write_text(json.dumps({'date':day,'posts':[{'slug':'a'}]}))
        self.assertEqual(batch.input_state(root,day),'owner_repair_required')
        q.write_text(json.dumps({'date':day,'posts':[{'slug':'a'},{'slug':'b'}]}))
        self.assertEqual(batch.input_state(root,day),'queue_preserved')
if __name__=='__main__':unittest.main()
