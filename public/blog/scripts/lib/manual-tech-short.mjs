import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const requiredChecks = ['captionRegression', 'decodedCaptionBands', 'decode', 'dimensions', 'fps',
  'videoCodec', 'audioCodec', 'avSync', 'size', 'loudness', 'truePeak', 'duration',
  'hookStartsAtZero', 'heroFirst', 'noAdditionalClipDuration'];
const sha = data => createHash('sha256').update(data).digest('hex');
const spokenKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function manualTechShortErrors(release, narration) {
  const errors = [];
  if (release.profile !== 'fused-tech-short-v1' || release.ownerApproval?.approvedBy !== 'Nick'
      || !release.ownerApproval?.publicationRequest || !release.ownerApproval?.generationRequest) {
    errors.push('explicit owner generation and publication approvals required');
  }
  if (!Array.isArray(narration) || narration.length < 9 || narration.length > 11
      || JSON.stringify(narration) !== JSON.stringify(release.narration)) errors.push('approved narration differs');
  if (narration?.[0] !== release.approvedHook || narration?.at(-1) !== release.approvedCta) errors.push('hook or CTA differs');
  if (release.seconds < 45 || release.seconds > 85 || release.bytes >= 25_000_000
      || !Number.isFinite(release.seconds) || !Number.isSafeInteger(release.bytes) || release.bytes <= 0) errors.push('invalid short media measurements');
  if (!/^[a-f0-9]{64}$/.test(release.sha256 || '')) errors.push('missing exact media hash');
  if (!requiredChecks.every(key => release.checks?.[key] === true)) errors.push('final media QA incomplete');
  if (!release.visualReview?.noAccumulatedSubtitlesInInspectedFrames
      || release.visualReview?.sha256 !== release.sha256) errors.push('exact-file caption review missing');
  if (!Array.isArray(release.speech) || release.speech.length !== narration?.length
      || release.speech.some((line, i) => line.expected !== narration[i] || line.score < 0.93
        || !Number.isFinite(line.score) || !Array.isArray(line.issues) || line.issues.length)) errors.push('speech review incomplete');
  if (spokenKey(release.speech?.[0]?.heard) !== spokenKey(release.approvedHook)
      || spokenKey(release.speech?.at(-1)?.heard) !== spokenKey(release.approvedCta)) errors.push('recognized hook or CTA differs');
  return errors;
}

export function validateManualTechShort(root, slug, markdown) {
  const release = JSON.parse(readFileSync(join(root, 'content/tech-education/releases', `${slug}.json`), 'utf8'));
  const narration = [...markdown.matchAll(/^Narration: (.+)$/gm)].map(match => match[1]);
  const errors = manualTechShortErrors(release, narration);
  if (release.slug !== slug || sha(markdown) !== release.scriptSha256) errors.push('script release binding differs');
  const media = join(root, 'public/reels', slug, `${slug}.mp4`);
  if (statSync(media).size !== release.bytes || sha(readFileSync(media)) !== release.sha256) errors.push('local media bytes differ');
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', media], {encoding: 'utf8'}));
  const video = probe.streams.find(stream => stream.codec_type === 'video');
  const audio = probe.streams.find(stream => stream.codec_type === 'audio');
  if (video?.codec_name !== 'h264' || video.width !== 720 || video.height !== 1280
      || video.r_frame_rate !== '30/1' || audio?.codec_name !== 'aac'
      || Math.abs(Number(probe.format.duration) - release.seconds) > 0.05) errors.push('measured media differs from release');
  return errors;
}
