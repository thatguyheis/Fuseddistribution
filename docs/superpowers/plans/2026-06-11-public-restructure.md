# Public/ Asset Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all served website content into `public/` and point `wrangler.jsonc` `assets.directory` at it, so publishing becomes opt-in and `wrangler dev` works (currently hangs forever with `directory: "."`).

**Architecture:** `git mv` every currently-published top-level dir/file into `public/`, keep all working dirs (video, book-factory, docs, scripts, src, SOP markdowns) at repo root, replace the 40-line root `.assetsignore` with a ~8-line `public/.assetsignore` for content-adjacent sidecars (reel scripts, social-copy.json, research). Update filesystem path references in 3 video scripts, 1 blog script, 4 shell scripts in `~/bin` + `blog/scripts`, 3 SOP docs, `.gitignore`, and both wrangler configs. URL space (`/blog/...`, `/reserve/...`) is unchanged — only filesystem paths change, so HTML/sitemap/posts.json content needs no edits.

**Tech Stack:** Cloudflare Workers static assets (wrangler 4.99.0), zsh/launchd pipeline, Node ESM scripts.

**Approvals:** Nick approved this restructure + its push 2026-06-11 (option 1). This is a one-time non-content push under that explicit approval, not the standing content-push permission.

**Timing constraint:** Execute ONLY after today's (2026-06-11) 9 AM pipeline run has fully completed (log line `Reel render done` or terminal `Done.` in `~/Library/Logs/daily-blog-reel.log`). The run uses old paths; migrating mid-run corrupts it.

---

## Measured facts this plan relies on

- `wrangler dev` with `directory: "."`: never ready after 15 min (walks ~20.5k files; 17.5k are `video/node_modules`). Control with `directory: "./reserve"`: ready in 5s, HTTP 200 in 22ms.
- Worker (`src/worker.js`) is path-agnostic: serves `env.ASSETS.fetch(request)` + `/api/spot`, `/api/lead`, 404 fallback to `/404.html`. `BLOCKED_PREFIXES` becomes vestigial but harmless. **No worker changes.**
- `wrangler whoami` works (OAuth alive, account `904933a9...`). Deploy possible.
- Pre-commit secret-scan hook is diff-content based, path-agnostic. No change.
- `git mv <dir>` renames the directory on disk, so untracked files inside (e.g. `blog/<slug>/gemma_draft.md`) travel along; tracked-but-modified files keep their unstaged mods at the new path.

## What is currently published (must keep publishing, byte-identical URL space)

