import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('scheduled renders delegate music selection to the trusted cycle', () => {
  const scheduler = readFileSync(resolve(new URL('../../scripts/render-missing-reels.sh', import.meta.url).pathname), 'utf8');
  assert.match(scheduler, /^TRACK="cycle"$/m);
  assert.doesNotMatch(scheduler, /TRACK=.*ambient-/);
});

test('scheduled renders keep diffusion opt-in and target two reels per overnight invocation', () => {
  const scheduler = readFileSync(resolve(new URL('../../scripts/render-missing-reels.sh', import.meta.url).pathname), 'utf8');
  const launchAgent = readFileSync(resolve(new URL('../../launchagents/com.nick.render-missing-reels.plist', import.meta.url).pathname), 'utf8');
  assert.match(scheduler, /MAX_RENDERS_PER_RUN="\$\{MAX_RENDERS_PER_RUN:-2\}"/);
  assert.match(scheduler, /GENERATIVE_MEDIA_ENABLED="\$\{GENERATIVE_MEDIA_ENABLED:-0\}"/);
  assert.match(scheduler, /GENERATIVE_MEDIA_MAX_SEGMENTS="\$\{GENERATIVE_MEDIA_MAX_SEGMENTS:-2\}"/);
  assert.match(scheduler, /GENERATIVE_MEDIA_TIMEOUT_MS="\$\{GENERATIVE_MEDIA_TIMEOUT_MS:-240000\}"/);
  assert.match(launchAgent, /<integer>1<\/integer>[\s\S]*?<key>Minute<\/key>[\s\S]*?<integer>0<\/integer>/);
  assert.match(launchAgent, /<integer>4<\/integer>[\s\S]*?<key>Minute<\/key>[\s\S]*?<integer>0<\/integer>/);
  assert.match(launchAgent, /<key>MAX_RENDERS_PER_RUN<\/key>\s*<string>2<\/string>/);
  assert.match(launchAgent, /<key>GENERATIVE_MEDIA_ENABLED<\/key>\s*<string>0<\/string>/);
  assert.match(launchAgent, /<key>GENERATIVE_MEDIA_TIMEOUT_MS<\/key>\s*<string>240000<\/string>/);
});
