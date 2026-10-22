import { isHttpsUrl, verifyPublicMp4Url } from './buffer-media-verification.mjs';

export const BUFFER_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const BUFFER_MEDIA_MAX_DURATION_SECONDS = 175;

export function mediaUrlsFromJob(job) {
  const urls = [];
  if (typeof job?.publicMediaUrl === 'string' && job.publicMediaUrl.trim()) urls.push(job.publicMediaUrl.trim());
  const assets = job?.createPostPayload?.assets || [];
  for (const asset of assets) {
    const url = asset?.video?.url || asset?.image?.url || asset?.url;
    if (typeof url === 'string' && url.trim()) urls.push(url.trim());
  }
  return [...new Set(urls)];
}

export function mediaUrlFromJob(job) {
  return mediaUrlsFromJob(job)[0] || '';
}

export function assertMediaVerification(verification, slug = 'post') {
  if (!verification?.ok) {
    const detail = verification?.detail ? ` (${verification.detail})` : '';
    throw new Error(`${slug}: Buffer media preflight failed: ${verification?.reason || 'unknown_error'}${detail}. No Buffer create request was sent.`);
  }
  return verification;
}

export async function preflightBufferMedia(job, options = {}) {
  const urls = mediaUrlsFromJob(job);
  const url = urls[0] || '';
  if (urls.length > 1) {
    throw new Error(`${job?.slug || 'post'}: Buffer media preflight found conflicting media URLs (${urls.join(', ')}). No Buffer create request was sent.`);
  }
  if (!isHttpsUrl(url)) {
    throw new Error(`${job?.slug || 'post'}: Buffer media preflight requires one HTTPS media URL. No Buffer create request was sent.`);
  }
  const duration = Number(job?.publicMediaDurationSeconds);
  const maxDurationSeconds = options.maxDurationSeconds || BUFFER_MEDIA_MAX_DURATION_SECONDS;
  if (Number.isFinite(duration) && duration > maxDurationSeconds) {
    throw new Error(`${job?.slug || 'post'}: Buffer media preflight rejected duration ${duration.toFixed(3)}s; maximum is ${maxDurationSeconds}s. No Buffer create request was sent.`);
  }
  const verify = options.verify || verifyPublicMp4Url;
  const verification = await verify(url, {
    maxBytes: options.maxBytes || BUFFER_MEDIA_MAX_BYTES,
    timeoutMs: options.timeoutMs,
  });
  assertMediaVerification(verification, job?.slug || 'post');
  const expectedBytes = Number(job?.publicMediaBytes);
  if (Number.isFinite(expectedBytes) && Number.isFinite(verification.bytes) && expectedBytes !== verification.bytes) {
    throw new Error(`${job?.slug || 'post'}: Buffer media preflight found stale hosted bytes (${verification.bytes}; expected ${expectedBytes}). No Buffer create request was sent.`);
  }
  return { url, ...verification };
}
