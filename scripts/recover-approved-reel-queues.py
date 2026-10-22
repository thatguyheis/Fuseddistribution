"""One bounded, resumable local render pass over explicitly approved dated queues."""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
LOCK_NAMES = ('fused-reel-scheduler', 'fused-remotion-render', 'fused-blog-publisher')


def queue_slugs(root, days):
    slugs = []
    for day in sorted(set(days)):
        datetime.date.fromisoformat(day)
        queue = json.loads((root / 'public/blog/research' / f'{day}-queue.json').read_text())
        if not queue.get('posts'):
            raise ValueError(f'Empty queue: {day}')
        for post in queue['posts']:
            slug = post['slug']
            if not slug or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in slug):
                raise ValueError('Unsafe slug')
            qa = json.loads((root / 'public/blog' / slug / 'qa.json').read_text())
            if qa.get('pass') is not True or qa.get('mode') != 'codex-editorial':
                raise ValueError(f'Editorial review required: {slug}')
            if slug not in slugs:
                slugs.append(slug)
    return slugs


def production_busy(root):
    for name in LOCK_NAMES:
        path = Path('/tmp') / f'{name}.lock'
        if path.exists() and subprocess.run(
            [sys.executable, str(root / 'scripts/lock-owner-alive.py'), str(path)],
            capture_output=True, check=False,
        ).returncode != 1:
            return True
    return False


def run(days, batch_id):
    if not batch_id or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in batch_id):
        raise ValueError('Unsafe batch identifier')
    folder = ROOT / '.workflow-state' / f'reel-queue-recovery-{batch_id}'
    folder.mkdir(exist_ok=True)
    lock = folder / 'owner.lock'
    # A prior or uncertain owner must be inspected; never automatically duplicate it.
    lock.mkdir()
    (lock / 'pid').write_text(str(os.getpid()))
    state = {'days': days, 'pid': os.getpid(), 'results': []}
    def save(stage, **details):
        state.update(stage=stage, updatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), **details)
        temporary = folder / 'status.next.json'
        temporary.write_text(json.dumps(state, indent=2) + '\n')
        temporary.replace(folder / 'status.json')
    try:
        slugs = queue_slugs(ROOT, days)
        if len(slugs) > 12:
            raise ValueError('At most 12 approved reels per recovery pass')
        save('waiting_for_production', slugs=slugs)
        deadline = time.monotonic() + 18 * 3600
        for slug in slugs:
            while production_busy(ROOT):
                if time.monotonic() >= deadline:
                    raise TimeoutError('Recovery deadline reached; preserve checkpoints for owner')
                time.sleep(30)
            if time.monotonic() >= deadline:
                raise TimeoutError('Recovery deadline reached')
            # Recheck exact artifact hashes before every attempt; approval can change while waiting.
            subprocess.run(['node', 'video/scripts/approved-sources.mjs', slug], cwd=ROOT, check=True)
            circuit = subprocess.run([sys.executable, 'scripts/tts-circuit.py', 'check', '--voice=chatterbox'], cwd=ROOT)
            if circuit.returncode:
                raise RuntimeError('TTS circuit requires repair; no repeated synthesis attempted')
            env = dict(os.environ, REEL_SLUG=slug, MAX_RENDERS_PER_RUN='1', MAX_RETRIES='1', REEL_GIT_COMMIT='0', REEL_LOG_FILE=str(folder / f'{slug}.log'))
            save('rendering', currentSlug=slug)
            with (folder / f'{slug}-process.log').open('a') as log:
                result = subprocess.run(['/bin/zsh', 'scripts/render-missing-reels.sh'], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=6000)
            # Shell completion is not release proof. Run the existing release gate separately.
            release = subprocess.run(['node', 'scripts/release-reel.mjs', f'--post={slug}'], cwd=ROOT / 'video', capture_output=True, text=True)
            (folder / f'{slug}-release.log').write_text(release.stdout + release.stderr)
            qa_path = ROOT / 'video/out' / slug / 'release-qa.json'
            qa = json.loads(qa_path.read_text()) if qa_path.exists() else {}
            ready = result.returncode == 0 and release.returncode == 0 and qa.get('readyForPosting') is True
            state['results'].append({'slug': slug, 'releaseReady': ready, 'releaseProof': str(qa_path), 'distribution': 'requires encoded visual review, derivatives, exact hosted proof and accepted schedule'})
            save('reel_checked', currentSlug=slug)
        save('render_pass_finished', currentSlug=None, nextAction='Owner must inspect encoded frames and release evidence, prepare and verify hosted derivatives, then use normal Buffer scheduling budget. This pass does not publish social posts.')
    except Exception as error:
        save('owner_review_required', error=str(error))
        raise
    finally:
        if (lock / 'pid').read_text() == str(os.getpid()):
            lock.rename(folder / f'owner.finished.{os.getpid()}.{time.time_ns()}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--batch-id', required=True)
    parser.add_argument('days', nargs='+')
    args = parser.parse_args()
    run(args.days, args.batch_id)
