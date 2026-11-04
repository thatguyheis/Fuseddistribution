import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tts_worker_lock import acquire_worker_lock


class WorkerLockTest(unittest.TestCase):
    def test_excludes_another_process_and_releases_after_owner_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'worker.lock'
            code = ('from pathlib import Path; from tts_worker_lock import acquire_worker_lock; '
                    'import sys; handle=acquire_worker_lock(Path(sys.argv[1]))')
            owner = acquire_worker_lock(path)
            original = path.read_text()
            contender = subprocess.run([sys.executable, '-c', code, str(path)],
                                       cwd=Path(__file__).parent, capture_output=True, text=True)
            self.assertNotEqual(contender.returncode, 0)
            self.assertIn('already active', contender.stderr)
            self.assertEqual(path.read_text(), original)
            owner.close()
            resumed = subprocess.run([sys.executable, '-c', code, str(path)],
                                     cwd=Path(__file__).parent, capture_output=True, text=True)
            self.assertEqual(resumed.returncode, 0, resumed.stderr)


if __name__ == '__main__':
    unittest.main()
