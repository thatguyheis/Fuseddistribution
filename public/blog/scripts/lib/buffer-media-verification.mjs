const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function isHttpsUrl(url) {
  return /^https:\/\/\S+$/i.test(url);
}

function parseContentLength(value) {
  if (!value) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

function responseFailure(url, reason, response, extra = {}) {
  return {
    url,
    ok: false,
    reason,
    status: response?.status,
    contentType: response?.headers.get('content-type') || '',
    ...extra,
  };
}

export async function verifyPublicMp4Url(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;

  if (!isHttpsUrl(url)) {
    return { url, ok: false, reason: 'missing_https_url' };
  }

  let response;
  try {
    // Buffer downloads the media itself. Consume the full response here so a
    // successful HEAD or one-byte range cannot mask a truncated or gated MP4.
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { url, ok: false, reason: 'public_media_url_fetch_failed', method: 'GET full', detail: error.message };
  }

  if (response.status !== 200) {
    await response.body?.cancel().catch(() => {});
    return responseFailure(url, 'public_media_url_not_ok', response, { method: 'GET full' });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('video/mp4')) {
    await response.body?.cancel().catch(() => {});
    return responseFailure(url, 'public_media_url_not_mp4', response, { method: 'GET full' });
  }

  const declaredBytes = parseContentLength(response.headers.get('content-length'));
  if (declaredBytes !== null && declaredBytes > maxBytes) {
    await response.body?.cancel().catch(() => {});
    return responseFailure(url, 'media_too_large', response, {
      method: 'GET full',
      bytes: declaredBytes,
      maxBytes,
    });
  }

  let bytes = 0;
  const prefix = new Uint8Array(12);
  let prefixLength = 0;
  try {
    if (!response.body) throw new Error('empty response body');
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return responseFailure(url, 'media_too_large', response, {
          method: 'GET full',
          bytes,
          maxBytes,
        });
      }
      const copyLength = Math.min(prefix.length - prefixLength, value.byteLength);
      if (copyLength > 0) {
        prefix.set(value.subarray(0, copyLength), prefixLength);
        prefixLength += copyLength;
      }
    }
  } catch (error) {
    return responseFailure(url, 'public_media_url_body_read_failed', response, {
      method: 'GET full',
      bytes,
      detail: error.message,
    });
  }

  if (declaredBytes !== null && declaredBytes !== bytes) {
    return responseFailure(url, 'public_media_url_incomplete', response, {
      method: 'GET full',
      bytes,
      declaredBytes,
    });
  }

  if (prefixLength < 12 || String.fromCharCode(...prefix.subarray(4, 8)) !== 'ftyp') {
    return responseFailure(url, 'public_media_url_invalid_mp4_signature', response, {
      method: 'GET full',
      bytes,
    });
  }

  return {
    url,
    ok: true,
    method: 'GET full',
    status: response.status,
    contentType,
    bytes,
  };
}
