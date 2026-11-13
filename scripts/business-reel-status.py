#!/usr/bin/env python3
"""Compact local production/delivery checkpoint for scheduled Luna monitors."""
import datetime as dt
import fcntl
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / '.workflow-state/business-growth-ai-365'

def read(path, default=None):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default

def lease_state(path):
    if not path.exists():
        return 'free'
    try:
        with path.open('r+') as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return 'held'
            fcntl.flock(handle, fcntl.LOCK_UN)
        return 'free'
    except OSError:
        return 'indeterminate'

def buffer_delivery_records(root, now):
    """Read each channel once; overdue IDs remain visible after a topic leaves the queue."""
    records_by_slug = {}
    due_ids = set()
    for platform in ['youtube', 'x', 'instagram']:
        log = read(root / f'.buffer-{platform}-scheduled.json', {})
        for post in log.get('scheduled', []):
            record = {key: post.get(key) for key in ['postId', 'status', 'dueAt', 'sentAt']}
            record['platform'] = platform
            records_by_slug.setdefault(post.get('slug'), []).append(record)
            if post.get('status') not in ('scheduled', 'sending') or not post.get('postId') or not post.get('dueAt'):
                continue
            try:
                if not isinstance(post['dueAt'], str):
                    raise ValueError('Buffer dueAt must be an ISO timestamp')
                due = dt.datetime.fromisoformat(post['dueAt'].replace('Z', '+00:00'))
                if due.tzinfo is None:
                    raise ValueError('Buffer dueAt requires a time zone')
                if due <= now:
                    due_ids.add(post['postId'])
            except (ValueError, TypeError):
                record['dueTimeInvalid'] = True
    return records_by_slug, sorted(due_ids)


def summary():
    now = dt.datetime.now(dt.timezone.utc)
    day = now.astimezone(ZoneInfo('America/Los_Angeles')).date().isoformat()
    config = read(ROOT / 'ops/business-reel-queue.json', {})
    ledger = read(STATE / 'ledger.json', {})
    slugs = set(config.get('slugs', []))
    for key in ['queuedTopics', 'inProgressTopics']:
        slugs.update(item['slug'] for item in ledger.get(key, []) if item.get('slug'))
    topics = []
    records_by_slug, due_ids = buffer_delivery_records(ROOT, now)
    handoff = read(STATE / 'production/handoffs' / f'{day}.json', {})
    for slug in sorted(slugs):
        records = records_by_slug.get(slug, [])
        release = read(ROOT / 'video/out' / slug / 'release-qa.json', {})
        progress = read(STATE / 'production/topics' / f'{slug}.json', {})
        topics.append({'slug': slug, 'stage': progress.get('status', 'not-started'),
                       'releaseReady': release.get('readyForPosting', False),
                       'log': progress.get('log'), 'detail': progress.get('detail'),
                       'buffer': records})
    return {'pacificDate': day, 'checkedAt': now.isoformat(),
            'productionLease': lease_state(STATE / 'production/runner.lock'),
            'ttsLease': lease_state(Path('/tmp/fused-chatterbox-worker.lock')),
            'handoff': handoff,
            'queue': read(STATE / 'production/runs' / day / 'queue.json', {}),
            'targetRendersPerDay': config.get('targetRendersPerDay', 2),
            'topics': topics, 'duePostIds': sorted(set(due_ids))}

if __name__ == '__main__':
    print(json.dumps(summary(), indent=2))
