import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const slug='how-to-choose-pvc-free-flips-for-silver-coins';
function build(graphic){
 const dir=mkdtempSync(join(tmpdir(),'blog-graphic-'));
 const meta=JSON.parse(readFileSync(`public/blog/${slug}/meta.json`));
 if(graphic===undefined)delete meta.contentGraphic;else meta.contentGraphic=graphic;
 writeFileSync(join(dir,'meta.json'),JSON.stringify(meta));
 const out=join(dir,'index.html');
 const run=spawnSync(process.execPath,['public/blog/scripts/build-html.mjs',`--slug=${slug}`,`--meta=${join(dir,'meta.json')}`,`--out=${out}`],{encoding:'utf8'});
 return {run,html:run.status===0?readFileSync(out,'utf8'):null};
}
test('source graphic renders escaped text, never executable markup',()=>{
 const {run,html}=build({label:'A "label"',rows:[{condition:'<script>unsafe</script>',action:'A & B'}]});
 assert.equal(run.status,0,run.stderr);assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert.ok(!html.includes('<script>unsafe</script>'));assert.ok(html.includes('A &amp; B'));
});
test('malformed graphic fails; existing packages without graphic still build',()=>{
 assert.notEqual(build({label:'invalid',rows:[]}).run.status,0);
 assert.equal(build(undefined).run.status,0);
});
