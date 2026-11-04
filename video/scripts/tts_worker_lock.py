"""Keep local speech models serial even when an outer render lock is lost."""
import fcntl
import os
from pathlib import Path


def acquire_worker_lock(path=Path('/tmp/fused-chatterbox-worker.lock')):
    handle = open(path, 'a+', encoding='utf-8')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.seek(0)
        owner = handle.read().strip() or 'unknown'
        handle.close()
        raise RuntimeError(f'Chatterbox worker already active (pid {owner}); preserve its lock and wait') from None
    handle.seek(0)
    handle.truncate()
    handle.write(str(os.getpid()))
    handle.flush()
    return handle  # Keep open for the entire worker; the OS releases on exit.
