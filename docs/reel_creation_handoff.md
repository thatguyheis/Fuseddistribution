# Reel Creation Handoff

Prepared 2026-10-23. Scope: how the vertical history reel is planned, voiced, captioned, rendered and released from this repo. Social posting is out of scope except where they set a release gate.

Terms used below:
- `<repo>`: repo root.
- `<slug>`: the episode ID (kebab case, for example `fort-vancouver-centennial-half-dollar`).
- `<source-dir>/<slug>/`: the per-episode source package under `public/` that holds `reel-data.md`, `reel-script.md`, `hero.jpg`, `images/`, `qa.json`.
- `<workup>/<slug>/`: research workup at `content/coin-history/<slug>/`.
- "Owner": the business owner. Final authority on scope, approvals, voice and music.

---

## 1. Key takeaways

1. Current scope is **coin history episodes only**. One reel per approved episode, target 3 finished reels per Pacific day.
2. Reel spec: **720 x 1280, 30 fps, H.264, AAC 192 kbps, 100 to 135 s measured from the final MP4, strictly under 50,000,000 bytes** (target 44 MB).
3. Script: **280 to 330 words**, hook, chronology, payoff, ends on a **spoken question card of 10 words or fewer**. Script is hash-approved before any audio is generated.
4. Stack: **Remotion 4.0.479** (React), **Chatterbox Standard** TTS with the owner's voice reference, **local faster-whisper** captions, cleared music from a trusted cycle, local **Ollama gemma3:4b** for drafting and vision checks.
5. Every gate fails closed. Never weaken a validator, never speed up or cut narration, never invent facts, never generate or sharpen coin details into evidence.
6. Precedence when docs disagree: owner instruction > `docs/SOURCE-OF-TRUTH.md` > `ops/content-scope.json` > `docs/COIN-HISTORY-SOP.md` > `video/REEL-SOP.md` > everything else in `docs/` (history only).

---

## 2. Read order

| # | File | Why |
|---|---|---|
| 1 | `docs/SOURCE-OF-TRUTH.md` | Scope, standards table, roles, schedule, git policy. Wins over everything. |
| 2 | `docs/COIN-HISTORY-SOP.md` | Story, transcript, imagery, claim to image matching, delivery and release rules for coin episodes. |
| 3 | `video/REEL-SOP.md` | Render pipeline detail, script format, timing math, music, media, checklists. Older sections (180 to 240 s, silver/tech CTAs, 1080x1920) are superseded by items 1 and 2. |
| 4 | `docs/REEL-PRESENTATION-PROFILE.md` | `--quality=presentation` mode used for coin episodes. |
| 5 | `docs/REEL-ENRICHMENT-SOP.md` | Visual enrichment, generated and stock media library rules. |
| 6 | `docs/REEL-OPENING-SOP.md` | Frame zero hero image rules. |
| 7 | `docs/WHISPER-CAPTIONS-SOP.md` | Caption runtime setup and recovery. |
| 8 | `docs/AUDIO-SOURCE-SOP.md` | Music rights, narration profile, retired tracks. |
| 9 | Project `CLAUDE.md` / `AGENTS.md` | Agent rules for Remotion code and mandatory gates. |

Reference episode: `content/coin-history/fort-vancouver-centennial-half-dollar/` (`narration-v2-approved.txt`, `build-plan-v2.mjs`, `scene-plan.md`, `production-status.json`). Nine narration sections, 19 shots. Treat it as the creative standard. The 1080p version in that folder is archive only.

Do not use `content/coin-history/morgan-dollar-o-mint-mark-new-orleans/` as evidence for anything. Its mint mark identification was wrong and is a documented exception.

---

## 3. Repo map (reel side)