Root files: `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, `projects.json` (fetched by `projects/index.html:1547`).
Dirs: `.well-known`, `about`, `anoush-deli`, `blog` (minus scripts/research/md/social-copy.json), `boba-tree`, `cascade`, `data`, `education`, `faq`, `Fused Technology Solutions` (note the spaces — quote it), `newsletter`, `photos` (entire dir incl. its own scripts/templates — published today, preserve), `plainsman`, `pricing`, `privacy`, `process`, `projects`, `reserve`.

## What stays at root (NOT published — intentional)

`src`, `video`, `book-factory`, `docs`, `scripts`, `_templates`, `cloudflare-upload`, `10-98684-041426-cascade-collision-repair` (excluded today, stays excluded), `fused-reserve.html`, `squarespace-code-block.html`, `squarespace-custom.css`, all root `*.md`, `package.json`, `package 2.json`, `package-lock.json`, `wrangler.jsonc`, `wrangler.test.jsonc`, `.claude`, `.gitignore`, `.assetsignore` (stale after migration — flag to Nick for deletion, do NOT delete).

**Intentional publish-surface fixes (behavior change, document in commit):** today `video/data`, `video/docs`, `video/public/music/*.mp3`, `video/voice-sample`, `video/remotion.config.ts`, `video/tsconfig.json`, and root `.DS_Store` are published because the ignore list misses them. After restructure they are simply outside `public/` (or `.DS_Store`-ignored). This is the point of opt-in.

## Filesystem path references that must change (complete inventory, grep-verified 2026-06-11)

| File | Refs | Change |
|---|---|---|
| `wrangler.jsonc` | 1 | `"directory": "."` → `"./public"` |
| `wrangler.test.jsonc` | 1 | `"./reserve"` → `"./public/reserve"` |
| `video/scripts/fetch-media.mjs:17` | 1 | `join(videoDir, '..', 'blog', ...)` → `join(videoDir, '..', 'public', 'blog', ...)` |
| `video/scripts/fetch-photos.mjs:19` | 1 | same as above |
| `video/scripts/parse-script.mjs:150` | 1 | `'../../blog'` → `'../../public/blog'` |
| `blog/scripts/fetch-pexels.mjs:10` | 1 | `'../../video/.env'` → `'../../../video/.env'` (script moves one level deeper) |
| `blog/scripts/generate-sitemap.mjs` | 0 code | `ROOT = '../..'` now resolves to `public/` — `blog/posts.json` and `sitemap.xml` both resolve correctly with zero edits. Update the line-3 comment only. |
| `blog/scripts/gemma-nightly.sh` | 4 | `blog/` → `public/blog/` |
| `blog/scripts/gemma-research.sh` | 1 | same |
| `blog/scripts/gemma-draft.sh` | 1 | same |
| `/Users/nick/bin/daily-blog-reel.sh` | 26 | sed (Task 6) — URL refs `"/blog/` and `$(pwd)/blog/` handled separately |
| `/Users/nick/bin/render-missing-reels.sh` | 1+ | `blog/$SLUG/reel-script.md` → `public/blog/$SLUG/...` (re-grep at execution) |
| `/Users/nick/bin/gemma-research-runner.sh` | 1 | `SCRIPT=".../blog/scripts/gemma-nightly.sh"` → `.../public/blog/scripts/...` |
| `blog/BLOG-SOP.md` | 22 | sed (Task 7) |
| `blog/BLOG.md` | 5 | sed |
| `video/REEL-SOP.md` | 14 | sed |
| `.claude/settings.local.json` | 1 | manual edit |
| `.gitignore` | 4 photo rules | `photos/...` → `public/photos/...` |

Do NOT touch: `src/worker.js`, any HTML, `posts.json`, `sitemap.xml` content, `robots.txt`, `.claude/worktrees/**` (stale worktree copy), `blog/BLOG-REF.md` (0 fs refs), `AGENTS.md` (0 fs refs).

---

### Task 1: Pre-flight gate + baseline manifest

**Files:** none modified.

- [ ] **Step 1: Confirm today's 9 AM run finished**

Run: `tail -5 ~/Library/Logs/daily-blog-reel.log`
Expected: a terminal line for today (2026-06-11): `Reel render done` or `Done.` or an error state that means the run is over. If the run is mid-flight, STOP and wait.

- [ ] **Step 2: Sync with remote**

Run: `cd "/Users/nick/Documents/New project" && git fetch origin && git status -sb | head -3`
Expected: `## main...origin/main` with no ahead/behind (or only behind → `git pull --ff-only origin main` first).

- [ ] **Step 3: Capture baseline publish manifest**

```bash
cd "/Users/nick/Documents/New project"
find . -type f \
 -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./src/*" \
 -not -path "./cloudflare-upload/*" -not -path "./10-98684-041426-cascade-collision-repair/*" \
 -not -path "./video/*" -not -path "./.claude/*" -not -path "./.wrangler/*" \
 -not -path "./book-factory/*" -not -path "./scripts/*" -not -path "./docs/*" \
 -not -path "./_templates/*" -not -path "./blog/scripts/*" -not -path "./blog/research/*" \
 -not -name "*.md" -not -name "*.log" -not -name "wrangler.jsonc" -not -name "wrangler.test.jsonc" \
 -not -name "fused-reserve.html" -not -name "squarespace-code-block.html" \
 -not -name "squarespace-custom.css" -not -name ".gitignore" -not -name ".assetsignore" \
 -not -name "package.json" -not -name "package 2.json" -not -name "package-lock.json" \
 -not -name "social-copy.json" \
 | sed 's|^\./||' | sort > /tmp/assets-before.txt
wc -l /tmp/assets-before.txt
```
Expected: ~775+ lines (more if today's run added a post). Note: this approximation includes `video/*` leftovers the real ignore list also misses — the diff in Task 9 accounts for them. (The find already excludes all of `video/`, so the before-list slightly UNDERCOUNTS the true publish surface; treat video leftovers as known intentional removals.)

### Task 2: Move served content into `public/`

**Files:**
- Move: 6 root files + 19 dirs listed above → `public/`

- [ ] **Step 1: Create dir and move everything in one batch**

```bash
cd "/Users/nick/Documents/New project"
mkdir public
git mv index.html 404.html robots.txt sitemap.xml llms.txt projects.json public/
git mv .well-known about anoush-deli blog boba-tree cascade data education faq public/
git mv "Fused Technology Solutions" newsletter photos plainsman pricing privacy process projects reserve public/
```
Expected: silent success. If `git mv` complains about an untracked-only dir, use plain `mv` for that one and `git add public/<dir>`.

- [ ] **Step 2: Verify nothing served remains at root and moves are staged**

Run: `ls | grep -iE "^(index|404|robots|sitemap|llms|projects|about|blog|reserve|photos)" ; git status --porcelain | grep -c "^R"`
Expected: no root listing hits (grep empty); rename count in the hundreds.

- [ ] **Step 3: Write `public/.assetsignore`** (replaces the 40-line root one; root copy left in place, stale, flagged for Nick)

```bash
cat > "/Users/nick/Documents/New project/public/.assetsignore" <<'EOF'
*.md
*.log
.DS_Store
.assetsignore
blog/scripts
blog/research
blog/*/social-copy.json
EOF
git add "/Users/nick/Documents/New project/public/.assetsignore"
```

- [ ] **Step 4: Commit the pure move** (separate from edits so the rename detection stays clean)

```bash
cd "/Users/nick/Documents/New project"
git commit -m "refactor: move served site content into public/ (opt-in asset publishing)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3: Wrangler configs

