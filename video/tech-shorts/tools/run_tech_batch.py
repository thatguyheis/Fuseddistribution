#!/usr/bin/env python3
"""One dated, approved Fused tech batch. No posting, deploying, or queue edits."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import argparse,fcntl,hashlib,json,os,re,signal,subprocess,sys,time
BASE=Path(__file__).resolve().parent.parent
REPO=Path(json.loads((BASE/'project.json').read_text())['repo']).resolve()
PYTHON='/Users/nick/.venvs/chatterbox/bin/python3'
PACIFIC=ZoneInfo('America/Los_Angeles')
active=None

def atomic(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_name(path.name+f'.{os.getpid()}.tmp');temporary.write_text(json.dumps(value,indent=2)+'\n');os.replace(temporary,path)
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def now():return datetime.now(PACIFIC)
def stop_child():
    global active
    if active is None or active.poll() is not None:return
    os.killpg(active.pid,signal.SIGTERM)
    try:active.wait(timeout=20)
    except subprocess.TimeoutExpired:os.killpg(active.pid,signal.SIGKILL);active.wait()
def on_signal(signum,frame):stop_child();raise SystemExit(128+signum)
signal.signal(signal.SIGTERM,on_signal);signal.signal(signal.SIGINT,on_signal)
def coin_heavy_active():
    text=subprocess.check_output(['ps','-axo','pid=,command='],text=True)
    return any(re.search(r'c1994_video(?:_v2)?\.py\s+(tts|render)\s',line) for line in text.splitlines())
def run_stage(args,log,lease):
    global active
    env=os.environ.copy();env['FUSED_TECH_LEASE_FD']=str(lease.fileno());os.set_inheritable(lease.fileno(),True)
    with log.open('a') as stream:
        stream.write('\n'+datetime.now().isoformat()+' '+repr(args)+'\n');stream.flush()
        active=subprocess.Popen(args,stdout=stream,stderr=subprocess.STDOUT,env=env,pass_fds=(lease.fileno(),),start_new_session=True)
        code=active.wait();active=None
    if code:raise RuntimeError(f'Stage exited {code}; inspect {log}')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('batch');parser.add_argument('--date',required=True);parser.add_argument('--dry-run',action='store_true');parser.add_argument('--allow-daytime',action='store_true');args=parser.parse_args()
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}-tech-\d{2}',args.batch):raise ValueError('Invalid batch id')
    work=BASE/'work'/args.batch;work.mkdir(parents=True,exist_ok=True);status=work/'run-status.json'
    state={'batch':args.batch,'productionDate':args.date,'status':'preflight','results':[]}
    def save(value,**extra):state.update(status=value,updatedAt=now().isoformat(),**extra);atomic(status,state)
    approved=BASE/'Approved'/args.batch;approval_path=approved/'approval.json';package_path=approved/'reels.json'
    if not approval_path.exists() or not package_path.exists():save('awaiting_owner_idea_approval');print(json.dumps(state));return 2
    approval=json.loads(approval_path.read_text());package=json.loads(package_path.read_text())
    if approval.get('approvedBy')!='Nick' or approval.get('packageSha256')!=sha(package_path) or approval.get('productionDate')!=args.date:save('blocked_stale_approval');return 2
    ids=[x['id'] for x in package['reels']]
    if approval.get('scope')=='first-preview':ids=ids[:1]
    elif approval.get('scope')=='selected-topics':
        if ids!=approval.get('approvedIds') or not ids or len(ids)!=len(set(ids)):
            save('blocked_selected_topic_scope');return 2
    elif approval.get('scope')!='all-three':save('blocked_unknown_approval_scope');return 2
    if args.allow_daytime and not (approval.get('scope')=='first-preview' or (approval.get('scope')=='selected-topics' and approval.get('manualGeneration') is True)):
        save('blocked_manual_scope');return 2
    state['manualPreview']=args.allow_daytime
    if args.dry_run:
        for identity in ids:subprocess.run([PYTHON,str(BASE/'tools/fused_tech_video.py'),'prep',args.batch,identity],check=True)
        save('ready_for_manual_preview' if args.allow_daytime else 'ready_for_dated_overnight_run',ids=ids,approvalScope=approval['scope']);print(json.dumps(state));return 0
    if now().date().isoformat()!=args.date:save('blocked_wrong_production_date');return 2
    for identity in ids:
        checkpoint=work/(identity+'-checkpoint.json');old=json.loads(checkpoint.read_text()) if checkpoint.exists() else {}
        if old.get('status')=='failed_checkpoint_preserved' and old.get('packageSha256')==sha(package_path):
            state['results'].append({'id':identity,'status':'failed_checkpoint_preserved','error':'Unchanged failure was not retried'})
            save('topic_skipped_unchanged_failure');continue
        lease=(REPO/'.workflow-state/business-growth-ai-365/production/runner.lock').open('a+')
        legacy=Path('/tmp/fused-remotion-render.lock');owned=False
        try:
            while True:
                if now().date().isoformat()!=args.date or (now().hour>=6 and not args.allow_daytime):save('deferred_window',currentId=identity);return 2
                try:fcntl.flock(lease.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
                except BlockingIOError:save('waiting_for_production_owner',currentId=identity);time.sleep(15);continue
                if legacy.exists() or coin_heavy_active():
                    fcntl.flock(lease.fileno(),fcntl.LOCK_UN);save('waiting_for_shared_render_owner',currentId=identity);time.sleep(15);continue
                try:legacy.mkdir()
                except FileExistsError:fcntl.flock(lease.fileno(),fcntl.LOCK_UN);continue
                (legacy/'pid').write_text(str(os.getpid()));owned=True;break
            log=work/(identity+'.log');record=work/f'reel-{identity}'/'render-record.json'
            current=old.get('packageSha256')==sha(package_path) and old.get('status')=='automated_checks_passed_review_required' and record.exists()
            if current:
                data=json.loads(record.read_text());current=Path(data['file']).exists() and sha(data['file'])==data['sha256']
            if current:
                state['results'].append({'id':identity,'status':'already_current','file':data['file']});save('topic_current');continue
            for stage in ['prep','tts','whisper','render','qa']:
                save('running_'+stage,currentId=identity)
                reusable=False
                if stage=='render' and record.exists():
                    previous=json.loads(record.read_text())
                    reusable=previous.get('packageSha256')==sha(package_path) and previous.get('status')=='encoded-review-required' and Path(previous['file']).exists() and sha(previous['file'])==previous['sha256']
                if not reusable:run_stage([PYTHON,str(BASE/'tools/fused_tech_video.py'),stage,args.batch,identity],log,lease)
                atomic(checkpoint,{'id':identity,'packageSha256':sha(package_path),'lastStage':stage,'status':'in_progress','updatedAt':now().isoformat()})
            data=json.loads(record.read_text());result={'id':identity,'status':'automated_checks_passed_review_required','file':data['file'],'sha256':data['sha256']}
            atomic(checkpoint,{**result,'packageSha256':sha(package_path),'updatedAt':now().isoformat()});state['results'].append(result);save('topic_encoded_review_required')
        except Exception as error:
            stop_child();result={'id':identity,'status':'failed_checkpoint_preserved','error':str(error)};state['results'].append(result);atomic(checkpoint,{**result,'packageSha256':sha(package_path),'updatedAt':now().isoformat()});save('topic_failed_continue')
        finally:
            stop_child()
            if owned and legacy.exists() and (legacy/'pid').read_text().strip()==str(os.getpid()):
                archive=Path('/tmp')/f'fused-tech-released-lock-{os.getpid()}-{time.time_ns()}'
                legacy.rename(archive)
            lease.close()
        if approval['scope']=='first-preview':
            failed=state['results'][-1]['status']=='failed_checkpoint_preserved'
            save('preview_generation_failed' if failed else 'awaiting_first_preview_review')
            print(json.dumps(state));return 1 if failed else 0
    save('completed_review_required' if all(x['status']!='failed_checkpoint_preserved' for x in state['results']) else 'completed_with_failures')
    print(json.dumps(state));return 0 if state['status']=='completed_review_required' else 1
if __name__=='__main__':raise SystemExit(main())