```
video/
  package.json            Remotion 4.0.479 + transitions, google-fonts, layout-utils (all pinned, same version)
  remotion.config.ts
  tts-runtime.json        Chatterbox model revision, voice reference, generation settings
  whisper-runtime.json    faster-whisper base.en, CPU int8, word timestamps
  src/
    Root.tsx              Composition registration and duration
    compositions/         Main reel composition, EditorialDataBoard, PaperCollagePilot
    components/           HookCard, StatCard, ChartCard, OverlayCard, QuestionCard, CTACard,
                          Subtitle, FittedText, MediaBg, PhotoBg, MediaFeature, OpeningHero,
                          OwnedMediaSequence, PresentationScene, InlineGraphic
    brand.ts fonts.ts types.ts storyboard.ts
  scripts/
    render.mjs            Orchestrator: parse > audio > media > captions > Remotion render
    parse-script.mjs      reel-script.md -> out/<slug>/script.json
    validate-reel.mjs     Script validation gate (blocks TTS and render)
    generate-audio.mjs    Chatterbox narration, cache keyed by narration + voice + profile
    chatterbox-tts.py     TTS worker; tts_chunks.py / tts_settings.py
    generate-captions.mjs Whisper captions; transcribe-local.py, setup-whisper.py
    fetch-media.mjs       Background media (owned, generated library, stock)
    owned-media.mjs       Validates preferred-media.json plans before staging
    presentation-plan.mjs Validates presentation-plan.json
    approved-sources.mjs  Rechecks transcript/source hashes before render
    coin-image-relevance.mjs  Coin image identity checks
    auto-visual-review.py Six-frame local vision review of the encoded MP4
    release-reel.mjs      Release gate (duration, size, voice, captions, music, hashes)
    fit-upload-size.mjs   Two-pass H.264 size fit to 44 MB
    audit-audio-rights.mjs, music-mix.mjs, transition-timing.mjs, audio-timing.mjs
    *.test.mjs            node --test suite (npm test)
  data/
    audio-rights.json     Music rights database; policy.trustedCycle = only eligible tracks
    sound-effects-rights.json, social-distribution.json, performance.json
  out/<slug>/             Render output (local only, metadata may be committed)
  public/audio/<slug>/    Generated narration (ignored)
  public/photos/<slug>/   Staged background media
  public/music/           Renderer copies of music
  voice-sample/           Voice reference WAV (ignored)
  local/                  Generated-background and stock-media libraries (ignored)
  private-audio/          Original licensed music files (ignored)

scripts/render-missing-reels.sh       Scheduled renderer (single-flight, locks, retries, timeouts)
scripts/run-coin-history-drafts.py    Coin worker: drafts, QA, then hands off to render
scripts/prepare-coin-history-batch.mjs Builds and queues an episode package from a manifest
content/coin-history/                 Episode workups, queue.json, next-ideas/
content/coin-library/catalog.json     Owner coin photo catalog (originals in "Coin Raw/", local only)
launchagents/                         launchd plist definitions
ops/content-scope.json                Scope switch: scope=coin-history, dailyTarget=3
```

---

## 4. Episode lifecycle (reel view)

| Step | What | Output | Gate |
|---|---|---|---|
| 1 | Pick topic: a coin with a real story, prefer owner photos and unused subjects | prep list entry | Not a repeat of an existing slug |
| 2 | Research from primary sources (U.S. Mint, museums, archives, NPS, Library of Congress) | `<workup>/<slug>/research.json`, `claim-map.json`, `overview.md` | Every claim mapped to a source |
| 3 | Transcript | `narration-v1-approved.txt`, `script-approval.json` with SHA-256 | Automated audit (section 5) |
| 4 | Images: owner coin crop, sourced context photos, labeled AI support scenes | `artwork-source/`, `preferred-media.json` or `presentation-plan.json` | Local vision match of each coin image at intake and again pre-render, confidence >= 0.85, hashes bound |
| 5 | Source package | `<source-dir>/<slug>/` incl. `reel-script.md` | Files present |
| 6 | Queue | append `{slug, keyword}` to `content/coin-history/queue.json` | Only after package validation and first image match pass |
| 7 | Render | `video/out/<slug>/<slug>.mp4` | Duration, size, voice, captions, music, hashes |
| 8 | Release QA | `video/out/<slug>/release-qa.json` | `readyForPosting: true` |

Package command: `node scripts/prepare-coin-history-batch.mjs --manifest=<path>`.

The coin worker handles one episode at a time. Keep at least 3 complete, unprocessed packages queued each morning. Queue health and throughput are written to `.workflow-state/coin-history-drafts/queue-health.json` and `throughput.json`.

---

## 5. Story and transcript rules

