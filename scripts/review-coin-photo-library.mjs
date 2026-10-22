import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewDirectory = path.join(root, 'Coin Raw/Needs Attribution or Review');
const indexPath = path.join(reviewDirectory, 'REVIEW-INDEX.csv');
const resultsPath = path.join(reviewDirectory, 'VISION-REVIEW.json');
const csvPath = path.join(reviewDirectory, 'VISION-REVIEW.csv');
const model = process.env.COIN_VISION_MODEL || 'gemma3:4b';
const baseUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const identifiedDirectoryName = 'LLM Suggestion - Verify';
const manualDirectoryName = 'Needs Manual Attribution';
const duplicateDirectoryName = 'Exact Duplicates - See Primary';
const swiftOcrPath = path.join(root, 'scripts/ocr-coin-photo-library.swift');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const escapeCsv = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const encodeRelativePath = value => value.split('/').map(encodeURIComponent).join('/');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map(record => Object.fromEntries(headers.map((key, i) => [key, record[i] ?? ''])));
}

function runFfmpeg(sourcePath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
    '-vf', 'scale=1600:1600:force_original_aspect_ratio=decrease',
    '-frames:v', '1', '-q:v', '3', outputPath,
  ], {encoding: 'utf8', timeout: 60_000});
  if (result.error) throw result.error;
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error((result.stderr || 'Could not prepare a local image for vision review').trim());
  }
}

function parseModelContent(content) {
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('Vision model returned no JSON object');
  return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
}

export function classifyVisionResult(result) {
  const candidate = typeof result.suggestedIdentification === 'string'
    ? result.suggestedIdentification.trim()
    : '';
  const evidence = typeof result.identityEvidence === 'string' ? result.identityEvidence.trim() : '';
  const confidence = Number(result.identityConfidence);
  const holderLabel = typeof result.holderLabelText === 'string' ? result.holderLabelText.trim() : '';
  const hasYear = /^\d{3,4}[a-z]?$/i.test(String(result.visibleDate ?? '').trim());
  const denomination = typeof result.visibleDenomination === 'string' ? result.visibleDenomination.trim() : '';
  const design = typeof result.visibleDesign === 'string' ? result.visibleDesign.trim() : '';
  const coinTerm = /\b(cent|cents|dollar|dollars|eagle|nickel|dime|quarter|half|coin|penny)\b/i;
  const ocrText = String(result.ocrText ?? '');
  const specificSeries = (holderLabel + ' ' + ocrText).match(/\b(morgan|peace dollar|indian head|walking liberty|kennedy|carver|vancouver|lincoln|columbian|buffalo|standing liberty|silver eagle|american eagle|texas)\b/i)?.[0] || '';
  const denominationConflict = /\b(?:50\s?c|50¢)\b/i.test(ocrText + ' ' + holderLabel)
    && /\b(penny|cent|cents)\b/i.test(candidate);
  const noveltyOrPlayItem = /\b(play nickel|novelty coin|tribute coin)\b/i.test(ocrText);
  const dateContradictsOcr = Boolean(ocrText && hasYear)
    && !new RegExp('\\b' + String(result.visibleDate).trim() + '\\b').test(ocrText);
  const hasLabelIdentification = /label/i.test(String(result.evidenceType ?? ''))
    && holderLabel.length >= 4 && hasYear && coinTerm.test(holderLabel + ' ' + denomination);
  const hasVisibleCoinIdentification = hasYear && design && coinTerm.test(denomination);
  const hasNamedCoinAndYear = candidate && hasYear && coinTerm.test(candidate)
    && /label|visible.*design/i.test(String(result.evidenceType ?? ''));
  const genericDateAndDenomination = /^\d{3,4}\s+\d{1,3}c$/i.test(candidate);
  const label = genericDateAndDenomination && specificSeries
    ? specificSeries + ' ' + denomination
    : candidate || (hasLabelIdentification || hasVisibleCoinIdentification
      ? String(result.visibleDate).trim() + ' ' + denomination
      : '');
  if (!denominationConflict && !noveltyOrPlayItem && !dateContradictsOcr
      && result.visibleCoin === true && label && evidence && confidence >= 0.88
      && (hasLabelIdentification || hasNamedCoinAndYear || (hasVisibleCoinIdentification && confidence >= 0.92))) {
    return {group: 'llm_suggestion_verify', label};
  }
  return {group: 'manual_attribution', label: ''};
}

