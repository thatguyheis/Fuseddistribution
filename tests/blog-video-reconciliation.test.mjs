import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPublishedVideos, youtubeId, patchVideoPanel, videoPanel, hasPlayer, panelPattern } from '../scripts/lib/blog-video-reconciliation.mjs';
const now=Date.parse('2026-10-05T12:00:00Z');
const sent={slug:'same-topic',status:'sent',viewPostUrl:'https://www.youtube.com/shorts/abcdefghijk',sentAt:'2026-10-01T12:00:00Z'};
test('scheduled, future, malformed and off-domain links do not become published embeds',()=>{
 for(const patch of [{status:'scheduled'},{sentAt:'2026-10-06T00:00:00Z'},{slug:'../../escape'},{viewPostUrl:'https://youtube.com.evil.test/shorts/abcdefghijk'}])assert.equal(selectPublishedVideos({}, {scheduled:[{...sent,...patch}]},now).size,0);
 assert.equal(youtubeId('https://youtube.com/watch?v=abcdefghijk&feature=share'),'abcdefghijk');
});
test('fresh sent snapshots fill historical log gaps; stale snapshots cannot add claims',()=>{
 const snapshot={source:'buffer_api',capturedAt:'2026-10-05T01:00:00Z',posts:[{platform:'youtube',slug:sent.slug,externalLink:sent.viewPostUrl,sentAt:sent.sentAt}]};
 assert.equal(selectPublishedVideos(snapshot,{},now).size,1);
 assert.equal(selectPublishedVideos({...snapshot,capturedAt:'2026-09-01T00:00:00Z'},{},now).size,0);
});
test('panel repair preserves all surrounding article bytes and is idempotent',()=>{
 const video={kind:'youtube',id:'abcdefghijk'};
 const html='<main><div class="article-body"><p>Reviewed opening.</p><!-- SOCIAL_VIDEO_START --><p>Pending</p><!-- SOCIAL_VIDEO_END --><h2>Facts</h2></div></main>';
 const panel=videoPanel('same-topic','Title <safe>',video), next=patchVideoPanel(html,panel);
 assert.equal(next.replace(panelPattern,''),html.replace(panelPattern,''));
 assert.equal(patchVideoPanel(next,panel),next);assert.equal(hasPlayer(next),true);assert.equal(hasPlayer(html),false);
 assert.match(next,/Title &lt;safe&gt;/);
});
test('missing markers insert without changing prose; ambiguous structure fails closed',()=>{
 const html='<div class="article-body"><p>First.</p><p>Second.</p>';
 const panel=videoPanel('topic','Title',{kind:'youtube',id:'abcdefghijk'});
 assert.equal(patchVideoPanel(html,panel).replace(panelPattern,''),html);
 assert.throws(()=>patchVideoPanel('<article>unknown</article>',panel));
 assert.throws(()=>patchVideoPanel(panel+panel,panel));
});
