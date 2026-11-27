import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDetails, validRequestId } from './highlights.js';

function makeForm(fields) {
  const form = new FormData();
  for (const [key,value] of Object.entries(fields)) form.set(key,value);
  return form;
}
test('back office can share a photo with just their role', () => {
  const form=makeForm({role:'Back office'});
  assert.equal(parseDetails(form,true).showDate,'');
  assert.throws(()=>parseDetails(form,false), /attach a photo/);
});
test('a streamer can supply a deadline separate from the show', () => {
  const form=makeForm({role:'Streamer',highlight:'Open the coin roll',platform:'Whatnot',deadline:'2026-11-29',deadlineTime:'12:00',showDate:'2026-11-30',showTime:'19:30'});
  assert.equal(parseDetails(form,false).showTime,'19:30');
  form.set('showDate','2026-11-31');
  assert.throws(()=>parseDetails(form,false), /valid date/);
  form.set('showDate','');
  assert.throws(()=>parseDetails(form,false), /valid date/);
});
test('request identifiers are separate from inbox routes', () => {
  assert.equal(validRequestId(crypto.randomUUID()),true);
  assert.equal(validRequestId('inbox'),false);
});
