import test from 'node:test';import assert from 'node:assert/strict';
import {engagementErrors} from '../video/scripts/engagement-policy.mjs';
import {parseReelScript} from '../video/scripts/parse-script.mjs';
import {ctaCaption,assertCtaOrder,nextSlot} from '../public/blog/scripts/lib/cta-rotation.mjs';
const question='Silver coins or bars: which do you prefer?';
const script={engagementPolicy:1,contentKind:'educate',segments:[{type:'question',engagementBeat:true,startSec:100,endSec:112,text:question,narration:question}]};
test('new policy requires a short spoken engagement ending, legacy stays valid',()=>{assert.deepEqual(engagementErrors(script),[]);assert.deepEqual(engagementErrors({segments:[]}),[]);assert.ok(engagementErrors({...script,segments:[{...script.segments[0],engagementBeat:false}]}).length);assert.ok(engagementErrors({...script,segments:[{...script.segments[0],endSec:120}]}).length);assert.ok(engagementErrors({...script,segments:[{...script.segments[0],narration:'Read the article.'}]}).length)});
test('parser preserves policy and beat without leaking metadata into narration',()=>{const parsed=parseReelScript(`# Reel Script: test\nformat: long-form\nengagement-policy: 1\ncontent-kind: opinion\n\n---\n\n## QUESTION\n\n**Duration:** 12s minimum\nText: ${question}\nEngagement-beat: debate\nNarration: ${question}\n`,'test');assert.equal(parsed.engagementPolicy,1);assert.equal(parsed.contentKind,'opinion');assert.equal(parsed.segments[0].engagementBeat,true);assert.equal(parsed.segments[0].narration,question)});
test('CTA cycle wraps, is channel isolated and checks both neighbors',()=>{assert.equal(nextSlot(null),'reserve');assert.equal(nextSlot('reserve'),'newsletter');assert.equal(nextSlot('newsletter'),'engagement');assert.equal(nextSlot('engagement'),'reserve');const job={slug:'s',channelId:'a',dueAt:'2026-10-02T20:00:00Z',cta_slot:'newsletter',createPostPayload:{text:ctaCaption({title:'Silver',question,brand:'silver',slot:'newsletter',maxLength:280})}};assert.doesNotThrow(()=>assertCtaOrder(job,[{channelId:'a',dueAt:'2026-10-02T19:00:00Z',cta_slot:'reserve'},{channelId:'b',dueAt:'2026-10-02T19:30:00Z',cta_slot:'newsletter'}]));assert.throws(()=>assertCtaOrder(job,[{channelId:'a',dueAt:'2026-10-02T19:00:00Z',cta_slot:'newsletter'}]),/preceding/);assert.throws(()=>assertCtaOrder(job,[{channelId:'a',dueAt:'2026-10-02T21:00:00Z',cta_slot:'reserve'}]),/following/)});
test('engagement captions contain no link and newsletter matches vertical',()=>{assert.ok(!ctaCaption({title:'Silver',question,slot:'engagement'}).includes('https:'));assert.match(ctaCaption({title:'Business',question:'Website or profile: what drives your leads?',brand:'tech',slot:'newsletter'}),/newsletter\/tech\//);assert.throws(()=>assertCtaOrder({slug:'s',channelId:'a',dueAt:'2026-10-02',cta_slot:'engagement',createPostPayload:{text:'https://example.com'}},[]),/cannot contain links/)});

import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {rotateQueue} from '../public/blog/scripts/lib/cta-rotation.mjs';
test('reviewed caption repair is source-bound and leaves narration inputs untouched',()=>{
  const root=mkdtempSync(join(tmpdir(),'fused-cta-review-'));
  mkdirSync(join(root,'public/blog/example'),{recursive:true});
  mkdirSync(join(root,'ops/engagement'),{recursive:true});
  const source=JSON.stringify({discussion_question:'Legacy incomplete wording'});
  writeFileSync(join(root,'public/blog/example/social-copy.json'),source);
  writeFileSync(join(root,'public/blog/example/meta.json'),JSON.stringify({title:'Example',brand:'silver'}));
  writeFileSync(join(root,'ops/engagement/cta-question-overrides.json'),JSON.stringify({example:{reviewedBy:'Codex',socialCopySha256:createHash('sha256').update(source).digest('hex'),question}}));
  const queue=()=>({selected:[{slug:'example',channelId:'test',dueAt:'2026-10-04T20:00:00Z',createPostPayload:{}}]});
  assert.match(rotateQueue(queue(),root,[]).selected[0].text,/Silver coins or bars/);
  writeFileSync(join(root,'public/blog/example/social-copy.json'),JSON.stringify({discussion_question:'Changed source?'}));
  assert.throws(()=>rotateQueue(queue(),root,[]),/renewed editorial review/);
});

test('commercial CTA keeps technology traffic on the technology inquiry path',()=>{
  const text=ctaCaption({title:'Website handover',question:'Who can recover your business accounts?',brand:'tech',slot:'reserve'});
  assert.match(text,/fuseddistribution\.com\/#contact/);assert.doesNotMatch(text,/\/reserve\//);
  const job={slug:'website-handover',channelId:'a',dueAt:'2026-10-05T20:00:00Z',cta_slot:'reserve',cta_brand:'tech',createPostPayload:{text}};
  assert.doesNotThrow(()=>assertCtaOrder(job,[]));
  assert.throws(()=>assertCtaOrder({...job,createPostPayload:{text:'https://fuseddistribution.com/reserve/'}},[]));
  assert.match(ctaCaption({title:'Silver',question,brand:'silver',slot:'reserve'}),/\/reserve\//);
});


test('reserve CTA validates parsed destinations instead of URL substrings',()=>{
  const job={slug:'cta',channelId:'a',dueAt:'2026-10-23T20:00:00Z',cta_slot:'reserve'};
  const check=(brand,text)=>assertCtaOrder({...job,cta_brand:brand,createPostPayload:{text}},[]);
  for (const [brand,destination] of [['silver','https://fuseddistribution.com/reserve/'],['tech','https://fuseddistribution.com/#contact']]) {
    assert.doesNotThrow(()=>check(brand,`Learn more: ${destination}`));
    assert.doesNotThrow(()=>check(brand,`https://[invalid ${destination}`));
    for (const invalid of [
      `https://evil.example/path/${destination}`,
      `https://evil.example/?next=${destination}`,
      destination.replace('fuseddistribution.com','fuseddistribution.com.evil.example'),
      destination.replace('fuseddistribution.com','fuseddistribution.com@evil.example'),
      destination.replace('https:','http:'),
      'https://[invalid',
      'No destination'
    ]) assert.throws(()=>check(brand,invalid),{message:'Reserve CTA destination missing'},invalid);
  }
  assert.doesNotThrow(()=>check('silver','https://fuseddistribution.com/reserve/coins?source=social#details'));
  assert.throws(()=>check('silver','https://fuseddistribution.com/reserve-other/'),{message:'Reserve CTA destination missing'});
  assert.throws(()=>check('silver','https://fuseddistribution.com/reserve/../other/'),{message:'Reserve CTA destination missing'});
  for (const suffix of ['extra','?next=other']) {
    assert.throws(()=>check('tech',`https://fuseddistribution.com/#contact${suffix}`),{message:'Reserve CTA destination missing'});
  }
  assert.throws(()=>check('tech','https://fuseddistribution.com:444/#contact'),{message:'Reserve CTA destination missing'});
  assert.throws(()=>check('silver','https://fuseddistribution.com/#contact'),{message:'Reserve CTA destination missing'});
});
