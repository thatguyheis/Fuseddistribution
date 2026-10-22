"""Prepare dated drafts sequentially; never approve, register or publish them."""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import time
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent


def preparation_days(now):
    """Mon23 prepares Tue–Thu; Thu23 prepares Fri–Mon; daytime repairs include today."""
    explicit = os.environ.get('GEMMA_RUN_DATE') or os.environ.get('BLOG_RUN_DATE')
    if explicit:
        return [dt.date.fromisoformat(explicit).isoformat()]
    day = now.date() + dt.timedelta(days=now.hour >= 23)
    days = []
    for _ in range(4):
        days.append(day.isoformat())
        if day.weekday() in (0, 3):
            break
        day += dt.timedelta(days=1)
    return days


def input_state(root, day):
    research = root / 'public/blog/research'
    queue = research / f'{day}-queue.json'
    if queue.exists():
        data = json.loads(queue.read_text())
        if data.get('date') != day or not data.get('posts'):
            return 'owner_repair_required'
        plan = research / f'{day}-plan.json'
        if plan.exists():
            intended = {p['slug'] for p in json.loads(plan.read_text())['posts']}
            if intended - {p['slug'] for p in data['posts']}:
                return 'owner_repair_required'
        return 'queue_preserved'
    if (research / f'{day}-plan.json').exists():
        return 'owner_repair_required'
    return 'needs_draft'


def main():
    folder = ROOT / '.workflow-state/research-batch'
    folder.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.now(ZoneInfo('America/Los_Angeles'))
    state = {'startedAt': now.isoformat(), 'pid': os.getpid(), 'days': preparation_days(now), 'results': []}
    def save(stage):
        state.update(stage=stage, updatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
        temp = folder / f'latest.{os.getpid()}.json'
        temp.write_text(json.dumps(state, indent=2)+'\n')
        temp.replace(folder / 'latest.json')
    deadline = time.monotonic() + 21600
    save('preparing')
    for day in state['days']:
        try:
            before = input_state(ROOT, day)
        except (ValueError, KeyError, TypeError) as error:
            state['results'].append({'day': day, 'status': 'invalid_input', 'error': str(error)})
            save('owner_repair_required');return 1
        if before != 'needs_draft':
            state['results'].append({'day': day, 'status': before})
            save('preparing')
            continue
        remaining = int(deadline - time.monotonic())
        if remaining < 60:
            save('deadline_requires_owner');return 1
        env = dict(os.environ, GEMMA_RUN_DATE=day, GEMMA_TIMEOUT_SECONDS=str(min(5400, remaining)))
        result = subprocess.run(['/bin/zsh', 'scripts/gemma-research-runner.sh'], cwd=ROOT, env=env)
        try:
            after = input_state(ROOT, day)
        except (ValueError, KeyError, TypeError) as error:
            state['results'].append({'day': day, 'status': 'invalid_output', 'error': str(error)})
            save('owner_repair_required');return 1
        state['results'].append({'day': day, 'exitCode': result.returncode, 'status': after})
        # A zero shell exit may mean another producer owns compute, not success.
        if result.returncode or after == 'needs_draft':
            save('deferred_or_failed_requires_owner');return 1
        save('preparing')
    blocked = any(r['status']=='owner_repair_required' for r in state['results'])
    save('owner_repair_required' if blocked else 'draft_pass_finished')
    return int(blocked)


if __name__ == '__main__':
    raise SystemExit(main())
