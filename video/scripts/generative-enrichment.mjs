import {createHash} from 'node:crypto';
import {accessSync, constants, existsSync, mkdirSync, statSync, unlinkSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {spawn} from 'node:child_process';

const DEFAULT_MODEL_FILENAME = 'DreamShaper_8_pruned.safetensors';
const DEFAULT_MODEL_ID = 'dreamshaper-8';
const DEFAULT_MODEL_LICENSE = 'creativeml-openrail-m';
const DEFAULT_SOURCE_URL = 'https://github.com/anil-matcha/open-generative-ai';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function commandOutput(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }, 5000).unref();
    }, options.timeoutMs ?? 180000);

    const collect = (chunk) => {
      output = `${output}${chunk}`.slice(-12000);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        rejectPromise(new Error(`${basename(command)} timed out after ${options.timeoutMs ?? 180000}ms`));
      } else if (code !== 0) {
        rejectPromise(new Error(`${basename(command)} exited with code ${code}: ${output.trim().slice(-2000)}`));
      } else {
        resolvePromise(output);
      }
    });
  });
}

export function openGenerativeAiEnabled(env = process.env) {
  return env.GENERATIVE_MEDIA_ENABLED === '1';
}

export function generativeMediaMode(env = process.env) {
  return env.GENERATIVE_MEDIA_MODE === 'production'
    && env.GENERATIVE_MEDIA_PRODUCTION_APPROVED === '1'
    ? 'production'
    : 'shadow';
}

export function selectBackgroundProfile({segment, topic}) {
  const text = String(segment?.text || segment?.title || '').toLowerCase();
  if (topic === 'silver') {
    if (/mine|mining|supply|deficit|shortage/.test(text)) {
      return {id: 'silver-mine', scene: 'a shadowed underground mine tunnel with soft silver-blue light reflecting through mineral textures'};
    }
    if (/solar|electric vehicle|industrial|manufactur|electronics/.test(text)) {
      return {id: 'silver-industrial', scene: 'a clean futuristic industrial space with soft solar-grid reflections and brushed metal surfaces'};
    }
    if (/comex|inventory|warehouse|delivery/.test(text)) {
      return {id: 'silver-warehouse', scene: 'a deep secure warehouse corridor with unmarked storage doors, cool metallic light, and atmospheric depth'};
    }
    if (/coin|bullion|bar|stack|vault|safe|storage|estate|inherit|collect/.test(text)) {
      return {id: 'silver-vault', scene: 'a dim secure vault interior with an open antique collector chest, brushed metal reflections, and no visible currency details'};
    }
    if (/price|market|dollar cost|average|portfolio|invest|premium|spot/.test(text)) {
      return {id: 'silver-market', scene: 'a dark vault corridor with repeating silver-blue light bands suggesting steady intervals and measured progress'};
    }
    return {id: 'silver-general', scene: 'an abstract dark metallic chamber with cool silver reflections, soft particles, and layered atmospheric depth'};
  }

  if (/email|social|message|sms|communication|customer service|follow.?up/.test(text)) {
    return {id: 'tech-communication', scene: 'a modern workspace at night with soft wireless communication waves and connected cyan light trails'};
  }
  if (/seo|google|map|review|local|search|listing/.test(text)) {
    return {id: 'tech-local-search', scene: 'a quiet small-business street at blue hour with subtle connected location lights and no readable signs'};
  }
  if (/automation|artificial intelligence|\bai\b|workflow|repetitive/.test(text)) {
    return {id: 'tech-automation', scene: 'an abstract dark operations space with flowing connected nodes, orderly pathways, and soft cyan energy'};
  }
  if (/website|analytics|data|speed|conversion|online/.test(text)) {
    return {id: 'tech-data', scene: 'a dark modern data corridor with flowing light streams, glass surfaces, and soft cyan reflections'};
  }
  if (/booking|appointment|schedule|calendar/.test(text)) {
    return {id: 'tech-scheduling', scene: 'a calm modern reception space with a sequence of illuminated pathways suggesting organized appointments'};
  }
  return {id: 'tech-general', scene: 'a polished dark modern workspace with subtle connected lights, depth, and a restrained cyan accent'};
}

export function selectBackgroundScene(input) {
  return selectBackgroundProfile(input).scene;
}

export function buildEnrichmentPrompt({segment, topic}) {
  const scene = selectBackgroundProfile({segment, topic}).scene;
  const palette = topic === 'silver'
    ? 'dark charcoal background, cool silver highlights, subtle cyan accent'
    : 'dark navy background, modern cyan highlights, warm practical lighting';
  return [
    `Atmospheric vertical background plate showing ${scene}.`,
    `${palette}. Soft focus, low detail, cinematic depth, no foreground focal object, clean negative space through the center for a separate caption overlay.`,
    'Background scenery only. No poster, title card, package, label, sign, screen, interface, document, coin face, currency, or product close-up.',
    'No words, letters, numbers, charts, logos, watermarks, signatures, recognizable people, or financial claims.',
  ].join(' ');
}

export function deterministicEnrichmentSeed(slug, index) {
  const digest = createHash('sha256').update(`${slug}:${index}`).digest();
  return digest.readUInt32BE(0) & 0x7fffffff;
}