function keepVisibleEvidenceFields(result) {
  const fields = ['visibleCoin', 'holderLabelText', 'visibleDate', 'visibleDenomination', 'visibleDesign',
    'suggestedIdentification', 'evidenceType', 'identityConfidence', 'identityEvidence'];
  return Object.fromEntries(fields.filter(field => result[field] !== undefined).map(field => [field, result[field]]));
}

async function requestVision(sourcePath, imageSha256, ocrText) {
  const tmpImage = path.join(tmpdir(), 'fused-coin-vision-' + imageSha256 + '.jpg');
  runFfmpeg(sourcePath, tmpImage);
  const image = readFileSync(tmpImage).toString('base64');
  unlinkSync(tmpImage);
  const prompt = [
    'Inspect only pixels in the attached photograph. Do not use the filename, catalog title, prior knowledge, or common coin varieties as evidence.',
    'This is a human inventory task, not authentication or grading. Read the holder label only where the letters are clearly visible. Quote only legible words and numbers; use [unclear] for unreadable parts.',
    'Local on-device text scan (may contain errors; verify it against the pixels): ' + (ocrText || '(none)'),
    'If there is no holder label, describe the design and transcribe only a date or denomination that is visibly readable on the coin.',
    'Never guess or report a mint mark, grade, variety, value, authenticity, or that two separate photographs show the same specimen. A printed grade on a holder is label text, not an independent grade determination.',
    'Set suggestedIdentification only when the visible label or clearly readable date, design, and denomination together identify a specific coin. Otherwise leave it empty.',
    'Return JSON only with these fields: visibleCoin (boolean), holderLabelText (exact readable holder text or empty string), visibleDate (readable date or empty string), visibleDenomination (readable denomination or empty string), visibleDesign (plain description of visible design, not a variety claim), suggestedIdentification (short tentative coin name or empty string), evidenceType (exact_holder_label, visible_date_and_design, uncertain, or none), identityConfidence (0 to 1), identityEvidence (short description of visible pixels that support the suggestion).',
  ].join('\n');
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/api/chat', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: {temperature: 0},
      messages: [{role: 'user', content: prompt, images: [image]}],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error('Local vision model returned HTTP ' + response.status);
  const envelope = await response.json();
  return parseModelContent(envelope.message?.content ?? '');
}

function getOcrResults(rows) {
  const imagePaths = rows
    .filter(row => !['.mov', '.mp4'].includes(path.extname(row.original_filename).toLowerCase()))
    .map(row => realpathSync(path.join(reviewDirectory, row.folder, row.original_filename)));
  const commandResult = spawnSync('swift', [swiftOcrPath, ...imagePaths], {
    encoding: 'utf8',
    timeout: 15 * 60_000,
    maxBuffer: 128 * 1024 * 1024,
    env: {...process.env, CLANG_MODULE_CACHE_PATH: '/tmp/fused-clang-module-cache', SWIFT_MODULE_CACHE_PATH: '/tmp/fused-swift-module-cache'},
  });
  if (commandResult.error) throw commandResult.error;
  if (commandResult.status !== 0) throw new Error((commandResult.stderr || 'On-device image text scan failed').trim());
  const records = JSON.parse(commandResult.stdout);
  return Object.fromEntries(records.map(record => [
    path.basename(record.file),
    {lines: record.lines || [], error: record.error || ''},
  ]));
}

function hasSpecificOcrClue(ocr) {
  if (ocr?.error || !ocr?.lines?.length) return false;
  const text = ocr.lines.map(line => line.text).join(' ');
  const hasYear = /\b(?:18|19|20)\d{2}\b/.test(text);
  const namedSeries = /\b(morgan|peace dollar|indian head|walking liberty|kennedy|carver|vancouver|lincoln|columbian|buffalo|standing liberty|silver eagle|american eagle|liberty head)\b/i.test(text);
  const coinWord = /\b(cent|cents|dollar|dollars|eagle|nickel|dime|quarter|half dollar|coin)\b/i.test(text) || /\$\s?1\b/.test(text);
  return namedSeries || (hasYear && coinWord);
}

