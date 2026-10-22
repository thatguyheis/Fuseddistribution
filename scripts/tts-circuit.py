"""Persistent local TTS circuit. New topics do not reset runtime failures."""
import argparse,datetime,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent

def transition(state, key, action):
    value=dict(state) if state.get('runtimeHash')==key else {'runtimeHash':key,'consecutiveFailures':0}
    if action=='failure':value['consecutiveFailures']+=1
    if action=='success':value['consecutiveFailures']=0;value['holdReason']=''
    elif state.get('holdReason'):value['holdReason']=state['holdReason']
    if action=='hold':value['holdReason']='Measured narration preflight failed; supervised runtime repair required'
    value['blocked']=value['consecutiveFailures']>=2 or bool(value.get('holdReason'))
    return value

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['check','failure','success','hold']);p.add_argument('--voice',default='chatterbox',choices=['chatterbox','chatterbox-standard','zoe','coqui']);p.add_argument('--root',type=pathlib.Path,default=ROOT);a=p.parse_args()
    path=a.root/'.workflow-state'/f'tts-circuit-{a.voice}.json'
    key=hashlib.sha256(b''.join((a.root/f).read_bytes() for f in ['video/scripts/generate-audio.mjs','video/scripts/chatterbox-tts.py','video/scripts/tts_chunks.py','video/scripts/tts_settings.py','video/tts-runtime.json'] if (a.root/f).exists())+a.voice.encode()+__import__('os').environ.get('CHATTERBOX_TTS_VARIANT','').encode()).hexdigest()
    state=json.loads(path.read_text()) if path.exists() else {}
    updated=transition(state,key,a.action)
    if a.action!='check':
        path.parent.mkdir(parents=True,exist_ok=True);updated['updatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();path.write_text(json.dumps(updated,indent=2)+'\n')
    print(json.dumps(updated));return 1 if updated['blocked'] else 0
if __name__=='__main__':raise SystemExit(main())
