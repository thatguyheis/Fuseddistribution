import assert from 'node:assert/strict';
import test from 'node:test';
import { publishPlan, schedule, allScheduled } from './publishing.js';

const plan = () => publishPlan({caption:'Find the mint mark',youtube_title:'Mint marks',channels:['youtube','facebook'],due_at:new Date(Date.now()+3600000).toISOString()});
test('normalizes browser time for the scheduling API and validates channels', () => {
  assert.match(plan().due_at, /:\d{2}Z$/);
  assert.throws(()=>publishPlan({...plan(),youtube_title:''}), /YouTube title/);
  assert.throws(()=>publishPlan({...plan(),channels:[]}), /Choose channels/);
  assert.throws(()=>publishPlan({...plan(),due_at:new Date().toISOString()}), /15 minutes/);
});
test('partial retry keeps receipts and reuses the staged video for outstanding channels', async () => {
  const approved = plan();
  const youtube = {service:'youtube',status:'scheduled',post_id:'first'};
  const publication = {videoId:'same-video',posts:[youtube,{service:'facebook',status:'rejected'}]};
  const env = {C1994_PUBLISH_TOKEN:'test',PUBLISHER:{async fetch(req) {
    assert.equal(req.headers.get('host'), new URL(req.url).host);
    const {params} = await req.json();
    assert.deepEqual(params.arguments.channels,['facebook']);
    assert.equal(params.arguments.video_id,publication.videoId);
    const result = {video_id:publication.videoId,posts:[{service:'facebook',status:'sending',post_id:'second'}]};
    return Response.json({id:1,result:{content:[{type:'text',text:JSON.stringify(result)}]}});
  }}};
  assert.equal(allScheduled(approved,publication.posts),false);
  const posts=await schedule(env,publication,approved);
  assert.deepEqual(posts[0],youtube);
  assert.equal(allScheduled(approved,posts),true);
  assert.deepEqual(await schedule({}, {...publication,posts}, approved),posts);
});
