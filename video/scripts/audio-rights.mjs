import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const videoDir = resolve(__dirname, '..');
export const repoRoot = resolve(videoDir, '..');
export const defaultRightsPath = join(videoDir, 'data', 'audio-rights.json');
export const defaultMusicDir = join(videoDir, 'public', 'music');

export function isNoMusicTrack(track) {
  const value = String(track ?? '').trim().toLowerCase();
  return value === '' || value === 'none' || value === 'off' || value === 'silent';
}

export function normalizeMusicTrack(track) {
  return isNoMusicTrack(track) ? 'none' : String(track).trim();
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadAudioRightsDatabase(path = defaultRightsPath) {
  return readJson(path);
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function approvedStatuses(db) {
  const configured = db?.policy?.approvedStatuses;
  return Array.isArray(configured) && configured.length > 0 ? configured : ['approved'];
}

function hashString(value) {
  return createHash('sha256').update(String(value)).digest();
}

export function trustedCycleTracks(options = {}) {
  const db = options.db ?? loadAudioRightsDatabase(options.rightsPath ?? defaultRightsPath);
  const cycle = db?.policy?.trustedCycle;
  return Array.isArray(cycle) ? cycle.filter(Boolean) : [];
}

export function selectTrustedCycleTrack(seed = new Date().toISOString().slice(0, 10), options = {}) {
  const cycle = trustedCycleTracks(options);
  if (cycle.length === 0) return 'none';
  const hash = hashString(seed);
  return cycle[hash[0] % cycle.length];
}

export function checkMusicTrackRights(track, options = {}) {
  const musicTrack = normalizeMusicTrack(track);
  if (musicTrack === 'none') {
    return {
      ok: true,
      musicTrack,
      status: 'no_music',
      reason: 'no_background_music',
      rights: {
        license: 'not_applicable',
        allowedPlatforms: ['all'],
      },
    };
  }

  const rightsPath = options.rightsPath ?? defaultRightsPath;
  const musicDir = options.musicDir ?? defaultMusicDir;
  const db = options.db ?? loadAudioRightsDatabase(rightsPath);
  const rights = db.tracks?.[musicTrack];
  if (!rights) {
    return {
      ok: false,
      musicTrack,
      status: 'missing',
      reason: 'music_track_not_in_rights_database',
      detail: `Add ${musicTrack} to ${rightsPath} with source, license, platform rights, and evidence before use.`,
    };
  }

  const filePath = join(musicDir, musicTrack);
  if (!existsSync(filePath)) {
    return {
      ok: false,
      musicTrack,
      status: rights.status ?? 'unknown',
      reason: 'music_file_missing',
      detail: filePath,
      rights,
    };
  }

  const actualSha256 = sha256File(filePath);
  if (rights.sha256 && rights.sha256 !== actualSha256) {
    return {
      ok: false,
      musicTrack,
      status: rights.status ?? 'unknown',
      reason: 'music_file_hash_mismatch',
      expectedSha256: rights.sha256,
      actualSha256,
      rights,
    };
  }

  if (!approvedStatuses(db).includes(rights.status)) {
    return {
      ok: false,
      musicTrack,
      status: rights.status ?? 'unknown',
      reason: 'music_track_not_approved',
      detail: rights.blockedReason || 'Track is not approved for production social publishing.',
      rights,
    };
  }

  return {
    ok: true,
    musicTrack,
    status: rights.status,
    rights,
    actualSha256,
  };
}

export function assertMusicTrackCleared(track, options = {}) {
  const result = checkMusicTrackRights(track, options);
  if (!result.ok) {
    throw new Error(`Audio rights blocked for ${result.musicTrack}: ${result.reason}${result.detail ? ` - ${result.detail}` : ''}`);
  }
  return result;
}

export function renderMetaPathForSlug(slug, root = repoRoot) {
  return join(root, 'video', 'out', slug, 'render-meta.json');
}

export function checkRenderedReelAudioRights(slug, options = {}) {
  const root = options.repoRoot ?? repoRoot;
  const metaPath = options.metaPath ?? renderMetaPathForSlug(slug, root);
  if (!existsSync(metaPath)) {
    return {
      ok: false,
      slug,
      musicTrack: 'unknown',
      reason: 'missing_render_meta',
      detail: metaPath,
    };
  }

  let meta;
  try {
    meta = readJson(metaPath);
  } catch (error) {
    return {
      ok: false,
      slug,
      musicTrack: 'unknown',
      reason: 'invalid_render_meta',
      detail: error.message,
    };
  }

  const musicTrack = meta.musicTrack ?? 'unknown';
  const result = checkMusicTrackRights(musicTrack, options);
  return {
    ...result,
    slug,
    metaPath,
    renderedAt: meta.renderedAt,
  };
}

export function assertRenderedReelAudioCleared(slug, options = {}) {
  const result = checkRenderedReelAudioRights(slug, options);
  if (!result.ok) {
    throw new Error(`Rendered reel audio rights blocked for ${slug}: ${result.musicTrack} (${result.reason})${result.detail ? ` - ${result.detail}` : ''}`);
  }
  return result;
}

export function auditAudioRights(options = {}) {
  const root = options.repoRoot ?? repoRoot;
  const musicDir = options.musicDir ?? join(root, 'video', 'public', 'music');
  const rightsPath = options.rightsPath ?? join(root, 'video', 'data', 'audio-rights.json');
  const includeRenders = Boolean(options.includeRenders);
  const db = loadAudioRightsDatabase(rightsPath);
  const musicFiles = existsSync(musicDir)
    ? readdirSync(musicDir).filter((file) => /\.(mp3|m4a|wav|aac)$/i.test(file)).sort()
    : [];

  const trackResults = musicFiles.map((musicTrack) => checkMusicTrackRights(musicTrack, { db, rightsPath, musicDir }));
  const trustedTracks = trustedCycleTracks({ db });
  const trustedResults = trustedTracks.map((musicTrack) => checkMusicTrackRights(musicTrack, { db, rightsPath, musicDir }));
  const catalogOnlyTracks = Object.keys(db.tracks ?? {})
    .filter((musicTrack) => !musicFiles.includes(musicTrack))
    .map((musicTrack) => ({
      ok: false,
      musicTrack,
      status: db.tracks[musicTrack].status ?? 'unknown',
      reason: 'rights_record_without_file',
      rights: db.tracks[musicTrack],
    }));

  const outDir = join(root, 'video', 'out');
  const renderResults = includeRenders && existsSync(outDir)
    ? readdirSync(outDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => checkRenderedReelAudioRights(entry.name, { db, rightsPath, musicDir, repoRoot: root }))
      .filter((result) => result.reason !== 'missing_render_meta')
      .sort((a, b) => a.slug.localeCompare(b.slug))
    : [];

  const blockedTracks = [...trackResults, ...catalogOnlyTracks].filter((result) => !result.ok);
  const failedTracks = [...trustedResults, ...catalogOnlyTracks].filter((result) => !result.ok);
  const failedRenders = renderResults.filter((result) => !result.ok);

  return {
    generatedAt: new Date().toISOString(),
    rightsPath,
    musicDir,
    policy: db.policy,
    claimBlocklist: db.claimBlocklist ?? [],
    summary: {
      musicFiles: musicFiles.length,
      rightsRecords: Object.keys(db.tracks ?? {}).length,
      approvedMusicFiles: trackResults.filter((result) => result.ok).length,
      blockedMusicFiles: blockedTracks.length,
      trustedCycleTracks: trustedTracks.length,
      trustedCycleApproved: trustedResults.filter((result) => result.ok).length,
      renderedReelsWithMeta: renderResults.length,
      renderedReelsApproved: renderResults.filter((result) => result.ok).length,
      renderedReelsBlocked: failedRenders.length,
    },
    tracks: [...trackResults, ...catalogOnlyTracks],
    trustedTracks: trustedResults,
    blockedTracks,
    renderedReels: renderResults,
    failedTracks,
    failedRenders,
  };
}
