const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function isHttpsUrl(url) {
  return /^https:\/\/\S+$/i.test(url);
}

function parseContentLength(value) {
  if (!value) return null;
  const length = Number(value);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

function totalBytesFromHeaders(response) {
  const contentLength = parseContentLength(response.headers.get('content-length'));
  const contentRange = response.headers.get('content-range') || '';
  const rangeTotalMatch = contentRange.match(/\/(\d+)$/);
  return rangeTotalMatch ? Number(rangeTotalMatch[1]) : contentLength;
}

async function fetchWithTimeout(url, init, timeoutMs) {
  return fetch(url, {
    ...init,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function responseLooksUsable(response) {
  const contentType = response.headers.get('content-type') || '';
  return (response.status === 200 || response.status === 206) && contentType.toLowerCase().startsWith('video/mp4');
}

export async function verifyPublicMp4Url(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;

  if (!isHttpsUrl(url)) {
    return { url, ok: false, reason: 'missing_https_url' };
  }

  let response;
  let method = 'HEAD';
  try {
    response = await fetchWithTimeout(url, { method: 'HEAD' }, timeoutMs);
  } catch (error) {
    return { url, ok: false, reason: 'public_media_url_fetch_failed', method, detail: error.message };
  }

  if (!responseLooksUsable(response)) {
    try {
      response = await fetchWithTimeout(url, { method: 'GET', headers: { Range: 'bytes=0-0' } }, timeoutMs);
      method = 'GET range';
    } catch (error) {
      return { url, ok: false, reason: 'public_media_url_fetch_failed', method: 'GET range', detail: error.message };
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const totalBytes = totalBytesFromHeaders(response);

  if (!(response.status === 200 || response.status === 206)) {
    return { url, ok: false, reason: 'public_media_url_not_ok', method, status: response.status, contentType };
  }
  if (!contentType.toLowerCase().startsWith('video/mp4')) {
    return { url, ok: false, reason: 'public_media_url_not_mp4', method, status: response.status, contentType };
  }
  if (Number.isFinite(totalBytes) && totalBytes > maxBytes) {
    return {
      url,
      ok: false,
      reason: 'media_too_large',
      method,
      status: response.status,
      contentType,
      bytes: totalBytes,
      maxBytes,
    };
  }

  return {
    url,
    ok: true,
    method,
    status: response.status,
    contentType,
    bytes: Number.isFinite(totalBytes) ? totalBytes : null,
  };
}
