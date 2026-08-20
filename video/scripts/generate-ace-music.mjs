import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const videoDir = resolve(__dirname, '..');
const repoRoot = resolve(videoDir, '..');
const pythonBin = join(repoRoot, '.local-tools', 'ace-step-venv', 'bin', 'python');
const helperPath = join(videoDir, 'scripts', 'ace-step-generate.py');
const defaultCheckpointPath = join(repoRoot, '.model-cache', 'ace-step', 'checkpoints');
const defaultCandidateRoot = join(videoDir, 'music-candidates', 'ace-step');

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--')) {
      const [rawKey, ...rawValue] = arg.slice(2).split('=');
      const key = rawKey.replaceAll('-', '_');
      options[key] = rawValue.length > 0 ? rawValue.join('=') : true;
    }
  }
  return options;
}

function usage() {
  return `Usage:
  npm run video:music:ace -- --prompt="instrumental..." [options]

Options:
  --prompt=<text>             Required style/use-case prompt for ACE-Step.
  --lyrics=<text>             Defaults to [inst]. Keep production beds instrumental.
  --duration=<seconds>        Defaults to 90.
  --steps=<count>             Defaults to 27 for faster drafts; use 60 for final candidates.
  --seed=<integer>            Optional deterministic seed.
  --name=<file-base>          Defaults to ace-step-candidate.
  --checkpoint-path=<path>    Defaults to .model-cache/ace-step/checkpoints.
  --output-dir=<path>         Defaults to a timestamped folder in video/music-candidates/ace-step.
  --cpu-offload=true          Enable ACE-Step CPU offload.
  --overlapped-decode=true    Enable overlapped decode for longer tracks.
  --force-cpu=true            Disable MPS/Metal and run on CPU to avoid MPS memory caps.
  --bf16=true                 Enable bfloat16. Keep false on macOS unless verified.

Generated files are candidates only. Promote a reviewed candidate with:
  npm run video:music:register -- --source=<candidate.wav> --id=fused-ace-01 --title="Fused ACE 01"
`;
}

function boolOption(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}

if (!options.prompt || String(options.prompt).trim() === '') {
  console.error('Missing required --prompt.');
  console.error(usage());
  process.exit(1);
}

if (!existsSync(pythonBin)) {
  console.error(`ACE-Step venv not found at ${pythonBin}. Run the local setup first.`);
  process.exit(1);
}

if (!existsSync(helperPath)) {
  console.error(`ACE-Step helper not found at ${helperPath}.`);
  process.exit(1);
}

const timestamp = new Date().toISOString().replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
const outputDir = resolve(options.output_dir ?? join(defaultCandidateRoot, timestamp));
mkdirSync(outputDir, { recursive: true });
mkdirSync(resolve(options.checkpoint_path ?? defaultCheckpointPath), { recursive: true });

const checkpointPath = resolve(options.checkpoint_path ?? defaultCheckpointPath);
const name = String(options.name ?? 'ace-step-candidate').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'ace-step-candidate';

const requiredModelDirs = ['music_dcae_f8c8', 'music_vocoder', 'ace_step_transformer', 'umt5-base'];
const hasFlatCheckpoint = requiredModelDirs.every((dir) => existsSync(join(checkpointPath, dir)));
const hasHuggingFaceSnapshot = existsSync(join(checkpointPath, 'models--ACE-Step--ACE-Step-v1-3.5B', 'snapshots'));
if (!hasFlatCheckpoint && !hasHuggingFaceSnapshot) {
  console.warn(`ACE-Step checkpoints are not fully present in ${checkpointPath}. The first generation may download the model from Hugging Face and take a while.`);
}

const args = [
  helperPath,
  '--checkpoint-path', checkpointPath,
  '--output-dir', outputDir,
  '--name', name,
  '--prompt', String(options.prompt),
  '--lyrics', String(options.lyrics ?? '[inst]'),
  '--duration', String(options.duration ?? 90),
  '--steps', String(options.steps ?? 27),
  '--guidance-scale', String(options.guidance_scale ?? 15),
  '--scheduler-type', String(options.scheduler_type ?? 'euler'),
  '--cfg-type', String(options.cfg_type ?? 'apg'),
  '--omega-scale', String(options.omega_scale ?? 10),
];

if (options.seed !== undefined) args.push('--seed', String(options.seed));
if (boolOption(options.bf16)) args.push('--bf16');
if (boolOption(options.cpu_offload)) args.push('--cpu-offload');
if (boolOption(options.overlapped_decode)) args.push('--overlapped-decode');
if (boolOption(options.force_cpu)) args.push('--force-cpu');

const result = spawnSync(pythonBin, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    TOKENIZERS_PARALLELISM: 'false',
    PYTORCH_ENABLE_MPS_FALLBACK: process.env.PYTORCH_ENABLE_MPS_FALLBACK ?? '1',
  },
});

process.exit(result.status ?? 1);
