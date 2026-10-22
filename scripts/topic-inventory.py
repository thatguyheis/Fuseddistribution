"""Local topic inventory and category rotation. Never grants article approval."""
import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def slugify(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')[:55]


def inventory(pool, posts, plans=()):
    used = {p['slug'] for p in posts}
    used.update(p['slug'] for plan in plans for p in plan.get('posts', []))
    by_brand = {}
    for brand in ['silver', 'tech']:
        seen = set()
        available = []
        for index, topic in enumerate(t for t in pool['topics'] if t['brand'] == brand):
            slug = slugify(topic['keyword'])
            if slug not in used and slug not in seen:
                available.append(dict(topic, slug=slug, index=index))
                seen.add(slug)
        by_brand[brand] = available
    return by_brand


def select_topics(available, recent_categories=(), start=0):
    counts = collections.Counter(recent_categories)
    chosen = []
    # Prefer reviewed expansion topics, then the least recently represented category.
    remaining = list(available)
    while remaining and len(chosen) < 2:
        remaining.sort(key=lambda t: (t.get('status') != 'editorial-seed-reviewed',
                                      counts[t['category']], not t.get('preferredOwnerMedia', False),
                                      not t.get('preferredEducation', False), (t['index'] - start) % 10000))
        item = remaining.pop(0)
        chosen.append(item)
        counts[item['category']] += 100  # Different category for the second daily post.
    return chosen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=pathlib.Path, default=ROOT)
    parser.add_argument('--list', choices=['silver', 'tech'])
    parser.add_argument('--select', choices=['silver', 'tech'])
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--date', default=datetime.datetime.now().astimezone().date().isoformat())
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--plan', action='store_true')
    parser.add_argument('--unblock', action='store_true')
    args = parser.parse_args()
    root = args.root
    raw = (root/'public/blog/data/topic-pool.json').read_bytes()
    pool = json.loads(raw)
    if args.list:
        print('\n'.join(t['keyword'] for t in pool['topics'] if t['brand'] == args.list))
        return
    posts = json.loads((root/'public/blog/posts.json').read_text())
    research = root/'public/blog/research'
    plans = [json.loads(p.read_text()) for p in sorted(research.glob('*-plan.json'))]
    registry = root/'.workflow-state/canonical-topic-resolutions.json'
    if registry.exists():
        posts += [{'slug':x['queuedSlug']} for x in json.loads(registry.read_text()).get('resolutions', [])]
    available = inventory(pool, posts, plans)
    categories = {slugify(t['keyword']):t['category'] for t in pool['topics']}
    selected = {brand:select_topics(items, [categories.get(p['slug'], 'legacy') for p in posts[:20]], args.start)
                for brand, items in available.items()}
    summary = {'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'date':args.date,'poolHash':hashlib.sha256(raw).hexdigest(),
               'minimumUnusedPerBrand':pool['minimumUnusedPerBrand'],
               'brands':{b:{'unused':len(items),'daysRemaining':len(items)//2,
                            'low':len(items)<pool['minimumUnusedPerBrand'],
                            'categories':dict(collections.Counter(t['category'] for t in items))}
                         for b,items in available.items()}}
    if args.unblock:
        path=research/f'{args.date}-plan.json'
        if path.exists():
            blocked=json.loads(path.read_text())
            if (blocked.get('status')=='topic_inventory_blocked'
                and blocked.get('poolHash')!=summary['poolHash']
                and all(len(items)>=2 for items in available.values())):
                archive=research/'attempts';archive.mkdir(exist_ok=True)
                path.rename(archive/f'{args.date}-inventory-block-{datetime.datetime.now().timestamp()}.json')
        return
    if args.write:
        path=root/'.workflow-state/topic-inventory.json';path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(summary,indent=2)+'\n')
    if args.select and len(selected[args.select])<2:
        path=research/f'{args.date}-plan.json'
        if not path.exists():
            path.write_text(json.dumps({'date':args.date,'status':'topic_inventory_blocked','poolHash':summary['poolHash'],
                                       'reason':f'Fewer than two unused {args.select} topics','posts':[]},indent=2)+'\n')
        raise SystemExit('Topic inventory exhausted; dated blocked plan saved; owner replenishment required')
    if args.plan:
        path=research/f'{args.date}-plan.json'
        if path.exists():
            print(path.read_text());return
        if any(len(items)<2 for items in selected.values()):raise SystemExit('Insufficient inventory')
        value={'date':args.date,'status':'planned','approval':False,
               'posts':[t for b in ['silver','tech'] for t in selected[b]]}
        with path.open('x') as out:out.write(json.dumps(value,indent=2)+'\n')
        print(json.dumps(value,indent=2));return
    if args.select: print(*(t['index'] for t in selected[args.select]))
    else: print(json.dumps(summary,indent=2))


if __name__ == '__main__':
    main()
