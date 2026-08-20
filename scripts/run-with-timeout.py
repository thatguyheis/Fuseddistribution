#!/usr/bin/env python3
"""Run one command with a timeout and terminate its whole process group."""

import os
import signal
import subprocess
import sys


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: run-with-timeout.py SECONDS COMMAND [ARGS...]", file=sys.stderr)
        return 2
    try:
        timeout = int(sys.argv[1])
    except ValueError:
        print("timeout must be an integer number of seconds", file=sys.stderr)
        return 2

    command = sys.argv[2:]
    process = subprocess.Popen(command, start_new_session=True)
    try:
        return process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        print(f"command timed out after {timeout}s: {' '.join(command)}", file=sys.stderr)
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=10)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        return 124


if __name__ == "__main__":
    raise SystemExit(main())
