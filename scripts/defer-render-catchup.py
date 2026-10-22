"""One bounded local handoff after production becomes idle. No model or API polling."""
import datetime
import json
import os
import pathlib
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(day):
    datetime.date.fromisoformat(day)
    folder = ROOT / '.workflow-state' / f'render-handoff-{day}'
    folder.mkdir(exist_ok=True)
    lock = folder / 'owner.lock'
    try:
        lock.mkdir()
    except FileExistsError:
        # An uncertain owner requires inspection, not an automatic duplicate.
        return
    (lock / 'pid').write_text(str(os.getpid()))
    state = {'date': day, 'pid': os.getpid(), 'state': 'waiting_for_local_production'}

    def save(status, **details):
        state.update(state=status, updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), **details)
        (folder / 'status.json').write_text(json.dumps(state, indent=2) + '\n')

    try:
        save('waiting_for_local_production')
        deadline = time.monotonic() + 6 * 3600
        while time.monotonic() < deadline:
            busy = False
            for name in ['fused-reel-scheduler', 'fused-remotion-render', 'fused-blog-publisher']:
                path = pathlib.Path('/tmp') / (name + '.lock')
                if path.exists() and subprocess.run(
                    [sys.executable, str(ROOT / 'scripts/lock-owner-alive.py'), str(path)],
                    capture_output=True,
                ).returncode != 1:
                    busy = True
                    break
            if busy:
                time.sleep(30)
                continue
            queue = json.loads((ROOT / 'public/blog/research' / f'{day}-queue.json').read_text())
            if not queue.get('posts'):
                raise ValueError('No queued articles to hand off')
            for post in queue['posts']:
                qa = json.loads((ROOT / 'public/blog' / post['slug'] / 'qa.json').read_text())
                if not qa.get('pass') or qa.get('mode') != 'codex-editorial':
                    raise ValueError('Queued article requires editorial review: ' + post['slug'])
            # Existing launchd job retains its environment, four-render budget,
            # shared locks, approved music cycle, and independent release gates.
            subprocess.run(['launchctl', 'kickstart', f'gui/{os.getuid()}/com.nick.render-missing-reels'], check=True, timeout=30)
            save('renderer_handoff_requested', slugs=[post['slug'] for post in queue['posts']],
                 nextAction='Verify actual render and release evidence; launch success is not completion.')
            return
        raise TimeoutError('Production remained busy for six hours; owner review required')
    except Exception as error:
        save('owner_review_required', error=str(error))
        raise
    finally:
        lock.rename(folder / f'owner.finished.{os.getpid()}.{time.time_ns()}')


if __name__ == '__main__':
    main(sys.argv[1])
