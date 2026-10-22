import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyVisionResult} from '../scripts/review-coin-photo-library.mjs';

test('image review only emits a suggested ID from specific visible evidence', () => {
  assert.deepEqual(classifyVisionResult({
    visibleCoin: true,
    suggestedIdentification: '2021 American Silver Eagle',
    evidenceType: 'exact_holder_label',
    holderLabelText: '2021 Eagle $1 Eagle Landing T-2',
    visibleDate: '2021',
    visibleDenomination: '$1',
    identityConfidence: 0.93,
    identityEvidence: 'The holder label visibly includes 2021 Eagle and $1.',
  }), {group: 'llm_suggestion_verify', label: '2021 American Silver Eagle'});
});

test('generic designs, weak confidence, or missing evidence stay in the human queue', () => {
  const weak = {
    visibleCoin: true,
    suggestedIdentification: 'Morgan dollar',
    evidenceType: 'visible_date_and_design',
    visibleDate: '1881',
    visibleDesign: 'Liberty portrait',
    visibleDenomination: '$1',
    identityConfidence: 0.79,
    identityEvidence: 'A date and portrait are visible.',
  };
  assert.equal(classifyVisionResult(weak).group, 'manual_attribution');
  assert.equal(classifyVisionResult({...weak, identityConfidence: 0.99, identityEvidence: ''}).group, 'manual_attribution');
  assert.equal(classifyVisionResult({...weak, evidenceType: 'uncertain', identityConfidence: 0.99}).group, 'manual_attribution');
});

test('visible year and holder label can yield a tentative suggestion without inventing mint or grade data', () => {
  assert.deepEqual(classifyVisionResult({
    visibleCoin: true,
    holderLabelText: '1909',
    visibleDate: '1909',
    visibleDenomination: 'Indian Head Cent',
    visibleDesign: 'Indian Head Cent',
    suggestedIdentification: '',
    evidenceType: 'holder_label',
    identityConfidence: 0.95,
    identityEvidence: 'Clearly visible 1909 date and Indian Head Cent design on the holder label.',
  }), {group: 'llm_suggestion_verify', label: '1909 Indian Head Cent'});
});

test('OCR conflicts and novelty wording route a confident model answer to manual review', () => {
  const base = {
    visibleCoin: true,
    suggestedIdentification: '50C Penny',
    holderLabelText: 'Vancouver | 50C | 1925',
    visibleDate: '1925',
    visibleDenomination: '50C',
    visibleDesign: 'Commemorative',
    evidenceType: 'exact_holder_label',
    identityConfidence: 0.99,
    identityEvidence: 'The holder label is visible.',
    ocrText: 'Vancouver 50C 1825 1925',
  };
  assert.equal(classifyVisionResult(base).group, 'manual_attribution');
  assert.equal(classifyVisionResult({...base, suggestedIdentification: 'Nickel', ocrText: 'Play Nickel 1961'}).group, 'manual_attribution');
  assert.equal(classifyVisionResult({...base, suggestedIdentification: '1900 Morgan Dollar', visibleDate: '1900'}).group, 'manual_attribution');
});