- The coin is the doorway; most of the narration is what the person, place, event or institution actually did. Return to the coin for the payoff.
- Structure: hook with a promise, chronological or cause and effect explanation, explicit payoff, final question.
- At least **four substantive sourced details** that explain how something worked or changed. Names and dates alone do not count.
- 280 to 330 words, target 110 to 130 s at the measured voice pace. Word count is an estimate; the measured audio decides.
- Final question: source-neutral, 10 words or fewer, part of the transcript **before** hashing.
- No unsupported superlatives, rarity, value, authenticity or investment claims. No fictional dialogue or invented scenes presented as evidence.
- Hook planning fields (save all seven): subject, hook, promise, explanation, visual support, payoff, variety.
- Automated approval passes only when: every factual sentence maps to a primary source, four details present, hook has a visible verified payoff, script fits the duration target, topic is distinct from recent coverage, no open identity, rights or sensitive-claim flags. Save transcript, audit results, approval evidence and SHA-256.
- Any substantive change after approval means re-running the audit and regenerating the hash. Spelling and punctuation fixes in captions can keep timing if the spoken words are unchanged.
- Too long after real TTS? Cut only redundant or vague passages, keep sourced facts and the hook payoff, re-audit, re-hash, regenerate only changed segments. Never speed up or clip.

Writing style for all on-screen text and narration: plain first person, **no em dashes**, no hyphenated words in prose, no AI buzzwords. TTS: write "percent" not "%", "USA" not "US".

---

## 6. Imagery rules

- Owner coin photos first (`content/coin-library/catalog.json`). Inspect the full original before trusting a catalog title.
- For each coin evidence image record: coin identity, catalog ID or verified source, source hash, crop hash, crop coordinates, and the visible date/design/inscription that supports the claim.
- **Never** generate, retouch or sharpen coin details. Never infer date, mint, grade or a paired reverse from another file. Holder or slab text is only holder text.
- Unclear feature = mark unverified and drop the specimen claim, or choose another image.
- Context photos must map to a specific sourced claim. Paintings and engravings are illustrations. Reconstructed sites are not period buildings.
- AI imagery is supporting atmosphere only, always labeled, never a named person, exact coin or historical event as evidence.
- Plan roughly 15 to 22 purposeful shots for a two minute episode. Stock video optional, never filler.
- Local image generation profile: 384 x 640, 20 steps, up to four hours per image. One heavy local job at a time (image gen, TTS and encoding must not overlap). Larger sizes exhaust the 8 GB machine.
- Generated and stock assets live in `video/local/generated-backgrounds/` and `video/local/stock-media/` with prompt, model, seed, hashes, license and review state. Reuse reviewed matches before generating.
- Frame zero is the approved hero image (`hero.jpg`), fully visible for 1 s then a 0.2 s fade. Hero hash is checked against editorial approval. Preview at 360 x 640: headline must be readable without zoom.
- Captions stay in the bottom safe region; factual labels sit above it. Titles clear before the next title during a dissolve.

---

## 7. Script file format

Coin episodes are built from the approved transcript and recorded beat labels; the worker rebuilds `reel-script.md` from them before synthesis. If you hand-edit or debug, the parser expects:

```markdown
# Reel Script: [Title]
Generated: YYYY-MM-DD
Target length: 118 seconds
Format: Long Form
Hook type: [Contradiction | Pain Point | Immediate Value | Contrarian Stat]

---

## HOOK (0-8s)
Text: SHORT HOOK IN CAPS
Narration: One sentence.

---

## BODY

**Overlay 1** (8-22s)
Text: SHORT CLAIM
Narration: Two to four sentences.

**Stat 1** (22-36s)
Text: 1925 FORT CENTENNIAL
Narration: ...

**Chart** (36-54s)
Title: Chart Heading
Bars:
- Label: 50
- Label: 25
Narration: ...

---

## QUESTION (106-118s)
Text: COMPLETE QUESTION ENDING IN A QUESTION MARK?
Subtext: SHORT DIRECTIVE
Narration:
```

