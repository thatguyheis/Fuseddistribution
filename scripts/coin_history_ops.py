"""Deterministic queue and throughput reporting for the coin-history worker."""
import datetime as dt
import hashlib
import json
from pathlib import Path
from statistics import median
from zoneinfo import ZoneInfo


def package_is_prepared(root, entry):
    slug = entry.get('slug', '')
    if not slug or Path(slug).name != slug:
        return False
    work = root / 'content/coin-history' / slug
    blog = root / 'public/blog' / slug
    required = [work / 'research.json', work / 'claim-map.json', work / 'narration-v1-approved.txt',
                work / 'script-approval.json', blog / 'meta.json', blog / 'content-plan.json',
                blog / 'reel-script-approved.md', blog / 'image-sources.json']
    if not all(path.is_file() for path in required):
        return False
    try:
        approval = json.loads((work / 'script-approval.json').read_text())
        digest = hashlib.sha256((work / 'narration-v1-approved.txt').read_bytes()).hexdigest()
        return approval.get('transcriptApproved') is True and approval.get('approvedTranscriptSha256') == digest
    except (OSError, json.JSONDecodeError):
        return False


def queue_health(root, queue_items, state, target=3, timezone='America/Los_Angeles', now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    zone = ZoneInfo(timezone)
    pending, invalid, completed = [], [], []
    for entry in queue_items:
        record = state.get('items', {}).get(entry.get('slug'), {})
        if record.get('releaseReady') or record.get('status') == 'release_ready':
            completed.append(entry['slug'])
        elif package_is_prepared(root, entry):
            pending.append(entry['slug'])
        else:
            invalid.append(entry.get('slug', '<missing-slug>'))
    return {
        'checkedAt': now.isoformat(),
        'operatingDate': now.astimezone(zone).date().isoformat(),
        'target': target,
        'pendingPrepared': len(pending),
        'pendingSlugs': pending,
        'completedInQueue': len(completed),
        'invalidPackages': invalid,
        'status': 'low_queue' if len(pending) < target else 'healthy',
        'alert': len(pending) < target,
        'message': f'Coin history queue has {len(pending)} prepared packages; target is {target}.' if len(pending) < target else None,
    }


def throughput_report(state, target=3, timezone='America/Los_Angeles', now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    zone = ZoneInfo(timezone)
    cutoff = now - dt.timedelta(days=7)
    completed = []
    stages = {}
    daily = {}
    for slug, record in state.get('items', {}).items():
        stamp = record.get('completedAt')
        if not stamp:
            continue
        completed_at = dt.datetime.fromisoformat(stamp)
        if completed_at < cutoff:
            continue
        operating_date = completed_at.astimezone(zone).date().isoformat()
        daily[operating_date] = daily.get(operating_date, 0) + 1
        completed.append({'slug': slug, 'completedAt': stamp, 'attempts': record.get('attempts', 0), 'operatingDate': operating_date})
        for sample in record.get('stageMetrics', []):
            if sample.get('elapsedSeconds') is not None:
                stages.setdefault(sample.get('stage', 'unknown'), []).append(sample)
    stage_summary = {name: {'samples': len(values), 'medianSeconds': round(median([sample['elapsedSeconds'] for sample in values]), 2),
                            'passed': sum(sample.get('outcome') == 'passed' for sample in values),
                            'failed': sum(sample.get('outcome') == 'failed' for sample in values)} for name, values in stages.items()}
    today = now.astimezone(zone).date().isoformat()
    timestamps = [entry['completedAt'] for entry in completed]
    timestamp_precision = 'low' if len(timestamps) > 1 and len(set(timestamps)) < len(timestamps) else ('not-yet-measured' if not stage_summary else 'recorded')
    return {'checkedAt': now.isoformat(), 'windowDays': 7, 'dailyTarget': target,
            'todayCompletedPairs': daily.get(today, 0), 'targetMetToday': daily.get(today, 0) >= target,
            'completedPairs': completed, 'dailyCounts': daily, 'stageDurations': stage_summary,
            'completionTimestampQuality': timestamp_precision,
            'limitations': 'Counts recorded completed blog and release-ready reel pairs. Stage duration confidence depends on future worker measurements; historical imported timestamps may be shared.'}


def write_report(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)
