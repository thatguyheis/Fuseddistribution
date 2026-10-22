import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('health', Path(__file__).resolve().parents[1] / 'scripts/litert-generation-health.py')
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)


class HealthTests(unittest.TestCase):
    def run_case(self, outcomes, owns=True):
        with patch.object(health, 'probe', side_effect=outcomes) as probe, \
             patch.object(health, 'owns_lane', return_value=owns), \
             patch.object(health, 'restart') as restart:
            result = health.ensure()
            return result, probe.call_count, restart.call_count

    def test_healthy_inference_does_not_restart(self):
        result, probes, restarts = self.run_case([None])
        self.assertTrue(result['healthy'])
        self.assertEqual((probes, restarts), (1, 0))

    def test_broken_inference_recovers_once(self):
        result, probes, restarts = self.run_case([RuntimeError('GPU failed'), None])
        self.assertTrue(result['healthy'])
        self.assertEqual((probes, restarts), (2, 1))

    def test_persistent_failure_is_not_reported_healthy(self):
        result, probes, restarts = self.run_case([RuntimeError('GPU failed')] * 2)
        self.assertFalse(result['healthy'])
        self.assertEqual((probes, restarts), (2, 1))

    def test_unverified_ownership_never_restarts(self):
        result, probes, restarts = self.run_case([RuntimeError('GPU failed')], owns=False)
        self.assertFalse(result['healthy'])
        self.assertEqual((probes, restarts), (1, 0))


if __name__ == '__main__':
    unittest.main()
