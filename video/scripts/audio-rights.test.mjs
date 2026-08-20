import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkMusicTrackRights,
  checkRenderedReelAudioRights,
  isNoMusicTrack,
  selectTrustedCycleTrack,
  sha256File,
} from './audio-rights.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'audio-rights-'));
  const musicDir = join(root, 'music');
  mkdirSync(musicDir);
  const approvedPath = join(musicDir, 'approved.mp3');
  const blockedPath = join(musicDir, 'blocked.mp3');
  writeFileSync(approvedPath, 'approved-audio');
  writeFileSync(blockedPath, 'blocked-audio');
  const db = {
    policy: { approvedStatuses: ['approved'], trustedCycle: ['approved.mp3'] },
    tracks: {
      'approved.mp3': {
        status: 'approved',
        sha256: sha256File(approvedPath),
        sourceName: 'Original',
        sourceUrl: 'local',
        license: 'original',
        allowedPlatforms: ['all'],
      },
      'blocked.mp3': {
        status: 'blocked_pending_reclearance',
        sha256: sha256File(blockedPath),
        blockedReason: 'claim reported',
      },
    },
  };
  return { root, musicDir, db };
}

test('treats no music as an approved production choice', () => {
  assert.equal(isNoMusicTrack('none'), true);
  assert.equal(checkMusicTrackRights('none').ok, true);
});

test('requires music tracks to be present in the rights database', () => {
  const { musicDir, db } = makeFixture();
  const result = checkMusicTrackRights('missing.mp3', { musicDir, db });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'music_track_not_in_rights_database');
});

test('accepts approved tracks with matching hashes', () => {
  const { musicDir, db } = makeFixture();
  const result = checkMusicTrackRights('approved.mp3', { musicDir, db });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'approved');
});

test('selects a deterministic track from the trusted cycle', () => {
  const { db } = makeFixture();
  assert.equal(selectTrustedCycleTrack('same-slug', { db }), selectTrustedCycleTrack('same-slug', { db }));
  assert.equal(selectTrustedCycleTrack('same-slug', { db }), 'approved.mp3');
});

test('blocks tracks that are cataloged but not approved', () => {
  const { musicDir, db } = makeFixture();
  const result = checkMusicTrackRights('blocked.mp3', { musicDir, db });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'music_track_not_approved');
});

test('checks rendered reel metadata against the same rights database', () => {
  const { root, musicDir, db } = makeFixture();
  const metaPath = join(root, 'render-meta.json');
  writeFileSync(metaPath, JSON.stringify({ musicTrack: 'blocked.mp3' }));
  const result = checkRenderedReelAudioRights('example-slug', { metaPath, musicDir, db });
  assert.equal(result.ok, false);
  assert.equal(result.slug, 'example-slug');
  assert.equal(result.musicTrack, 'blocked.mp3');
});
