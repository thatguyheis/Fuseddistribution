"""Input keyed publisher retry decisions; no network or scheduler mutations."""
import argparse
import datetime
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def fingerprint(root, day):
    paths = [root/f'public/blog/research/{day}-{kind}.json' for kind in ['queue', 'plan']]
    paths.append(root/'public/blog/data/topic-pool.json')
    queue = paths[0]
    if queue.exists():
        for post in json.loads(queue.read_text()).get('posts', []):
            paths += [root/'public/blog'/post['slug']/name for name in ['qa.json', 'verified.md']]
    h = hashlib.sha256()
    for path in paths:
        h.update(str(path.relative_to(root)).encode());h.update(path.read_bytes() if path.exists() else b'missing')
    return h.hexdigest()


def decide(previous, key, action, reason=''):
    state = dict(previous) if previous.get('inputHash') == key else {'inputHash':key,'attempts':0}
    if action == 'check':return state.get('status') != 'owner_required', state
    if action == 'block':
        state.update(status='owner_required',reason=reason);return False,state
    if state.get('status') == 'owner_required':return False,state
    state['attempts'] += 1
    allowed = state['attempts'] <= 2
    state.update(status='transient_retry' if allowed else 'owner_required',reason='transient_retry' if allowed else 'retry_budget_exhausted')
    return allowed,state


def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['check','block','transient']);p.add_argument('day');p.add_argument('--reason',default='missing_approved_input');p.add_argument('--root',type=pathlib.Path,default=ROOT);a=p.parse_args()
    datetime.date.fromisoformat(a.day)
    path=a.root/'.workflow-state/publisher-retry'/f'{a.day}.json'
    old=json.loads(path.read_text()) if path.exists() else {}
    allowed,state=decide(old,fingerprint(a.root,a.day),a.action,a.reason)
    if a.action!='check' and state!=old:
        path.parent.mkdir(parents=True,exist_ok=True);state['updatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();path.write_text(json.dumps(state,indent=2)+'\n')
    print(json.dumps({'allowed':allowed,**state}));return 0 if allowed else 1


if __name__=='__main__':raise SystemExit(main())
