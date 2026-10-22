#!/usr/bin/env python3
"""Exit 0 for a live or indeterminate lock, 1 only for a proven dead PID."""
import errno
import os
import sys
from pathlib import Path

try:
    pid = int((Path(sys.argv[1]) / 'pid').read_text().strip())
    if pid <= 0:
        raise ValueError('invalid pid')
except (OSError, ValueError):
    sys.exit(0)  # A just-created lock may not yet have its PID.
try:
    os.kill(pid, 0)
except OSError as error:
    sys.exit(1 if error.errno == errno.ESRCH else 0)
sys.exit(0)
