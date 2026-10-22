import test from 'node:test';import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdtempSync,writeFileSync,readFileSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';
test('one-shot launch configuration disables restarts and validates labels',()=>{
const r=spawnSync('python3',['-c',`import importlib.util
s=importlib.util.spec_from_file_location('once','scripts/launch-once.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
c=m.job_config('com.test',['/usr/bin/true'],'/tmp/test.log');assert c['RunAtLoad'] is True and c['KeepAlive'] is False
try: m.job_config('../escape',['true'],'/tmp/log')
except ValueError: pass
else: raise AssertionError('unsafe label accepted')`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('Instagram rejects revoked music inherited from a prior source queue',()=>{
const dir=mkdtempSync(join(tmpdir(),'ig-rights-'));const src=join(dir,'source.json'),out=join(dir,'out.json');writeFileSync(src,JSON.stringify({expiresAt:new Date(Date.now()+60000).toISOString(),selected:[{slug:'electric-vehicle-silver-demand-explained',publicMediaUrl:'https://example.com/reel.mp4'}]}));
const r=spawnSync(process.execPath,['public/blog/scripts/prepare-buffer-instagram-queue.mjs','--current-scheduled=0',`--source-queue=${src}`,`--source-scheduled-log=${join(dir,'none')}`,`--scheduled-log=${join(dir,'none')}`,`--out=${out}`,'--skip-media-url-verification'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const q=JSON.parse(readFileSync(out));assert.equal(q.selected.length,0);assert.equal(q.blocked[0].reason,'source_render_audio_rights_blocked');
});

test('superseded retry exits without loading an obsolete schedule',()=>{
const dir=mkdtempSync(join(tmpdir(),'retry-superseded-'));const plist=join(dir,'retry.plist'),log=join(dir,'run.log');
const make=spawnSync('python3',['-c',`import plistlib,sys
with open(sys.argv[1],'wb') as f: plistlib.dump({'EnvironmentVariables':{'BLOG_RUN_DATE':'2026-09-28'},'StartCalendarInterval':{'Hour':9,'Minute':40}},f)`,plist],{encoding:'utf8'});assert.equal(make.status,0,make.stderr);
const r=spawnSync('/bin/zsh',['scripts/reload-retry-launchagent.sh','--wait-pid','2147483647','--label','com.test.must-not-load','--plist',plist,'--expected-date','2026-09-26','--expected-hour','9','--expected-minute','30','--log-file',log],{encoding:'utf8',timeout:5000});assert.equal(r.status,0,r.stderr);assert.match(readFileSync(log,'utf8'),/RETRY RELOAD SUPERSEDED/);
});