Parser rules that bite:
- Timestamps are whole integers. A decimal silently drops the segment.
- `Target length:` must equal the last segment end time, or the video ends in black.
- Text values never wrapped in quotes. Every segment has a `Text:`.
- A Stat whose narration contains a figure must show that figure in `Text:` (validator errors otherwise; years 1900 to 2100 ignored).
- QUESTION `Text:` must be a complete question; the parser voices it aloud.
- Charts: visible x and y axis labels naming dimension and unit (pie/donut: measure label plus legend). Missing labels block release. Every chart value must exist in the sources.
- Timing planning formula per segment: `words / 2.5 + 2 = minimum seconds`. Final timing comes from measured Chatterbox audio (`audio-timing.json`); do not hand-pad timings.

---

## 8. Toolchain setup

Hardware reference: macOS, 8 GB Apple Silicon. Everything runs locally; no paid remote model in scheduled jobs.

| Component | Setup | Notes |
|---|---|---|
| Node + Remotion | `cd video && npm ci` | All `remotion` / `@remotion/*` packages pinned to 4.0.479. Version drift blocks render. |
| Remotion skill (agents) | `npx skills add remotion-dev/skills --global` | Load before changing Remotion code. |
| Chatterbox TTS | Python venv; `generate-audio.mjs` currently expects `/Users/nick/.venvs/chatterbox/bin/python3`. Source pinned at `.workflow-state/runtimes/chatterbox-5de7a54/src`, model `ResembleAI/chatterbox` rev in `tts-runtime.json` | Settings: exaggeration 0.4, CFG 0.5, 280 char sentence chunks, 600 token cap per chunk, seed 1337, CPU 2 threads, 45 min batch ceiling. A 2 min reel can take 15+ min to synthesize; quiet output is normal. Progress: count `video/public/audio/<slug>/segment-*_tmp.wav`. |
| Voice reference | `video/voice-sample/voice-reference.wav` | Owner's voice. Not in git. Must be supplied separately. Do not denoise, normalize or replace. Zoe and Nano voices only with owner approval for recovery tests. |
| Whisper | From repo root: `python3 -m venv .local-tools/whisper-venv && .local-tools/whisper-venv/bin/python -m pip install -r video/whisper-requirements.txt && .local-tools/whisper-venv/bin/python video/scripts/setup-whisper.py` | faster-whisper 1.2.1, PyAV pinned 16.1.0. Missing runtime stops the render; no silent proportional fallback. |
| Ollama | `gemma3:4b` at `127.0.0.1:11434` via `scripts/ollama-local-no-think.sh` | Confirm `/api/tags` responds before heavy work. Used for drafting and image vision checks. |
| Stock keys | `video/.env` with `PEXELS_API_KEY`, `PIXABAY_API_KEY` | Not in git. Load with `set -a && source .env && set +a` (never `export $(cat .env)`). |
| ffmpeg / ffprobe | Homebrew | Used for verification and size fit. |

Hardcoded paths to fix on a new machine: `video/scripts/generate-audio.mjs` (Chatterbox and Coqui Python paths), `video/scripts/fetch-media.mjs` (`LOCAL_LLM` default helper), `scripts/render-missing-reels.sh` (`PROJECT_DIR`, `PATH`). Override with env vars where available.

---

## 9. Manual render, step by step

Run from `video/` unless noted.

```bash
# 0. Clear zombie render browsers from earlier runs
pkill -f "chrome-headless-shell" 2>/dev/null

# 1. Mandatory gates (errors block TTS and render)
npm test
node scripts/parse-script.mjs --post=<slug>
node scripts/validate-reel.mjs --script=out/<slug>/script.json

# 2. Optional: prepare audio, captions and props without encoding, to review names and dates
[ -f .env ] || { echo "video/.env missing"; exit 1; }
set -a && source .env && set +a
node scripts/render.mjs --post=<slug> --music=cycle --voice=chatterbox --quality=presentation --prepare-only

# 3. Full render (coin episodes use presentation quality)
node scripts/render.mjs --post=<slug> --music=cycle --voice=chatterbox --quality=presentation

# 4. Verify output
ls -lh out/<slug>/<slug>.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/<slug>/<slug>.mp4

# 5. If over 44 MB, size fit (keeps the original master, keeps 192 kbps audio)
node scripts/fit-upload-size.mjs ...   # see script header for args

# 6. Release gate
npm run release -- --post=<slug>
```