export function resolveOpenGenerativeAiPaths(env = process.env) {
  const dataDir = resolve(env.OPEN_GENERATIVE_AI_LOCAL_AI_DIR
    || join(homedir(), 'Library', 'Application Support', 'open-generative-ai', 'local-ai'));
  return {
    dataDir,
    binaryPath: resolve(env.OPEN_GENERATIVE_AI_SD_CLI || join(dataDir, 'bin', 'sd-cli')),
    modelPath: resolve(env.OPEN_GENERATIVE_AI_MODEL_PATH || join(dataDir, 'models', DEFAULT_MODEL_FILENAME)),
  };
}

export function enrichmentCacheKey({slug, index, segment, topic, env = process.env}) {
  const prompt = buildEnrichmentPrompt({segment, topic});
  const paths = resolveOpenGenerativeAiPaths(env);
  return JSON.stringify({
    profileVersion: 2,
    provider: 'open-generative-ai-local',
    model: env.OPEN_GENERATIVE_AI_MODEL_ID || DEFAULT_MODEL_ID,
    modelFile: basename(paths.modelPath),
    promptHash: createHash('sha256').update(prompt).digest('hex'),
    seed: deterministicEnrichmentSeed(slug, index),
    width: positiveInteger(env.GENERATIVE_MEDIA_WIDTH, 384),
    height: positiveInteger(env.GENERATIVE_MEDIA_HEIGHT, 640),
    steps: positiveInteger(env.GENERATIVE_MEDIA_STEPS, 8),
  });
}

function assertRunnableFile(path, label) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
  accessSync(path, constants.R_OK);
}

export async function generateEnrichmentStill({slug, index, segment, topic, destination, env = process.env}) {
  const {dataDir, binaryPath, modelPath} = resolveOpenGenerativeAiPaths(env);
  assertRunnableFile(binaryPath, 'Open Generative AI sd-cli');
  assertRunnableFile(modelPath, 'Open Generative AI model');
  accessSync(binaryPath, constants.X_OK);

  const prompt = buildEnrichmentPrompt({segment, topic});
  const seed = deterministicEnrichmentSeed(slug, index);
  const width = positiveInteger(env.GENERATIVE_MEDIA_WIDTH, 384);
  const height = positiveInteger(env.GENERATIVE_MEDIA_HEIGHT, 640);
  const steps = positiveInteger(env.GENERATIVE_MEDIA_STEPS, 8);
  const timeoutMs = positiveInteger(env.GENERATIVE_MEDIA_TIMEOUT_MS, 240000);
  const pngPath = `${destination}.open-generative-ai.png`;
  mkdirSync(dirname(destination), {recursive: true});

  try {
    await commandOutput(binaryPath, [
      '-m', modelPath,
      '-p', prompt,
      '-n', 'text, letters, numbers, logo, watermark, signature, deformed objects, duplicate objects, blurry, low contrast',
      '-o', pngPath,
      '--steps', String(steps),
      '-H', String(height),
      '-W', String(width),
      '--cfg-scale', '7.5',
      '--seed', String(seed),
      '--sampling-method', 'euler_a',
      '--vae-tiling',
    ], {
      cwd: dataDir,
      timeoutMs,
      env: {
        ...env,
        DYLD_LIBRARY_PATH: dirname(binaryPath),
        LD_LIBRARY_PATH: dirname(binaryPath),
      },
    });
    if (!existsSync(pngPath) || statSync(pngPath).size < 10240) {
      throw new Error('Open Generative AI returned an empty or undersized image');
    }
    await commandOutput(env.FFMPEG_BIN || 'ffmpeg', [
      '-y', '-i', pngPath,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=6,eq=brightness=-0.14:saturation=0.7:contrast=0.92,vignette=PI/5',
      '-frames:v', '1', '-q:v', '2', destination,
    ], {timeoutMs: 60000, env});
    if (!existsSync(destination) || statSync(destination).size < 10240) {
      throw new Error('Generated portrait JPEG is empty or undersized');
    }
  } finally {
    try { unlinkSync(pngPath); } catch {}
  }

  const profile = selectBackgroundProfile({segment, topic});
  return {
    source: 'open-generative-ai-local',
    providerVersion: 'c90e908',
    sourceUrl: DEFAULT_SOURCE_URL,
    applicationLicense: 'MIT',
    model: env.OPEN_GENERATIVE_AI_MODEL_ID || DEFAULT_MODEL_ID,
    modelFile: basename(modelPath),
    modelLicense: env.OPEN_GENERATIVE_AI_MODEL_LICENSE
      || (basename(modelPath) === DEFAULT_MODEL_FILENAME ? DEFAULT_MODEL_LICENSE : 'unverified'),
    prompt,
    topic,
    sceneId: profile.id,
    scene: profile.scene,
    promptHash: createHash('sha256').update(prompt).digest('hex'),
    seed,
    width: 1080,
    height: 1920,
    generatedAsset: true,
    factualGraphic: false,
    backgroundTreatment: 'portrait-crop, blur-6, darken-0.14, saturation-0.7, vignette',
  };
}
