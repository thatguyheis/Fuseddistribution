import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationOutputProfile} from './presentation-output-profile.mjs';

test('business presentation metadata selects 1080p without altering the coin profile', () => {
  const business = presentationOutputProfile({profile: 'business-growth-v1'});
  assert.equal(business.compositionId, 'BusinessGrowthPresentation');
  assert.deepEqual(business.outputDimensions, {width: 1080, height: 1920});
  assert.equal(business.profile, 'business-growth-v1');
  assert.equal(business.sizeFitThreshold, 50_000_000);
  assert.equal(business.highQualityFlags, true);

  const coin = presentationOutputProfile({profile: null});
  assert.equal(coin.compositionId, 'BlogReel');
  assert.deepEqual(coin.outputDimensions, {width: 720, height: 1280});
  assert.equal(coin.qualityProfile, 'presentation-720p-crf20-slow');
  assert.equal(coin.sizeFitThreshold, 45_000_000);
});

test('standard output remains canonical 720p and unknown profiles fail closed', () => {
  assert.deepEqual(presentationOutputProfile(null).outputDimensions, {width: 720, height: 1280});
  assert.throws(() => presentationOutputProfile({profile: 'unexpected'}), /Unsupported presentation profile/);
});