What `render.mjs` does internally: parse script > Chatterbox narration (cached by narration text + voice + profile) > media staging > Whisper captions > Remotion render > `render-meta.json`. Each stage can be rerun alone (`parse-script.mjs`, `generate-audio.mjs --post=<slug> --voice=chatterbox`, `fetch-media.mjs`, `generate-captions.mjs --post=<slug>`). Use `--force` on audio only to rebuild unchanged segments.

Other flags: `--preflight-only`, `--supervised-tts-recovery` (supervised use only, never in scheduled jobs), `--music=none` (requires a written approval record, see section 11).

---

## 10. Scheduled render

- `launchagents/com.nick.render-missing-reels.plist` runs `scripts/render-missing-reels.sh` daily at 11:00 Pacific, coin scope only. The coin worker (`com.nick.coin-history-drafts`, every 15 min) also triggers one render per finished episode.
- Locks: `SCHEDULER_LOCK` and `GLOBAL_RENDER_LOCK` (paths under `/tmp`, set at the top of `render-missing-reels.sh`). One render at a time on the machine. Never remove a lock whose PID is alive. EPERM/EACCES on a PID probe means "maybe alive"; only ESRCH means dead.
- Env defaults: `MAX_RENDERS_PER_RUN=4`, `RENDER_TIMEOUT_SECONDS=18000`, `CHATTERBOX_BATCH_TIMEOUT_MS=2700000`, `REEL_VOICE=chatterbox`, generative media on with max 2 segments, 20 steps, 4 h timeout.
- Render log: `LOG_FILE` in `render-missing-reels.sh` (under `/tmp`, override with `REEL_LOG_FILE`). Coin worker log: `.workflow-state/coin-history-drafts/runner.log`.
- Failures keep the checkpoint, record a machine-readable reason and retry with backoff up to six hours. Never flip a readiness flag by hand.
- Install or reload after editing a plist (editing the repo copy alone changes nothing):

```bash
cp launchagents/com.nick.render-missing-reels.plist ~/Library/LaunchAgents/
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.nick.render-missing-reels.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nick.render-missing-reels.plist
```

---

## 11. Music

- Only tracks in `policy.trustedCycle` in `video/data/audio-rights.json`. Pass `--music=cycle`; the renderer picks deterministically by slug and mixes the bed at about 20% of narration (about -38 LUFS vs -24 LUFS narration reference). Final reel loudness target about -16 LUFS with true-peak headroom.
- Retired, never use: `mixkit-driving-ambition-32.mp3`, `youtube-gone-away-blue-beat-review.mp3`, `ambient-02` to `ambient-10`. Older docs that tell you to pick an ambient track are wrong.
- Check each track's `allowedPlatforms`. A local approval is not a guarantee against Content ID claims.
- Narration only reel needs `video/out/<slug>/narration-first-approval.json` with slug, `approved: true`, date, approver, reason.
- Adding a track: record filename, SHA-256, source URL, license and version, acquisition and verification dates, allowed platforms, evidence, `status: "approved"`, then `npm run video:audio-rights`. Full procedure in `docs/AUDIO-SOURCE-SOP.md`.

---

## 12. Remotion code rules

- Animate only with `useCurrentFrame()`, `interpolate()`, `spring()`, `Sequence`, `Series`, `TransitionSeries`. No CSS transitions, keyframes or Tailwind animation classes.
- Premount every `Sequence` you add or change.
- Assets through `staticFile()` and Remotion media components.
- Variable text through `@remotion/layout-utils` (`fitText`, `measureText`, `fillTextBox`) after fonts load. Measurement font properties must match render properties. Never hide overflow.
- Transition duration math is shared (`transition-timing.mjs`) so overlaps do not create a frozen tail. Do not change composition duration without it.
- Presentation profile: PNG intermediates, H.264 CRF 20 slow preset, 15 frame dissolves inside segments, captions 44 px max in the 1080 px coordinate system.
- Visual style: background `#041018`, accent `#58d6ff`, text `#ffffff` / muted `#afc6cf`, Bebas Neue for titles and stats, Poppins 600 chart labels, Poppins 400 subtitles.

---

## 13. Release gate and QA

A rendered file is not a released file. Release requires all of:

