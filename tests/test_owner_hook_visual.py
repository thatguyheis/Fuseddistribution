import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('visual_review', Path(__file__).resolve().parents[1] / 'video/scripts/auto-visual-review.py')
visual = importlib.util.module_from_spec(spec)
spec.loader.exec_module(visual)


class OwnerHookVisualTests(unittest.TestCase):
    def test_visible_and_recognized_words_must_both_match(self):
        expected = 'Once you notice this pattern in AI videos, you can’t unsee it.'
        recognized = expected.replace('’', "'")
        result = visual.verify_approved_hook(expected, expected, {'0': [{'text': recognized}]})
        self.assertTrue(result['spokenMatch'])
        self.assertTrue(result['visibleMatch'])
        self.assertEqual(result['frameSeconds'], 0)
        changed = visual.verify_approved_hook(expected, 'What pattern do you notice?', [[{'text': recognized}]])
        self.assertFalse(changed['visibleMatch'])
        changed = visual.verify_approved_hook(expected, expected, [[{'text': 'A different opening question'}]])
        self.assertFalse(changed['spokenMatch'])

    def test_missing_recognition_cannot_pass(self):
        result = visual.verify_approved_hook('Approved headline', '', {})
        self.assertFalse(result['spokenMatch'])
        self.assertFalse(result['visibleMatch'])


if __name__ == '__main__':
    unittest.main()
