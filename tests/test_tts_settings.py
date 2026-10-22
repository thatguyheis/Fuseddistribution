import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'video/scripts'))
from tts_settings import nano_generation_settings, sampling_seed

class NanoSettingsTests(unittest.TestCase):
    def test_reviewed_baseline_and_unsupported_controls(self):
        s = nano_generation_settings({})
        self.assertEqual((s['temperature'], s['top_p'], s['top_k'], s['repetition_penalty']), (.8, .95, 1000, 1.2))
        self.assertEqual((s['cfg_weight'], s['exaggeration'], s['min_p']), (0, 0, 0))

    def test_reviewed_seed_is_stable_and_validated(self):
        self.assertEqual(sampling_seed({}, 0), 1337)
        self.assertEqual(sampling_seed({"seed": 1337}, 1), 1338)
        for seed in [-1, True, 1.5, 2**32]:
            with self.assertRaises(ValueError):
                sampling_seed({"seed": seed}, 0)

    def test_rejects_invalid_or_ignored_tuning(self):
        for settings in [{'temperature': 0}, {'top_p': 1.2}, {'top_k': 1.2}, {'top_k': True}, {'repetition_penalty': .5}, {'temperature': float('nan')}, {'cfg_weight': .5}]:
            with self.subTest(settings=settings), self.assertRaises(ValueError):
                nano_generation_settings({'generation': settings})

if __name__ == '__main__':
    unittest.main()
