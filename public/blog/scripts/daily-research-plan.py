"""Persist intended production before inference; never grant publication approval."""
import datetime
import json
import pathlib
import re
import sys


def save_plan(directory, day, topics):
    if len(topics) != 4 or not all(topic.strip() for topic in topics):
        raise ValueError('Exactly four nonempty topics are required')
    datetime.date.fromisoformat(day)
    path = pathlib.Path(directory) / f'{day}-plan.json'
    plan = {
        'date': day,
        'status': 'intended_production_requires_editorial_review',
        'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'posts': [
            {'slug': re.sub(r'[^a-z0-9]+', '-', topic.lower()).strip('-')[:55],
             'keyword': topic, 'brand': 'silver' if i < 2 else 'tech'}
            for i, topic in enumerate(topics)
        ],
    }
    try:
        with path.open('x') as handle:
            json.dump(plan, handle, indent=2)
            handle.write('\n')
    except FileExistsError:
        existing = json.loads(path.read_text())
        if existing.get('date') != day or len(existing.get('posts', [])) != 4:
            raise ValueError('Existing daily plan is malformed; owner review required')
    return path


if __name__ == '__main__':
    save_plan(sys.argv[1], sys.argv[2], sys.argv[3:])
