import {spawnSync} from 'node:child_process';
import {readFileSync, existsSync, mkdirSync, copyFileSync, realpathSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const requiredPlatforms = ['youtube', 'instagram', 'x', 'facebook', 'website'];
const text = value => typeof value === 'string' && value.trim().length > 0;

// Keep this contract small enough for routine production to validate without an LLM.
export function validateEnrichmentPlan(plan, segmentCount) {
  if (plan.version !== 1 || !Array.isArray(plan.graphics) || !plan.graphics.length
    || !Array.isArray(plan.soundEffects) || plan.soundEffects.length < 2) {
    throw Error('Enrichment requires version 1, an explanatory graphic and at least two purposeful sound cues');
  }
  const bodyIndex = index => Number.isInteger(index) && index > 0 && index < segmentCount - 1;
  if (new Set(plan.graphics.map(graphic => graphic.segmentIndex)).size !== plan.graphics.length) throw Error('Use one composed graphic per scene');
  for (const graphic of plan.graphics) {
    if (!bodyIndex(graphic.segmentIndex) || !['flow', 'table', 'bar'].includes(graphic.kind)
      || !text(graphic.title) || graphic.title.length > 70 || !text(graphic.source)
      || graphic.source.length > 140 || !text(graphic.takeaway) || graphic.takeaway.length > 120 || !Array.isArray(graphic.rows)
      || graphic.rows.length < 2 || graphic.rows.length > 4) throw Error('Invalid explanatory graphic');
    for (const row of graphic.rows) {
      if (!text(row.label) || row.label.length > 55 || typeof row.detail !== 'string' || row.detail.length > 65
        || (graphic.kind === 'bar' && (!Number.isFinite(row.value) || row.value < 0))) throw Error('Invalid graphic row');
    }
    if (graphic.kind === 'bar' && (!text(graphic.unit) || !text(graphic.period)
      || !graphic.rows.some(row => row.value > 0))) throw Error('Bar chart requires unit, period and nonzero values');
  }
  if (new Set(plan.soundEffects.map(cue => cue.segmentIndex)).size < 2) throw Error('Sound cues must support two different body beats');
  for (const cue of plan.soundEffects) {
    if (!bodyIndex(cue.segmentIndex) || !text(cue.purpose) || !/^[a-z0-9-]+\.mp3$/.test(cue.file)
      || !Number.isFinite(cue.sourceStartSeconds) || cue.sourceStartSeconds < 0
      || !Number.isFinite(cue.durationSeconds) || cue.durationSeconds < 0.1 || cue.durationSeconds > 1.2) {
      throw Error('Invalid sound cue: use a reviewed 0.1–1.2 second body accent');
    }
  }
  return plan;
}

export function probeSoundCue(source, cue) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(cue.sourceStartSeconds), '-t', String(cue.durationSeconds), '-i', source, '-af', 'volumedetect', '-f', 'null', '-'], {encoding:'utf8', timeout:10000, maxBuffer:1024*1024});
  const mean = Number(result.stderr?.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
  const peak = Number(result.stderr?.match(/max_volume: (-?[\d.]+) dB/)?.[1]);
  if (result.status !== 0 || !Number.isFinite(mean) || !Number.isFinite(peak) || mean < -60 || peak < -45) {
    throw Error(`Sound cue is silent, inaudible or undecodable: ${cue.file}; select an audible excerpt`);
  }
  return {mean, peak};
}

export function prepareEnrichment(root, slug, segmentCount, {stage = true, probe = probeSoundCue} = {}) {
  const dir = join(root, 'public/blog', slug);
  const bytes = readFileSync(join(dir, 'enrichment-plan.json'));
  const sha256 = digest(bytes);
  const qa = JSON.parse(readFileSync(join(dir, 'qa.json')));
  if (qa.artifactSha256?.['enrichment-plan.json'] !== sha256) throw Error('Enrichment plan needs current editorial approval');
  const plan = validateEnrichmentPlan(JSON.parse(bytes), segmentCount);
  const rights = JSON.parse(readFileSync(join(root, 'video/data/sound-effects-rights.json'))).effects;
  const privateRoot = realpathSync(join(root, 'video/private-audio')) + sep;
  const measured = new Map();
  const soundEffects = plan.soundEffects.map(cue => {
    const entry = rights[cue.file];
    if (!entry || entry.status !== 'approved' || !Number.isFinite(entry.integratedLufs)
      || !requiredPlatforms.every(platform => entry.allowedPlatforms?.includes(platform))
      || cue.sourceStartSeconds + cue.durationSeconds > entry.durationSeconds) throw Error(`Sound rights or trim invalid: ${cue.file}`);
    const source = realpathSync(resolve(root, entry.privatePath));
    if (!source.startsWith(privateRoot) || digest(readFileSync(source)) !== entry.sha256
      || !existsSync(resolve(root, entry.licenseEvidence))) throw Error(`Sound source/evidence changed: ${cue.file}`);
    const destination = join(root, 'video/public/sfx', cue.file);
    if (stage) { mkdirSync(join(root, 'video/public/sfx'), {recursive:true}); copyFileSync(source, destination); }
    if (!existsSync(destination) || digest(readFileSync(destination)) !== entry.sha256) throw Error(`Staged sound changed: ${cue.file}`);
    const key = `${source}:${cue.sourceStartSeconds}:${cue.durationSeconds}`;
    if (!measured.has(key)) measured.set(key, probe(source, cue));
    const level = measured.get(key);
    // Quiet accents under narration; never amplify a quiet ambience to a loud transient.
    return {...cue, src:`sfx/${cue.file}`, sha256:entry.sha256, gain:Math.min(0.5, 10 ** ((-34 - level.mean) / 20), 10 ** ((-14 - level.peak) / 20))};
  });
  return {version:1, sha256, graphics:plan.graphics, soundEffects};
}

export function endingCaptionErrors(script, captions) {
  const index = script.segments.length - 1;
  const words = value => String(value).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const approved = new Set(words(script.segments[index].narration));
  const unexpected = words((captions[index] ?? []).map(chunk => chunk.text).join(' ')).filter(word => !approved.has(word));
  return unexpected.length ? [`Ending captions contain words absent from approved narration: ${[...new Set(unexpected)].join(', ')}`] : [];
}
