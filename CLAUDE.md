# Claude Operating Instructions - Fused Distribution

Read these files before changing blog, social, or video workflow code:

1. `docs/WORKFLOW-OWNERSHIP.md`
2. `public/blog/BLOG-SOP.md`
3. `video/REEL-SOP.md`
4. `SOCIAL-SOP.md`

## Authority And Roles

- Nick Hughes is the final business owner.
- Robert Paulson operating through Codex owns workflow architecture, gates, automation, deploy safety, and incident follow-up.
- Claude is the editorial, research, creative, and QA specialist. Do not replace or bypass deterministic gates.
- Gemma and Hermes may draft or research. Their output is untrusted until validation passes.

## Active Reel Standard

- Produce one long-form vertical reel per approved blog post, not three short reels.
- Output: `video/out/<slug>/<slug>.mp4` at 1080x1920.
- Use `public/blog/<slug>/reel-data.md` and approved blog content as sources.
- The script is `public/blog/<slug>/reel-script.md`, uses `format: long-form`, and ends with `## QUESTION`.
- Do not render a post absent from `public/blog/posts.json` or one that failed blog QA.
- Do not invent facts, numbers, citations, chart labels, or chart values.

## Remotion Rules

- Animate with `useCurrentFrame()`, `interpolate()`, `spring()`, `Sequence`, `Series`, or `TransitionSeries`.
- Never use CSS transitions, CSS keyframes, or Tailwind animation classes.
- Premount every `Sequence` when adding or changing sequences.
- Keep all Remotion packages pinned to the same exact version.
- Use `staticFile()` and Remotion media components for assets.
- Fit variable text with `@remotion/layout-utils` after fonts load. Measurement and rendered font properties must match.
- Text must fit its box at 1080x1920. Never hide overflow instead of fitting text.
- Captions remain JSON timing data.

## Mandatory Gates

Run from `video/`:

```bash
npm test
node scripts/parse-script.mjs --post=<slug>
node scripts/validate-reel.mjs --script=out/<slug>/script.json
```

Validation errors block TTS and render. Review warnings instead of ignoring them blindly.

Before reporting success:

1. Render using the command in `video/REEL-SOP.md`.
2. Verify the MP4 and non-zero duration with `ffprobe`.
3. Inspect hook, body/stat, chart, and question frames for clipping or overlap.
4. Confirm captions match narration at three points.
5. Report commands, output path, validation result, and unresolved warnings.

## Resource And Safety Rules

- Default automated voice is Chatterbox using Nick's local voice reference. Pass `--voice=chatterbox` explicitly. Zoe is an opt-in recovery voice only when Nick approves it.
- Optional Claude creative stages must never block the core blog publish path.
- Never put credentials in tracked files, prompts, logs, launchd plists, or generated content.
- Never publish QA-failed artifacts. Preserve them outside `public/` in `.workflow-blocked/`.
- Do not claim a render, test, deploy, or verification succeeded unless the command completed and its result was checked.