**Files:**
- Modify: `wrangler.jsonc` (assets.directory)
- Modify: `wrangler.test.jsonc` (assets.directory)
- Modify: `.gitignore` (photo workflow paths)

- [ ] **Step 1: Point assets at public/**

In `wrangler.jsonc`: `"directory": "."` → `"directory": "./public"`.
In `wrangler.test.jsonc`: `"directory": "./reserve"` → `"directory": "./public/reserve"`.

- [ ] **Step 2: Update `.gitignore` photo rules** — replace the four `photos/...` pattern pairs:

```
public/photos/.DS_Store
public/photos/uploads/*
!public/photos/uploads/.gitkeep
public/photos/originals/*
!public/photos/originals/.gitkeep
public/photos/derived/social/*
!public/photos/derived/social/.gitkeep
public/photos/derived/marketplace/*
!public/photos/derived/marketplace/.gitkeep
```

- [ ] **Step 3: Verify ignore still bites**

Run: `git check-ignore -v public/photos/uploads/IMG_3683.JPG`
Expected: matches the new `public/photos/uploads/*` rule.

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc wrangler.test.jsonc .gitignore
git commit -m "refactor: assets.directory=./public, gitignore paths follow photo move

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: Node script path updates

**Files:**
- Modify: `video/scripts/fetch-media.mjs:17`
- Modify: `video/scripts/fetch-photos.mjs:19`
- Modify: `video/scripts/parse-script.mjs:150`
- Modify: `public/blog/scripts/fetch-pexels.mjs:10`
- Modify: `public/blog/scripts/generate-sitemap.mjs:3` (comment only)

- [ ] **Step 1: Apply the five edits**

`fetch-media.mjs:17`:
```js
const reelDataPath = join(videoDir, '..', 'public', 'blog', slug, 'reel-data.md');
```
`fetch-photos.mjs:19`:
```js
const reelDataPath = join(videoDir, '..', 'public', 'blog', slug, 'reel-data.md');
```
`parse-script.mjs:150`:
```js
const mdPath = join(__dirname, '../../public/blog', slug, scriptFile);
```
`fetch-pexels.mjs:10`:
```js
const envPath = join(__dirname, '../../../video/.env');
```
`generate-sitemap.mjs:3` comment: `// Run from repo root: node public/blog/scripts/generate-sitemap.mjs`
(No code change: `ROOT = resolve(__dirname, '../..')` now = `public/`, so `blog/posts.json` and `sitemap.xml` resolve correctly.)

- [ ] **Step 2: Smoke-test parse + sitemap (no network needed)**

```bash
cd "/Users/nick/Documents/New project/video"
cp out/fractional-silver-coins/script.json /tmp/script-before.json
node scripts/parse-script.mjs --post=fractional-silver-coins
diff /tmp/script-before.json out/fractional-silver-coins/script.json && echo PARSE-OK
cd "/Users/nick/Documents/New project"
cp public/sitemap.xml /tmp/sitemap-before.xml
node public/blog/scripts/generate-sitemap.mjs
diff <(grep -c "<url>" /tmp/sitemap-before.xml) <(grep -c "<url>" public/sitemap.xml) && echo SITEMAP-OK
```
Expected: `PARSE-OK` and `SITEMAP-OK` (sitemap lastmod dates may differ; URL count must not).

- [ ] **Step 3: Commit**

```bash
git add video/scripts/fetch-media.mjs video/scripts/fetch-photos.mjs video/scripts/parse-script.mjs public/blog/scripts/fetch-pexels.mjs public/blog/scripts/generate-sitemap.mjs public/sitemap.xml
git commit -m "refactor: script paths follow public/ move

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: Gemma shell scripts (in-repo)

**Files:**
- Modify: `public/blog/scripts/gemma-nightly.sh` (4 refs)
- Modify: `public/blog/scripts/gemma-research.sh` (1 ref)
- Modify: `public/blog/scripts/gemma-draft.sh` (1 ref)

- [ ] **Step 1: Sed with backup, then review**

```bash
cd "/Users/nick/Documents/New project/public/blog/scripts"
for f in gemma-nightly.sh gemma-research.sh gemma-draft.sh; do
  sed -i.bak -E 's|(^\|[^/[:alnum:]_-])blog/|\1public/blog/|g' "$f"
  diff "$f.bak" "$f"
done
```
Expected: only the counted refs change (4/1/1); every changed line is a filesystem path or output-path string, not a URL. Scripts `cd` to repo root (runner does), so `public/blog/...` relative paths are correct.

- [ ] **Step 2: Syntax check + remove backups from staging scope**

```bash
for f in gemma-nightly.sh gemma-research.sh gemma-draft.sh; do bash -n "$f" && echo "OK $f"; done
```
Expected: three OK lines. Leave `.bak` files on disk (do not delete; do not `git add` them).

- [ ] **Step 3: Commit**

```bash
cd "/Users/nick/Documents/New project"
git add public/blog/scripts/gemma-nightly.sh public/blog/scripts/gemma-research.sh public/blog/scripts/gemma-draft.sh
git commit -m "refactor: gemma scripts write to public/blog paths

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: `~/bin` pipeline scripts (outside repo — no commit)

**Files:**
- Modify: `/Users/nick/bin/daily-blog-reel.sh` (26 refs + `$(pwd)/blog/` class)
- Modify: `/Users/nick/bin/render-missing-reels.sh`
- Modify: `/Users/nick/bin/gemma-research-runner.sh` (line 6 SCRIPT=)

- [ ] **Step 1: Two-pass sed on daily-blog-reel.sh**

```bash
sed -i.bak -E 's|(^\|[^/[:alnum:]_-])blog/|\1public/blog/|g' /Users/nick/bin/daily-blog-reel.sh
sed -i '' 's|\$(pwd)/blog/|$(pwd)/public/blog/|g' /Users/nick/bin/daily-blog-reel.sh
diff /Users/nick/bin/daily-blog-reel.sh.bak /Users/nick/bin/daily-blog-reel.sh
```
Review every diff hunk. MUST still read `"image": "/blog/[slug]/hero.jpg"` (URL — leading slash protects it from pass 1; verify untouched). MUST now read `$(pwd)/public/blog/[slug]/hero.svg`.

- [ ] **Step 2: Same treatment for the other two**

```bash
sed -i.bak -E 's|(^\|[^/[:alnum:]_-])blog/|\1public/blog/|g' /Users/nick/bin/render-missing-reels.sh
diff /Users/nick/bin/render-missing-reels.sh.bak /Users/nick/bin/render-missing-reels.sh
sed -i.bak 's|/Documents/New project/blog/scripts/|/Documents/New project/public/blog/scripts/|' /Users/nick/bin/gemma-research-runner.sh
diff /Users/nick/bin/gemma-research-runner.sh.bak /Users/nick/bin/gemma-research-runner.sh
```

- [ ] **Step 3: Syntax + residual audit**

```bash
for f in /Users/nick/bin/daily-blog-reel.sh /Users/nick/bin/render-missing-reels.sh /Users/nick/bin/gemma-research-runner.sh; do bash -n "$f" && echo "OK $f"; done
grep -nE '(^|[^/[:alnum:]_-])blog/' /Users/nick/bin/*.sh
```
Expected: three OK; residual grep returns ONLY lines that are URLs or prose (eyeball each; expected zero fs refs).

### Task 7: SOP docs + settings

**Files:**
- Modify: `public/blog/BLOG-SOP.md` (22 refs)
- Modify: `public/blog/BLOG.md` (5 refs)
- Modify: `video/REEL-SOP.md` (14 refs)
- Modify: `.claude/settings.local.json` (1 ref)

- [ ] **Step 1: Sed + review (URL refs `/blog/` are protected by the leading-slash rule; review diffs anyway)**

```bash
cd "/Users/nick/Documents/New project"
for f in public/blog/BLOG-SOP.md public/blog/BLOG.md video/REEL-SOP.md; do
  sed -i.bak -E 's|(^\|[^/[:alnum:]_-])blog/|\1public/blog/|g' "$f"
  diff "$f.bak" "$f" | head -60
done
grep -n "blog/" .claude/settings.local.json
```
Edit the settings.local.json hit manually (Edit tool) to the `public/blog/...` form if it is a filesystem path; leave if URL.

- [ ] **Step 2: Commit (leave .bak files on disk, unstaged)**

```bash
git add public/blog/BLOG-SOP.md public/blog/BLOG.md video/REEL-SOP.md .claude/settings.local.json
git commit -m "docs: SOP filesystem paths follow public/ move

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 8: Memory skill-file pointer

**Files:**
- Modify: `/Users/nick/.claude/projects/-Users-nick/memory/blog_skill.md` — update the BLOG.md path reference to `/Users/nick/Documents/New project/public/blog/BLOG.md` (verify actual path mentioned inside first).

- [ ] **Step 1: Read, update path strings, save.** Also re-check `MEMORY.md` index line for blog_skill (path appears in hook text — update).

### Task 9: Publish-surface parity check

**Files:** none modified.

- [ ] **Step 1: After-manifest from public/ with new ignore rules**

```bash
cd "/Users/nick/Documents/New project/public"
find . -type f \
 -not -name "*.md" -not -name "*.log" -not -name ".DS_Store" -not -name ".assetsignore" \
 -not -path "./blog/scripts/*" -not -path "./blog/research/*" -not -name "social-copy.json" \
 | sed 's|^\./||' | sort > /tmp/assets-after.txt
diff /tmp/assets-before.txt /tmp/assets-after.txt
```
Expected diff contains ONLY:
- `<` lines (removed): nothing — any `<` line that is not a `.DS_Store` or known video leftover is a REGRESSION; stop and fix.
- `>` lines (added): files that the old 40-line ignore accidentally excluded but the new minimal ignore includes (e.g. `*.json` sidecars that are not social-copy). Eyeball each; if anything sensitive appears (`.env`, tokens, drafts), add a rule to `public/.assetsignore` and re-run.
- `.bak` files from seds must NOT appear (they live in `public/blog/scripts/` — add `*.bak` to `public/.assetsignore` if present).

### Task 10: Local serve verification

**Files:** none modified.

- [ ] **Step 1: wrangler dev must become ready fast**

```bash
cd "/Users/nick/Documents/New project"
npx wrangler dev --port 8787 > /tmp/wd-public.log 2>&1 &
for i in $(seq 1 24); do grep -q "Ready on" /tmp/wd-public.log && { echo READY; break; }; sleep 5; done
```
Expected: READY within ~120s (control measured 5s for a small dir; public/ has ~800 files — expect well under 60s). If it hangs like before, the restructure failed its core goal — investigate before proceeding.

- [ ] **Step 2: Route checks**

```bash
for p in / /blog/ /reserve/ /blog/posts.json /sitemap.xml /photos/ /projects.json /llms.txt /robots.txt /no-such-page; do
  curl -s -o /dev/null -w "%{http_code} $p\n" --max-time 10 "http://127.0.0.1:8787$p"
done
curl -s http://127.0.0.1:8787/no-such-page | grep -qi "404\|not found" && echo "404-PAGE-OK"
```
Expected: 200 for all real routes, 404 + `404-PAGE-OK` for the last. Then kill the dev server (`pkill -f "wrangler dev"`).

- [ ] **Step 3: Confirm sidecars are NOT served**

```bash
for p in /blog/fractional-silver-coins/reel-script.md /blog/fractional-silver-coins/social-copy.json /blog/scripts/fetch-pexels.mjs; do
  curl -s -o /dev/null -w "%{http_code} $p\n" --max-time 10 "http://127.0.0.1:8787$p"
done
```
(Run before killing dev.) Expected: 404 on all three.

### Task 11: Push + deploy + live verification

**Files:** none modified.

- [ ] **Step 1: Push (explicit approval 2026-06-11, non-content restructure)**

```bash
cd "/Users/nick/Documents/New project" && git push origin main
```

- [ ] **Step 2: Deploy**

Run: `npx wrangler deploy`
Expected: asset upload diff (Cloudflare uploads only changed files — paths inside the asset dir are unchanged relative names, so upload should be small), deploy URL printed. If auth error code 10000: log `RUN: npx wrangler login` and stop (Nick action).

- [ ] **Step 3: Live spot checks**

```bash
for p in / /blog/ /reserve/ /blog/posts.json /sitemap.xml; do
  curl -s -o /dev/null -w "%{http_code} https://fuseddistribution.com$p\n" --max-time 15 "https://fuseddistribution.com$p"
done
```
Expected: all 200. Also confirm newest post slug (from today's run) returns 200.

### Task 12: Wrap-up

- [ ] **Step 1: session_summary.md** in `docs/` scratch — what moved, what changed, known leftovers (root `.assetsignore` + `*.bak` files awaiting Nick's delete confirmation, `BLOCKED_PREFIXES` vestigial).
- [ ] **Step 2: Update memory** `wrangler_assets_restructure.md` → status: executed, date, commit hashes.
- [ ] **Step 3: Tell Nick:** deletion candidates (root `.assetsignore`, `.bak` files, `fused-reserve.html`?, `package 2.json` dups) — list only, never delete without confirmation.

---

## Self-review notes

- Spec coverage: move ✓ (T2), wrangler config ✓ (T3), pipeline paths ✓ (T4-6), SOP docs ✓ (T7), verification dev+dry parity ✓ (T9-10), deploy after 9am run ✓ (T1 gate, T11), approval recorded ✓ (header).
- Sitemap subtlety verified: `generate-sitemap.mjs` needs NO code change because its ROOT lands on `public/` after the move and both of its outputs live there now.
- `daily-blog-reel.sh` URL-vs-fs distinction: leading `/` protects URLs from the sed class `[^/...]`; `$(pwd)/blog/` needs the dedicated second pass.
- No TDD test-first steps: this is a file-move refactor on a static site; verification is parity diff + serve checks, which the plan makes mandatory and explicit.