function writeResultsFile(report) {
  writeFileSync(resultsPath, JSON.stringify(report, null, 2) + '\n');
}

function finalizeIfComplete(rows, report) {
  if (rows.some(row => !report.results[row.original_filename])) return false;
  const identifiedDirectory = path.join(reviewDirectory, identifiedDirectoryName);
  const manualDirectory = path.join(reviewDirectory, manualDirectoryName);
  const duplicateDirectory = path.join(reviewDirectory, duplicateDirectoryName);
  mkdirSync(identifiedDirectory, {recursive: true});
  mkdirSync(manualDirectory, {recursive: true});
  mkdirSync(duplicateDirectory, {recursive: true});
  const rowsByHash = new Map();
  for (const row of rows) {
    const hash = report.results[row.original_filename].sourceSha256;
    if (!hash) continue;
    if (!rowsByHash.has(hash)) rowsByHash.set(hash, []);
    rowsByHash.get(hash).push(row);
  }
  for (const sameBytes of rowsByHash.values()) {
    if (sameBytes.length < 2) continue;
    sameBytes.sort((left, right) => {
      const leftCopy = /\s\(\d+\)\.[^.]+$/.test(left.original_filename) ? 1 : 0;
      const rightCopy = /\s\(\d+\)\.[^.]+$/.test(right.original_filename) ? 1 : 0;
      return leftCopy - rightCopy || left.original_filename.localeCompare(right.original_filename);
    });
    for (const duplicate of sameBytes.slice(1)) {
      const result = report.results[duplicate.original_filename];
      result.duplicateOf = sameBytes[0].original_filename;
      result.group = 'exact_duplicate';
    }
  }
  const outputRows = [];
  for (const row of rows) {
    const result = report.results[row.original_filename];
    const groupName = result.group === 'exact_duplicate' ? duplicateDirectoryName
      : result.group === 'llm_suggestion_verify' ? identifiedDirectoryName : manualDirectoryName;
    const targetDirectory = groupName === identifiedDirectoryName ? identifiedDirectory
      : groupName === duplicateDirectoryName ? duplicateDirectory : manualDirectory;
    const targetPath = path.join(targetDirectory, row.original_filename);
    const possibleSources = [row.folder, identifiedDirectoryName, manualDirectoryName, duplicateDirectoryName]
      .map(folder => path.join(reviewDirectory, folder, row.original_filename));
    let originalReviewPath = '';
    for (const possiblePath of possibleSources) {
      try {
        lstatSync(possiblePath);
        originalReviewPath = possiblePath;
        break;
      } catch {}
    }
    if (!originalReviewPath) {
      throw new Error('Review shortcut disappeared before sorting: ' + row.original_filename);
    }
    if (originalReviewPath !== targetPath) {
      const linkInfo = lstatSync(originalReviewPath);
      if (!linkInfo.isSymbolicLink()) throw new Error('Refusing to move a non-link review item: ' + originalReviewPath);
      if (existsSync(targetPath)) throw new Error('Refusing to overwrite: ' + targetPath);
      renameSync(originalReviewPath, targetPath);
    }
    outputRows.push({
      original_filename: row.original_filename,
      asset_id: row.asset_id,
      current_label: row.current_label,
      model_group: groupName,
      status: result.group,
      duplicate_of: result.duplicateOf || '',
      suggested_identification: result.suggestedIdentification || '',
      visible_holder_label_text: result.holderLabelText || '',
      visible_date: result.visibleDate || '',
      visible_denomination: result.visibleDenomination || '',
      visible_design: result.visibleDesign || '',
      identity_confidence: result.identityConfidence ?? '',
      identity_evidence: result.identityEvidence || result.manualReason || '',
      source_sha256: result.imageSha256 || result.sourceSha256 || '',
      model: result.model || '',
    });
  }
  const fields = Object.keys(outputRows[0] ?? {});
  writeFileSync(csvPath, [fields.join(','), ...outputRows.map(row => fields.map(field => escapeCsv(row[field])).join(','))].join('\n') + '\n');
  const updatedIndexRows = rows.map(row => {
    const result = report.results[row.original_filename];
    const visionRow = outputRows.find(output => output.original_filename === row.original_filename);
    return {
      ...row,
      folder: visionRow.model_group,
      vision_status: result.group,
      suggested_identification: result.suggestedIdentification || '',
      duplicate_of: result.duplicateOf || '',
      identity_evidence: result.identityEvidence || result.manualReason || '',
    };
  });
  const indexFields = Object.keys(updatedIndexRows[0] ?? {});
  writeFileSync(indexPath, [indexFields.join(','), ...updatedIndexRows.map(row => indexFields.map(field => escapeCsv(row[field])).join(','))].join('\n') + '\n');
  updateReviewPage(rows, report);
  report.completed = true;
  report.completedAt = new Date().toISOString();
  writeResultsFile(report);
  return true;
}

