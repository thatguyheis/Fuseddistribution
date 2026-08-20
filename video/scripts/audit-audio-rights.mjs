#!/usr/bin/env node
import { auditAudioRights } from './audio-rights.mjs';

function printHuman(audit) {
  const s = audit.summary;
  console.log('Audio rights audit');
  console.log(`Generated: ${audit.generatedAt}`);
  console.log(`Rights database: ${audit.rightsPath}`);
  console.log(`Music directory: ${audit.musicDir}`);
  console.log('');
  console.log(`Music files: ${s.musicFiles}`);
  console.log(`Rights records: ${s.rightsRecords}`);
  console.log(`Approved music files: ${s.approvedMusicFiles}`);
  console.log(`Blocked music files: ${s.blockedMusicFiles}`);
  console.log(`Trusted cycle tracks: ${s.trustedCycleApproved}/${s.trustedCycleTracks} approved`);
  console.log(`Rendered reels with metadata: ${s.renderedReelsWithMeta}`);
  console.log(`Rendered reels approved: ${s.renderedReelsApproved}`);
  console.log(`Rendered reels blocked: ${s.renderedReelsBlocked}`);

  if (audit.claimBlocklist.length > 0) {
    console.log('');
    console.log('Known claim blocklist:');
    for (const claim of audit.claimBlocklist) {
      console.log(`- ${claim.claimTitle} / ${claim.contentOwner}: ${claim.impact}`);
    }
  }

  if (audit.failedTracks.length > 0) {
    console.log('');
    console.log('Trusted-cycle failures:');
    for (const result of audit.failedTracks) {
      console.log(`- ${result.musicTrack}: ${result.reason}${result.detail ? ` - ${result.detail}` : ''}`);
    }
  }

  if (audit.blockedTracks.length > 0) {
    console.log('');
    console.log('Archived or non-trusted blocked files:');
    for (const result of audit.blockedTracks.slice(0, 20)) {
      console.log(`- ${result.musicTrack}: ${result.reason}${result.detail ? ` - ${result.detail}` : ''}`);
    }
    if (audit.blockedTracks.length > 20) {
      console.log(`- ... ${audit.blockedTracks.length - 20} more`);
    }
  }

  if (audit.failedRenders.length > 0) {
    console.log('');
    console.log('Rendered reels blocked by audio rights:');
    for (const result of audit.failedRenders.slice(0, 40)) {
      console.log(`- ${result.slug}: ${result.musicTrack} (${result.reason})`);
    }
    if (audit.failedRenders.length > 40) {
      console.log(`- ... ${audit.failedRenders.length - 40} more`);
    }
  }
}

const json = process.argv.includes('--json');
const includeRenders = process.argv.includes('--include-renders');
const audit = auditAudioRights({ includeRenders });

if (json) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  printHuman(audit);
}

if (audit.failedTracks.length > 0 || audit.failedRenders.length > 0) {
  process.exit(1);
}
