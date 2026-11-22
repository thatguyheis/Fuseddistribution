"""Reproduce two labeled teaching examples without a model or network calls."""
from pathlib import Path
import hashlib,json,platform,re
BASE=Path(__file__).resolve().parent
SOURCE=Path('/Users/nick/Documents/ChatGPT/Fused Tech Reels/work/2026-11-22-tech-01/reel-T-06/audio-fused-chatterbox-standard-expressive-v1')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def contact_check(text):
 try:obj=json.loads(text)
 except json.JSONDecodeError as error:return {'parses':False,'contractPass':False,'reason':error.msg}
 if not isinstance(obj,dict):return {'parses':True,'contractPass':False,'reason':'Expected an object'}
 if not all(isinstance(obj.get(k),str) and obj[k].strip() for k in ('name','email')):return {'parses':True,'contractPass':False,'reason':'name and email must be nonempty strings'}
 return {'parses':True,'contractPass':True,'reason':'Required fields and string types present; does not verify email deliverability or consent'}
cases=[('prose_wrapped','Here is your contact: {"name":"Alex Example","email":"alex@example.com"}'),('missing_field','{"name":"Alex Example"}'),('wrong_type','{"name":"Alex Example","email":42}'),('matching_contract','{"name":"Alex Example","email":"alex@example.com"}')]
results=[{'case':name,'input':value,**contact_check(value)} for name,value in cases]
assert [r['parses'] for r in results]==[False,True,True,True]
assert [r['contractPass'] for r in results]==[False,False,False,True]
(BASE/'json-contract-results.json').write_text(json.dumps({'classification':'Hand-authored synthetic fixtures, not captured AI output or a model benchmark','python':platform.python_version(),'contract':{'name':'nonempty string','email':'nonempty string; no address or deliverability validation'},'results':results},indent=2)+'\n')
words=SOURCE/'seg-10.words.json';audio=SOURCE/'seg-10.wav';provenance=SOURCE/'seg-10.words-source.json'
source=json.loads(provenance.read_text());assert sha(audio)==source['audioSha256']
data=json.loads(words.read_text());expected='Label the units before asking AI to calculate.';heard=' '.join(w['text'] for w in data['words']);norm=lambda s:re.sub('[^a-z0-9]','',s.lower());assert norm(expected)==norm(heard)
shift=1.0
late=[dict(w,startSec=round(w['startSec']+shift,3),endSec=round(w['endSec']+shift,3)) for w in data['words']]
assert all(a['text']==b['text'] for a,b in zip(data['words'],late))
assert all(abs(b['startSec']-a['startSec']-shift)<1e-9 for a,b in zip(data['words'],late))
(BASE/'caption-offset-results.json').write_text(json.dumps({'classification':'Actual existing recognized words; deliberately shifted teaching track, not an observed Whisper failure','expected':expected,'heard':heard,'wordSequenceMatches':True,'originalAudio':str(audio),'audioSha256':sha(audio),'wordsSha256':sha(words),'provenanceSha256':sha(provenance),'recognizerModelRevision':source['modelRevision'],'audioDuration':data['duration'],'deliberateOffsetSeconds':shift,'originalWords':data['words'],'delayedWords':late,'limits':'Original timestamps are recognizer estimates, not independently measured ground truth. Compare original audio and actual encoded sample before production approval. One second is the imposed offset, not a measured model error.'},indent=2)+'\n')
print('PASS: four parser/contract cases; eight unchanged words with a deliberate 1.0 second shift; audio hash matches recognition provenance.')
if __name__=='__main__':pass