function updateReviewPage(rows, report) {
  const pagePath = path.join(reviewDirectory, 'index.html');
  let page = readFileSync(pagePath, 'utf8');
  page = page.replace(/\.model-suggestion\{[^}]*\}\.model-suggestion strong\{[^}]*\}/g, '');
  page = page.replace('</style>', '.model-suggestion{background:#26394a;border-left:4px solid #ffc857;padding:8px;margin:8px 0;font-size:13px}.model-suggestion strong{color:#ffd36b}</style>');
  for (const row of rows) {
    const result = report.results[row.original_filename];
    const group = result.group === 'exact_duplicate' ? duplicateDirectoryName
      : result.group === 'llm_suggestion_verify' ? identifiedDirectoryName : manualDirectoryName;
    const newUrl = encodeRelativePath(group + '/' + row.original_filename);
    const escapedFilename = escapeHtml(row.original_filename);
    const marker = '<b>' + escapedFilename + '</b>';
    const filenameAt = page.indexOf(marker);
    if (filenameAt < 0) continue;
    const cardStart = page.lastIndexOf('<article', filenameAt);
    const cardEnd = page.indexOf('</article>', filenameAt) + '</article>'.length;
    if (cardStart < 0 || cardEnd < '</article>'.length) continue;
    let card = page.slice(cardStart, cardEnd)
      .replace(/(<(?:img|video)\b[^>]*\bsrc=")[^"]+("[^>]*>)/i, '$1' + newUrl + '$2')
      .replace(/<div class="model-suggestion">.*?<\/div>/s, '');
    const suggestion = result.group === 'exact_duplicate'
      ? '<div class="model-suggestion"><strong>Exact duplicate.</strong> Same file bytes as ' + escapeHtml(result.duplicateOf) + '; no separate review needed.</div>'
      : result.group === 'llm_suggestion_verify'
      ? '<div class="model-suggestion"><strong>LLM suggestion - verify before use:</strong> ' + escapeHtml(result.suggestedIdentification) +
        ' (' + Math.round(Number(result.identityConfidence) * 100) + '% model confidence). Evidence: ' + escapeHtml(result.identityEvidence) + '</div>'
      : '<div class="model-suggestion"><strong>Needs your identification.</strong> ' +
        escapeHtml(result.manualReason || result.identityEvidence || 'The model could not identify this confidently.') + '</div>';
    page = page.slice(0, cardStart) + card.replace('<label>Your coin ID or notes', suggestion + '<label>Your coin ID or notes') + page.slice(cardEnd);
  }
  writeFileSync(pagePath, page);
}

async function reviewCoinPhotoLibrary({limit = Infinity} = {}) {
  const rows = parseCsv(readFileSync(indexPath, 'utf8'));
  const report = existsSync(resultsPath)
    ? JSON.parse(readFileSync(resultsPath, 'utf8'))
    : {version: 1, model, results: {}, startedAt: new Date().toISOString(), completed: false};
  const refreshSort = process.argv.includes('--refresh-sort');
  if (report.completed && !refreshSort) {
    console.log('Vision review is already complete. Results are in VISION-REVIEW.csv.');
    return report;
  }
  report.classifierVersion = 2;
  report.disclaimer = 'Local model suggestions are unverified. They are not authentication, grading, or approval for production use.';
  if (!report.ocr) {
    console.log('Running on-device text scan across the photo set...');
    report.ocr = getOcrResults(rows);
    report.updatedAt = new Date().toISOString();
    writeResultsFile(report);
    console.log('On-device scan complete.');
  }
  for (const row of rows) {
    const prior = report.results[row.original_filename];
    if (!prior?.sourceSha256) continue;
    const possibleSources = [row.folder, identifiedDirectoryName, manualDirectoryName, duplicateDirectoryName]
      .map(folder => path.join(reviewDirectory, folder, row.original_filename));
    const existingSource = possibleSources.find(source => {
      try { lstatSync(source); return true; } catch { return false; }
    });
    if (!existingSource) continue;
    const resolvedSource = realpathSync(existingSource);
    if (sha256(readFileSync(resolvedSource)) !== prior.sourceSha256 || prior.visibleCoin === undefined) continue;
    prior.ocrText ||= report.ocr[row.original_filename]?.lines?.map(line => line.text).join(' | ') || '';
    const classification = classifyVisionResult(prior);
    prior.group = classification.group;
    prior.suggestedIdentification = classification.label;
  }
  if (refreshSort) {
    finalizeIfComplete(rows, report);
    console.log('Refreshed identity suggestions and exact-duplicate grouping without rerunning vision.');
    return report;
  }
  let attempted = 0;
  for (const row of rows) {
    const name = row.original_filename;
    const ext = path.extname(name).toLowerCase();
    const sourcePath = path.join(reviewDirectory, row.folder, name);
    const resolvedSource = realpathSync(sourcePath);
    const sourceSha256 = sha256(readFileSync(resolvedSource));
    if (report.results[name]?.sourceSha256 === sourceSha256 && report.results[name]?.group) continue;
    if (attempted >= limit) break;
    attempted += 1;
    let result;
    if (['.mov', '.mp4'].includes(ext)) {
      result = {group: 'manual_attribution', manualReason: 'Video clip left for manual review in this photo pass.', sourceSha256};
    } else {
      const ocr = report.ocr[name] || {lines: [], error: 'No OCR result'};
      const ocrText = ocr.lines.map(line => line.text).join(' | ');
      if (!hasSpecificOcrClue(ocr)) {
        result = {
          group: 'manual_attribution',
          manualReason: 'On-device text scan found no specific coin name or year and denomination.',
          sourceSha256,
          ocrText,
          model: 'Apple Vision OCR; visual LLM not needed for this unclear item',
          reviewedAt: new Date().toISOString(),
        };
        report.results[name] = result;
        report.updatedAt = new Date().toISOString();
        writeResultsFile(report);
        console.log((attempted + 1) + '/' + rows.length + ' ' + name + ' => manual review (no specific text clue)');
        continue;
      }
      try {
        const vision = keepVisibleEvidenceFields(await requestVision(resolvedSource, sourceSha256, ocrText));
        const classification = classifyVisionResult(vision);
        result = {
          ...vision,
          group: classification.group,
          suggestedIdentification: classification.group === 'llm_suggestion_verify' ? classification.label : '',
          manualReason: classification.group === 'manual_attribution'
            ? 'No sufficiently specific, visible identity evidence passed the review threshold.'
            : '',
          imageSha256: sourceSha256,
          sourceSha256,
          ocrText,
          model,
          reviewedAt: new Date().toISOString(),
        };
      } catch (error) {
        result = {
          group: 'manual_attribution',
          manualReason: 'Local image review failed: ' + error.message,
          sourceSha256,
          model,
          reviewedAt: new Date().toISOString(),
        };
      }
    }
    report.results[name] = result;
    report.updatedAt = new Date().toISOString();
    writeResultsFile(report);
    const description = result.group === 'llm_suggestion_verify'
      ? result.suggestedIdentification + ' (candidate; human verify)'
      : result.manualReason || 'needs a human identity';
    console.log((attempted + '/' + rows.length) + ' ' + name + ' => ' + description);
  }
  const complete = finalizeIfComplete(rows, report);
  if (!complete) {
    console.log('Checkpoint saved. ' + Object.keys(report.results).length + '/' + rows.length + ' records reviewed; rerun to resume.');
  } else {
    console.log('Review complete. Suggestions are not catalog approvals and must be checked by a person.');
  }
  return report;
}

function readLimit() {
  const value = process.argv.find(argument => argument.startsWith('--limit='));
  return value ? Math.max(0, Number(value.slice('--limit='.length))) : Infinity;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  reviewCoinPhotoLibrary({limit: readLimit()}).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
