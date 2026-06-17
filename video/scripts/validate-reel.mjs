import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DISPLAY_LIMITS = {
  hook: 110,
  overlay: 90,
  stat: 90,
  cta: 90,
  question: 90,
  subtext: 50,
  chartTitle: 80,
  chartLabel: 36,
};

function wordCount(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean).length;
}

function minDurationForNarration(narration) {
  if (!narration) return 0;
  return Math.ceil(wordCount(narration) / 2.5) + 2;
}

function hasMarkdownLink(text) {
  return /\[[^\]]+\]\([^)]+\)/.test(text);
}

function hasUrl(text) {
  return /https?:\/\/|www\./i.test(text);
}

function displayTextFor(segment) {
  if (segment.type === 'chart') return segment.title;
  return segment.text;
}

function checkDisplayText(segment, index, errors, warnings) {
  const text = displayTextFor(segment);
  const label = `segment ${index} (${segment.type})`;

  if (segment.type !== 'chart' && !String(text ?? '').trim()) {
    errors.push(`${label}: missing on-screen text`);
    return;
  }

  if (segment.type === 'chart') {
    if (!String(segment.title ?? '').trim()) errors.push(`${label}: missing chart title`);
    if (!Array.isArray(segment.bars) || segment.bars.length === 0) {
      errors.push(`${label}: chart has no bars`);
    } else {
      segment.bars.forEach((bar, barIndex) => {
        if (!String(bar.label ?? '').trim()) errors.push(`${label}: bar ${barIndex} missing label`);
        if (String(bar.label ?? '').length > DISPLAY_LIMITS.chartLabel) {
          warnings.push(`${label}: bar "${bar.label}" may be too long for chart label column`);
        }
        if (!Number.isFinite(bar.value) || bar.value < 0 || bar.value > 100) {
          errors.push(`${label}: bar "${bar.label}" value must be between 0 and 100`);
        }
      });
    }
    if (String(segment.title ?? '').length > DISPLAY_LIMITS.chartTitle) {
      warnings.push(`${label}: chart title may be too long`);
    }
    return;
  }

  if (/[—–]/.test(text)) errors.push(`${label}: on-screen text contains an em/en dash`);
  if (/^["']|["']$/.test(String(text).trim())) warnings.push(`${label}: on-screen text has surrounding quotes`);
  if (String(text).length > DISPLAY_LIMITS[segment.type]) {
    warnings.push(`${label}: on-screen text is ${String(text).length} chars; risk of wrapping/overlap`);
  }

  if (segment.type === 'question') {
    if (String(segment.text ?? '').split(/\s+/).filter(Boolean).length > 10) {
      warnings.push(`${label}: question text is over 10 words; shorten for comment-card readability`);
    }
    if (segment.subtext && String(segment.subtext).length > DISPLAY_LIMITS.subtext) {
      warnings.push(`${label}: subtext is ${String(segment.subtext).length} chars; risk of wrapping/overlap`);
    }
  }
}

function checkNarration(segment, index, errors) {
  if (!segment.narration) return;
  const label = `segment ${index} (${segment.type})`;
  const narration = String(segment.narration);

  if (/[—–]/.test(narration)) errors.push(`${label}: narration contains an em/en dash`);
  if (/%/.test(narration)) errors.push(`${label}: narration contains %, write "percent" for TTS`);
  if (/\bUS\b/.test(narration)) errors.push(`${label}: narration contains standalone "US", write "USA"`);
  if (hasMarkdownLink(narration)) errors.push(`${label}: narration contains a Markdown link/citation`);
  if (hasUrl(narration)) errors.push(`${label}: narration contains a URL`);
  if (/\[[^\]]+\]/.test(narration)) errors.push(`${label}: narration contains bracketed citation text`);
}

export function validateReelScript(script) {
  const errors = [];
  const warnings = [];

  if (!script || typeof script !== 'object') {
    return { errors: ['script is not an object'], warnings };
  }
  if (!script.slug) errors.push('missing script slug');
  if (!Array.isArray(script.segments) || script.segments.length === 0) {
    errors.push('script has no segments');
    return { errors, warnings };
  }

  let previousEnd = 0;
  script.segments.forEach((segment, index) => {
    const label = `segment ${index} (${segment.type ?? 'unknown'})`;
    if (!segment.type) errors.push(`segment ${index}: missing type`);
    if (!Number.isFinite(segment.startSec) || !Number.isFinite(segment.endSec)) {
      errors.push(`${label}: startSec/endSec must be numbers`);
      return;
    }
    if (segment.endSec <= segment.startSec) errors.push(`${label}: endSec must be greater than startSec`);
    if (index > 0 && segment.startSec !== previousEnd) {
      warnings.push(`${label}: starts at ${segment.startSec}s but previous segment ends at ${previousEnd}s`);
    }
    previousEnd = segment.endSec;

    checkDisplayText(segment, index, errors, warnings);
    checkNarration(segment, index, errors);

    const minDuration = minDurationForNarration(segment.narration);
    const actualDuration = segment.endSec - segment.startSec;
    if (minDuration > 0 && actualDuration < minDuration) {
      errors.push(`${label}: ${actualDuration}s window is shorter than narration minimum ${minDuration}s`);
    }
  });

  const last = script.segments[script.segments.length - 1];
  if (last?.type !== 'question') warnings.push('last segment is not a question card');
  if (Number.isFinite(script.totalDuration) && last && script.totalDuration !== last.endSec) {
    errors.push(`totalDuration ${script.totalDuration}s does not match last segment end ${last.endSec}s`);
  }

  return { errors, warnings };
}

export function formatValidationResult(result) {
  const lines = [];
  for (const warning of result.warnings) lines.push(`WARN: ${warning}`);
  for (const error of result.errors) lines.push(`ERROR: ${error}`);
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const scriptArg = process.argv.find((arg) => arg.startsWith('--script='));
  if (!scriptArg) {
    console.error('Usage: node scripts/validate-reel.mjs --script=<path-to-script.json>');
    process.exit(2);
  }

  const scriptPath = scriptArg.replace('--script=', '');
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const result = validateReelScript(script);
  const output = formatValidationResult(result);
  if (output) console.log(output);
  if (result.errors.length > 0) process.exit(1);
}
