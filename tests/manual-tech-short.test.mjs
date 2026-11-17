import test from 'node:test';
import assert from 'node:assert/strict';
import {manualTechShortErrors} from '../public/blog/scripts/lib/manual-tech-short.mjs';

function fixture() {
  const narration = Array.from({length: 10}, (_, i) => `Sentence ${i}.`);
  const checks = Object.fromEntries(['captionRegression','decodedCaptionBands','decode','dimensions','fps',
    'videoCodec','audioCodec','avSync','size','loudness','truePeak','duration','hookStartsAtZero',
    'heroFirst','noAdditionalClipDuration'].map(key => [key,true]));
  const release = {profile:'fused-tech-short-v1',ownerApproval:{approvedBy:'Nick',generationRequest:'generate now',publicationRequest:'publish'},
    narration,approvedHook:narration[0],approvedCta:narration.at(-1),seconds:63,bytes:9_000_000,sha256:'a'.repeat(64),checks,
    visualReview:{sha256:'a'.repeat(64),noAccumulatedSubtitlesInInspectedFrames:true},
    speech:narration.map(expected => ({expected,heard:expected,score:1,issues:[]}))};
  return {release,narration};
}
test('approved manual short with complete evidence passes', () => {
  const {release,narration}=fixture();assert.deepEqual(manualTechShortErrors(release,narration),[]);
});
test('changed script and missing owner authorization fail', () => {
  const {release,narration}=fixture();delete release.ownerApproval.publicationRequest;
  assert.ok(manualTechShortErrors(release,[...narration.slice(0,9),'Different closing.']).length>=2);
});
test('failed captions, weak speech and wrong video binding fail', () => {
  const {release,narration}=fixture();release.checks.decodedCaptionBands=false;release.speech[3].score=.8;
  release.visualReview.sha256='b'.repeat(64);
  assert.equal(manualTechShortErrors(release,narration).length,3);
});
test('unmeasured or oversized exports fail', () => {
  const {release,narration}=fixture();release.seconds=NaN;release.bytes=25_000_000;
  assert.ok(manualTechShortErrors(release,narration).includes('invalid short media measurements'));
});
