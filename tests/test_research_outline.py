import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('outline',Path(__file__).resolve().parents[1]/'scripts/validate-research-outline.py')
outline=importlib.util.module_from_spec(spec);spec.loader.exec_module(outline)
class OutlineTests(unittest.TestCase):
 def test_rejects_observed_brand_drift(self):
  self.assertTrue(outline.validate('budgeting time for accessibility maintenance',['Setting up your Google Business Profile','Local SEO basics','Getting more calls','Reviews','Next steps']))
 def test_accepts_relevant_sections(self):
  self.assertEqual(outline.validate('budgeting time for accessibility maintenance',['Define accessibility maintenance','Budget for routine checks','Review accessibility feedback','Allocate maintenance time','Assign responsibility','Check completed repairs']),[])
 def test_missing_and_repeated_headings_fail(self):
  self.assertTrue(outline.validate('coin designs',['coin designs']*6))
  self.assertTrue(outline.validate('coin designs',['coin designs']))
if __name__=='__main__':unittest.main()