- Duration 100 to 135 s measured on the final MP4. Size strictly under 50,000,000 bytes.
- Voice is Chatterbox Standard with the approved reference.
- Whisper captions present; caption audit samples three points per narration beat, nearest timed word within 0.75 s.
- Music rights pass for the exact track.
- Transcript, source, media and hero hashes match approvals (`approved-sources.mjs`).
- Coin images pass the second vision match against the unchanged crop.
- `auto-visual-review.py` passes: six in-file frames (never EOF) reviewed by local vision against the narration, bound to video and contact sheet hashes. Any defect, missing frame or changed MP4 blocks.
- Final card is a readable question whose words are in the approved transcript.
- Re-encoding (for example size fit) invalidates output-bound checks; rerun them.

Output: `video/out/<slug>/release-qa.json` with `readyForPosting: true`. Also present after a good run: `script.json`, `render-meta.json`, `audio-timing.json`, `captions.json`, `captions-meta.json`, `media-manifest.json`, `visual-review.json`.

Completion report for every reel (do not claim success without it): output path, ffprobe duration and byte size, voice, caption mode from `captions-meta.json` (`whisper`, `proportional`, `mixed`, `none`, stated honestly), music track and rights result, `npm test` and `validate-reel.mjs` results, visual QA findings, unresolved warnings.

---

## 14. Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| MP4 under 5 MB or zero duration | Zombie `chrome-headless-shell` or concurrent render | `pkill -f chrome-headless-shell`, confirm no lock owner alive, rerender |
| Black frame on one segment | Stock API returned a ~20 byte stub | `find video/public/photos/<slug>/ -size -1k`, delete stub, refetch |
| Black tail at end | `Target length:` larger than last segment end | Match the two values |
| Segment silently missing | Decimal timestamp | Use whole integers |
| Narration cut off | Window too short | Extend the window, shift later timestamps; never shorten narration |
| Long silent TTS phase | Normal Chatterbox batch | Count `_tmp.wav` files to see progress |
| "Too many open files" | launchd default fd limit | `ulimit -n 65536` / plist NumberOfFiles |
| Whisper misspells names | Base model limit | Review names and dates in captions before release; optional stronger model via `WHISPER_RUNTIME_CONFIG` |
| Local image generation timeout at larger sizes | 8 GB memory budget | Stay at 384 x 640, 20 steps |
| TTS circuit held | Earlier synthesis failure | Coin worker runs one bounded probe; supervised `--supervised-tts-recovery` only after removing contention |

---

## 15. Git and safety rules

- Work on `main`. Never force push. **Never `git reset --hard`** in this repo (caused data loss before).
- Never commit MP4s, raw footage, renders, stock clips, audio caches, logs or secrets. A pre-commit hook blocks more than 250 files per commit and runs gitleaks; never use `--no-verify`. Run `npm run workspace:audit` before committing reel work.
- Reel metadata commits need explicit owner authorization and `REEL_GIT_COMMIT=1`. Pushes of code, SOP, plist or config changes need owner approval each time.
- Never put credentials in tracked files, prompts, logs, plists or generated content.
- Do not lower any gate to hit the daily target.

---

## 16. Not in the repo (must be transferred separately)

| Item | Location on source machine |
|---|---|
| Voice reference WAV | `video/voice-sample/voice-reference.wav` |
| Stock API keys | `video/.env` |
| Licensed music originals | `video/private-audio/` (renderer copies in `video/public/music/` may be partial in git) |
| Generated and stock media libraries | `video/local/` |
| Owner coin photo originals | `Coin Raw/` |
| Chatterbox source, Whisper venv, model caches | `.workflow-state/runtimes/`, `.local-tools/`, `.model-cache/`, `~/.cache/huggingface/` |
| Render outputs | `video/out/` |
| Worker state | `.workflow-state/` |

---

## 17. Open items

- Render log should move from `/tmp` to `~/Library/Logs` (open task in SOURCE-OF-TRUTH).
- `video/REEL-SOP.md` still contains stale sections (180 to 240 s format, silver and tech CTA tables, ambient music examples, 1080x1920 output in project `CLAUDE.md`, old handoff prompt in `docs/CLAUDE-REEL-HANDOFF.md`). Follow section 1 values here and SOURCE-OF-TRUTH when they conflict.
- Throughput of 3 pairs per day is a target, not yet a proven capacity. Check `.workflow-state/coin-history-drafts/throughput.json` over several cycles.
