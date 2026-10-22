#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readContentPlan } from './lib/content-plan.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const blogDir = dirname(scriptDir);

function parseArgs(argv) {
  const args = { slug: '', helper: process.env.LOCAL_LLM || join(process.env.HOME || '', 'bin', 'hermes-local.sh'), force: false };
  for (const item of argv) {
    if (item === '--force') args.force = true;
    else if (item.startsWith('--slug=')) args.slug = item.slice(7);
    else if (item.startsWith('--helper=')) args.helper = resolve(item.slice(9));
    else if (!item.startsWith('--') && !args.slug) args.slug = item;
    else throw new Error(`unknown argument: ${item}`);
  }
  if (!args.slug) throw new Error('usage: write-segmented-article.mjs <slug> [--helper=path] [--force]');
  return args;
}

export function wordCount(value) {
  return (value.match(/\b[\w'-]+\b/g) || []).length;
}

export function cleanSegment(raw) {
  let value = String(raw || '').replace(/\r/g, '').trim();
  value = value.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
  value = value.replace(/^#{1,6}\s+.*\n+/, '').trim();
  value = value.replace(/[—–]/g, ' - ');
  value = value.replace(/\n{3,}/g, '\n\n');
  return value.trim();
}

export function segmentIsUsable(value, minimum = 105, maximum = 230) {
  const count = wordCount(value);
  return count >= minimum
    && count <= maximum
    && !/```|\[[^\]]+\]|\b(?:TODO|TBD)\b/i.test(value)
    && !/\b(?:here is|here are) (?:the|a|your) (?:section|draft|article)/i.test(value);
}

function researchStats(path) {
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return (data.stats || []).filter((stat) => stat?.claim && stat?.source_name);
}

function callWorker(helper, prompt, maxTokens, timeoutMs) {
  const startedAt = Date.now();
  const result = spawnSync(helper, [prompt], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HERMES_LOCAL_MODEL: process.env.SEGMENTED_LOCAL_MODEL || process.env.HERMES_LOCAL_MODEL || process.env.HERMES_ARTICLE_MODEL || 'gemma3:4b-it-qat',
      HERMES_LOCAL_MAX_TOKENS: String(maxTokens),
      HERMES_LOCAL_TEMPERATURE: process.env.SEGMENTED_MODEL_TEMPERATURE || '0.25',
      HERMES_LOCAL_TIMEOUT: String(Math.max(30, Math.floor(timeoutMs / 1000) - 10)),
    },
    timeout: timeoutMs,
    maxBuffer: 2 * 1024 * 1024,
  });
  return {
    value: result.error || result.status !== 0 ? '' : cleanSegment(result.stdout),
    seconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
    exitCode: result.status,
    failure: result.error?.message || result.stderr?.trim().slice(-500) || '',
  };
}

function writeWithRetries({ helper, path, prompt, maxTokens, minimum, maximum, force }) {
  if (!force && existsSync(path)) {
    const existing = readFileSync(path, 'utf8').trim();
    if (segmentIsUsable(existing, minimum, maximum)) {
      return { value: existing, telemetry: { resumed: true, attempts: 0, seconds: 0, words: wordCount(existing) } };
    }
  }
  const attempts = Number(process.env.SEGMENTED_MODEL_ATTEMPTS || 2);
  const timeoutMs = Number(process.env.SEGMENTED_MODEL_TIMEOUT_MS || 180000);
  let elapsedSeconds = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const retryPrompt = attempt === 1 ? prompt : `${prompt}\n\nRETRY CONTRACT: The previous response failed the required length or format check. Return between ${minimum} and ${maximum} words, in 2-4 short paragraphs. Use only the assigned evidence. Do not add names, dates, places, motives, quantities, or process details that are not stated in that evidence. Do not repeat a fact to reach the word target.`;
    const result = callWorker(helper, retryPrompt, maxTokens, timeoutMs);
    elapsedSeconds += result.seconds;
    if (segmentIsUsable(result.value, minimum, maximum)) {
      writeFileSync(path, `${result.value}\n`);
      return {
        value: result.value,
        telemetry: { resumed: false, attempts: attempt, seconds: Number(elapsedSeconds.toFixed(2)), words: wordCount(result.value) },
      };
    }
    const reason = result.failure ? `; worker: ${result.failure}` : '';
    console.warn(`[segmented-writer] ${basename(path)} attempt ${attempt}/${attempts} failed the segment contract (${wordCount(result.value)} words; required ${minimum}-${maximum}${reason})`);
  }
  throw new Error(`worker did not produce a usable segment: ${path}`);
}

export function assembleArticle(plan, opening, sectionBodies) {
  const parts = [`# ${plan.title}`, '', opening];
  for (const section of plan.sections) {
    parts.push('', `## ${section.heading}`, '', sectionBodies.get(section.id));
  }
  return `${parts.join('\n').trim()}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const postDir = join(blogDir, args.slug);
  const plan = readContentPlan(join(postDir, 'content-plan.json'), args.slug);
  const segmentDir = join(postDir, '.content-segments');
  mkdirSync(segmentDir, { recursive: true });
  const inputDigest = createHash('sha256')
    .update(readFileSync(join(postDir, 'content-plan.json')))
    .update(readFileSync(join(postDir, 'research.json')))
    .digest('hex');
  const manifestPath = join(segmentDir, 'input-manifest.json');
  let forceSegments = args.force;
  if (!forceSegments && existsSync(manifestPath)) {
    try {
      forceSegments = JSON.parse(readFileSync(manifestPath, 'utf8')).inputSha256 !== inputDigest;
    } catch {
      forceSegments = true;
    }
  } else if (!existsSync(manifestPath)) {
    forceSegments = true;
  }
  if (forceSegments && !args.force) {
    console.warn('[segmented-writer] plan or research changed; regenerating stale saved segments');
  }
  const headings = plan.sections.map((section) => section.heading).join(' | ');
  const stats = researchStats(join(postDir, 'research.json'));
  const statsByClaim = new Map(stats.map((stat) => [stat.claim, stat]));
  const plannedClaims = [...new Set(plan.sections.flatMap((section) => section.evidenceClaims || []))];
  for (const claim of plannedClaims) {
    if (!statsByClaim.has(claim)) throw new Error(`planned evidence claim is not present in research.json: ${claim}`);
  }
  if (stats.length >= 3 && plannedClaims.length < 3) {
    throw new Error('content plan must assign at least three exact research claims across its sections');
  }
  const priorQaFeedback = plan.qaFeedback
    ? `\nPrevious QA feedback, which this revision must fix: ${JSON.stringify(plan.qaFeedback.blockers || [])}\nRewrite the affected content. Do not just paraphrase the same failed paragraph.`
    : '';
  const common = `Article title: ${plan.title}\nReader promise: ${plan.readerPromise}\nAll section headings: ${headings}\nBrand: ${plan.brand}\nFactual discipline: use only the supplied source claims. Do not infer motives, emotional states, causes, prices, popularity, value, scarcity, or institutional intent unless a supplied claim states it.${priorQaFeedback}`;

  const openingResult = writeWithRetries({
    helper: args.helper,
    path: join(segmentDir, 'opening.md'),
    maxTokens: 320,
    minimum: 150,
    maximum: 240,
    force: forceSegments,
    prompt: `Write only the opening paragraphs for this sourced history article.\n\n${common}\n\nVerified facts available for this article:\n${stats.map((stat) => `- ${stat.statement || stat.claim} (Source: ${stat.source_name})`).join('\n')}\n\nRequirements:\n- 170-220 words.\n- Answer the reader promise in the first paragraph and preview the documented history.\n- Use a focused hook. Do not summarize every section or repeat its dates, numbers, or details. Use at most one specific date or quantity in the opening.\n- This is historical storytelling, not consumer advice. Use clear third-person narration.\n- No heading, preamble, code fence, placeholders, em dash, or conclusion label.\n- Do not add names, dates, places, motives, quantities, or events unless they appear in the verified facts above. Do not infer an undocumented cause.\n- Do not repeat a fact to reach the word target. Prefer plain, short context to unsourced drama.`,
  });
  const opening = openingResult.value;

  const sectionBodies = new Map();
  const telemetry = { opening: openingResult.telemetry, sections: {} };
  for (const section of plan.sections) {
    const keyPoints = section.keyPoints.map((point) => `- ${point}`).join('\n');
    const sectionStats = (section.evidenceClaims || []).map((claim) => {
      const stat = statsByClaim.get(claim);
      return `- ${stat.statement || stat.claim} (Source: ${stat.source_name})`;
    });
    const evidence = sectionStats.length
      ? sectionStats.join('\n')
      : 'No sourced facts are assigned to this section.';
    const reservedClaims = plan.sections.filter((other) => other.id !== section.id)
      .flatMap((other) => (other.evidenceClaims || []).map((claim) => {
        const stat = statsByClaim.get(claim);
        return `- ${other.heading}: ${stat?.statement || claim}`;
      }));
    const prompt = `Write exactly one section for this sourced history article.\n\n${common}\n\nYour section:\nHeading: ${section.heading}\nReader question: ${section.readerQuestion}\nPurpose: ${section.purpose}\nRequired points:\n${keyPoints}\nAssigned sourced facts:\n${evidence}\nFacts reserved for other headings; do not repeat them here:\n${reservedClaims.join('\n')}\nTarget length: ${section.targetWords} words.\n\nRequirements:\n- Write 2-4 short paragraphs and no heading.\n- Answer only this section's historical question. Do not repeat the jobs assigned to other headings.\n- Explain how the assigned fact or facts answer the question; keep historical context specific.\n- Use clear third-person narration and plain language.\n- No preamble, code fence, placeholders, em dash, filler conclusion, or generic summary.\n- Use only assigned sourced facts. Do not add names, dates, places, motives, causes, quantities, or events unless stated in the assigned evidence. If no evidence is assigned, write only a brief transition grounded in facts established earlier. Do not invent material to reach the target length.`;
    const sectionResult = writeWithRetries({
      helper: args.helper,
      path: join(segmentDir, `${section.id}.md`),
      prompt,
      maxTokens: 340,
    minimum: Math.max(80, section.targetWords - (plan.editorialProfile === 'coin-history' ? 50 : 30)),
      maximum: Math.min(220, section.targetWords + 35),
      force: forceSegments,
    });
    sectionBodies.set(section.id, sectionResult.value);
    telemetry.sections[section.id] = sectionResult.telemetry;
  }

  const article = assembleArticle(plan, opening, sectionBodies);
  const minimumArticleWords = plan.editorialProfile === 'coin-history' ? 550 : 800;
  if (wordCount(article) < minimumArticleWords) throw new Error(`assembled article is undersized: ${wordCount(article)} words; minimum ${minimumArticleWords}`);
  const output = join(postDir, 'verified.md');
  writeFileSync(output, article);
  writeFileSync(manifestPath, `${JSON.stringify({ version: 1, inputSha256: inputDigest, updatedAt: new Date().toISOString() }, null, 2)}\n`);

  const sanitizer = spawnSync('python3', [join(scriptDir, 'sanitize-draft.py'), output], { stdio: 'inherit' });
  if (sanitizer.status !== 0) throw new Error('deterministic draft sanitizer failed');
  const lint = spawnSync('node', [join(scriptDir, 'lint-draft.mjs'), output, `--out=${join(postDir, 'lint.json')}`, '--quiet'], { stdio: 'inherit' });
  writeFileSync(join(postDir, 'content-segments.json'), `${JSON.stringify({
    version: 1,
    slug: plan.slug,
    planVersion: plan.version,
    model: process.env.SEGMENTED_LOCAL_MODEL || process.env.HERMES_LOCAL_MODEL || process.env.HERMES_ARTICLE_MODEL || 'gemma3:4b-it-qat',
    helper: args.helper,
    generatedAt: new Date().toISOString(),
    totalWords: wordCount(readFileSync(output, 'utf8')),
    telemetry,
  }, null, 2)}\n`);
  console.log(`[segmented-writer] wrote ${output} from ${plan.sections.length} resumable worker segments`);
  process.exit(lint.status === 0 ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[segmented-writer] ${error.message}`);
    process.exit(5);
  }
}
