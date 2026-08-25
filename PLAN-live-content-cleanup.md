# PLAN: Live Content Cleanup — Banned Words + Two Broken Posts

**Rank: 5 of 5. Depends on PLAN-quarantine-autorepair's `sanitize-draft.py` (reuses its swap map). Do after the pipeline fixes so new posts stop adding to the pile.**

**Goal:** Two classes of live defects found 2026-07-07:

1. **12 live posts contain banned AI words** (violates BLOG-SOP.md §9 and Nick's hard writing rules — no AI buzzwords). Verified list:
   - `best-ways-to-clean-silver-coins-without-damage`
   - `does-tarnished-silver-lose-value`
   - `email-marketing-for-small-business-getting-started`
   - `google-business-profile-setup`
   - `home-safe-vs-safety-deposit-box-for-silver`
   - `how-to-organize-and-inventory-your-silver-collection`
   - `hunt-brothers-silver-squeeze`
   - `local-business-website-pages`
   - `short-form-video-local-business`
   - `silver-coin-holders-and-cases-guide`
   - `silver-portfolio-allocation` (known: "accordingly", flagged 7/02)
   - `silver-tarnish-why-it-happens-and-how-to-prevent-it`
2. **Two posts shipped broken editorial content** (flagged in `docs/CODEX-HANDOFF-2026-07-07-inline-link-gate.md`):
   - `welcome-email-sequence-for-new-customers` — body content (GBP/reviews/website) does not match the title at all.
   - `automated-email-sequences-for-local-business` — repeats the same ~5 talking points ~4 times under different H2s.

**Repo:** `/Users/nick/projects/fuseddistribution`.

**Hard rules for the executor:**
- NEVER `git reset --hard`.
- These are content commits → push to `origin main` allowed under standing permission; deploy and curl-verify after (per Nick's definition, "publish" = posts.json verified + commit + push + deploy + curl 200).
- Never overwrite originals blindly: before editing each post, copy its `index.html` to `index_original.html` INSIDE `/tmp` (NOT inside `public/` — anything under `public/` deploys; `*.html` is not in `.assetsignore`). Use `/tmp/content-cleanup-backups/<slug>/`.
- Don't run 9:00–10:00 AM PDT.

---

## Files to touch

- Modify: `public/blog/<slug>/index.html` for the 12 banned-word posts (targeted word swaps)
- Regenerate: the two broken posts via the normal pipeline (`public/blog/scripts/build-post.sh`)
- Runtime side effects: `public/blog/posts.json` (dates/excerpts if regenerated), `public/sitemap.xml`

## Part A: banned-word swaps in 12 live posts

### Step A1: Produce the exact violation report first

```bash
cd /Users/nick/projects/fuseddistribution
mkdir -p /tmp/content-cleanup-backups
for s in best-ways-to-clean-silver-coins-without-damage does-tarnished-silver-lose-value \
  email-marketing-for-small-business-getting-started google-business-profile-setup \
  home-safe-vs-safety-deposit-box-for-silver how-to-organize-and-inventory-your-silver-collection \
  hunt-brothers-silver-squeeze local-business-website-pages short-form-video-local-business \
  silver-coin-holders-and-cases-guide silver-portfolio-allocation \
  silver-tarnish-why-it-happens-and-how-to-prevent-it; do
  echo "== $s"
  grep -noiE '\b(accordingly|robust|paramount|furthermore|moreover|additionally|consequently|notably|thus|indeed|leverage|utilize|streamline|facilitate|foster|harness|empower|elevate|seamlessly|holistic|paradigm|ecosystem|synergy|cornerstone|testament|landscape|realm|beacon|catalyst|transformative|groundbreaking|delve)\b' \
    "public/blog/$s/index.html" | head -20
done > /tmp/violations.txt
cat /tmp/violations.txt
```

**Read the report before editing.** Two traps:
- False positives in attributes/URLs/JSON-LD (e.g., a Pexels attribution URL containing "landscape", an image alt text where the word is fine descriptively — "landscape orientation" is a legitimate photo term, not a buzzword). Only body prose counts.
- "accordingly" contains "according" — the grep above matches the whole word `accordingly` only, which is correct; do not loosen it.

### Step A2: Apply swaps per file, prose-only

For each slug, back up, then edit only the flagged lines. Use the swap vocabulary from `sanitize-draft.py` (PLAN-quarantine-autorepair), e.g. robust→reliable, paramount→essential, furthermore→also, landscape→market (only when used as buzzword), accordingly→"to match" or restructure the sentence. Mechanical Edit-tool replacements per grep line are fine; DO NOT run a blind sed across the whole HTML file (it would hit attributes, JSON-LD, and figcaption attribution text).

```bash
cp -R "public/blog/$s" "/tmp/content-cleanup-backups/$s"
# then targeted edits per line from /tmp/violations.txt
```

After each file: re-run the Step A1 grep for that file → zero hits in prose; and sanity-check the HTML still parses:

```bash
node -e "const h=require('fs').readFileSync('public/blog/$s/index.html','utf8'); if(!/<\/html>\s*$/.test(h)) throw 'truncated'; console.log('ok', h.length)"
```

Also bump `dateModified` in the JSON-LD if present (freshness signal): find `"dateModified"` in the file and set it to today's date, same format as found.

### Step A3: Commit Part A

```bash
git add public/blog/*/index.html
git status --short   # confirm ONLY the intended 12 index.html files are staged; unstage anything else
git commit -m "fix: remove banned AI words from 12 live posts (SOP §9)"
```

## Part B: regenerate the two broken posts

These can't be word-swapped — the content itself is wrong. Regenerate through the normal pipeline so all current gates (topic coherence + section repetition checks in `qa-local.mjs`, added 6/26, which would have caught both) validate the result.

### Step B1: Set aside the broken artifacts

```bash
mkdir -p .workflow-blocked/manual-content-cleanup
git mv public/blog/welcome-email-sequence-for-new-customers .workflow-blocked/manual-content-cleanup/ 2>/dev/null \
  || mv public/blog/welcome-email-sequence-for-new-customers .workflow-blocked/manual-content-cleanup/
```

Do NOT remove the slug from posts.json — the slug will be re-filled in place. But between set-aside and successful rebuild the live URL would 404 on any deploy, so do Part B for one slug at a time, completely, before touching the second slug, and don't deploy mid-rebuild.

### Step B2: Rebuild via pipeline

`build-post.sh` usage (from the running cron): `bash public/blog/scripts/build-post.sh <slug> --brand=tech --keyword="<keyword>"`. Run with the same local-LLM env the LaunchAgent uses (ollama must be up: `curl -s localhost:11434/api/tags >/dev/null && echo up`):

```bash
HERMES_TAKEOVER=1 CLAUDE_ENABLED=0 LOCAL_LLM=/Users/nick/bin/hermes-local.sh \
HERMES_LOCAL_BASE_URL=http://localhost:11434/v1 HERMES_LOCAL_MODEL=gemma3:4b-it-qat HERMES_LOCAL_MAX_TOKENS=256 \
bash public/blog/scripts/build-post.sh welcome-email-sequence-for-new-customers --brand=tech \
  --keyword="welcome email sequence for new customers"
```

If it quarantines (qa fail), retry ONCE; if it fails again, restore the set-aside dir (`mv` it back) so the live URL keeps working, and log the slug as needs-Nick in the session summary. Never leave the slug 404.

Repeat for `automated-email-sequences-for-local-business` (keyword: "automated email sequences for local business").

Check `add-to-posts.mjs` is idempotent (it skips existing slugs) — the entry keeps its original date; that's fine. If the rebuilt `meta.json` title/description changed, update the posts.json entry manually to match (title, excerpt fields).

### Step B3: Commit Part B

```bash
git add public/blog/welcome-email-sequence-for-new-customers/ public/blog/automated-email-sequences-for-local-business/ public/blog/posts.json public/blog/topic-history.md public/sitemap.xml
git commit -m "fix: regenerate off-topic and repetitive email-sequence posts"
```

If the set-aside dirs ended up tracked under `.workflow-blocked/`, do NOT commit them; `.workflow-blocked/` appears untracked in git today — keep it that way (`git status` must not show it staged).

## Step C: Publish (full definition)

```bash
git push origin main
npx wrangler deploy
for s in welcome-email-sequence-for-new-customers automated-email-sequences-for-local-business silver-portfolio-allocation; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w %{http_code} https://fuseddistribution.com/blog/$s/)" "$s"
done   # all 200
curl -s https://fuseddistribution.com/blog/silver-portfolio-allocation/ | grep -ci accordingly   # 0
```

## Step D: Session summary

Write `docs/session_summary_<date>_content_cleanup.md`: posts fixed, words swapped (from /tmp/violations.txt), rebuilt posts + their qa results, anything left for Nick.

---

## Edge cases a weaker model would miss

1. **Buzzword vs legitimate use.** "landscape orientation" (photo alt), "utilize" inside a quoted source title, "ecosystem" in a cited stat about actual ecosystems — swapping these corrupts factual content and attributions. Human-judge each grep hit; prose paragraphs only.
2. **HTML is not markdown.** These are rendered files: swaps must not touch `<script type="application/ld+json">` blocks (except the deliberate `dateModified` bump), attributes, or figcaption attributions. That's why blind sed is banned in Step A2.
3. **`verified.md` vs `index.html` divergence.** The source markdown also contains the banned words. Fixing only index.html means any future re-render regenerates the violation. Apply the same swaps to `public/blog/<slug>/verified.md` for each of the 12 (it's not deployed — `*.md` is asset-ignored — but it IS the render source).
4. **Live-site-as-backup rule.** This repo had a data-loss incident; the live site is treated as an HTML backup. Never leave a slug 404 mid-work (Step B1's one-at-a-time rule), and never deploy while a slug dir is set aside.
5. **The rebuild may produce a worse article.** gemma3:4b is weak. After rebuild, read the article body. If it's coherent but bland, ship it (it beats off-topic). If it's incoherent even though QA passed, restore the original and flag for Nick — QA gates are necessary, not sufficient.
6. **posts.json excerpt drift.** Regeneration changes meta description; the listing card (excerpt in posts.json) must match the new content or the listing shows stale text.
7. **`git mv` into an untracked dir** stages a deletion; plain `mv` of tracked files leaves deletions unstaged. Either way check `git status` before committing so you commit the deletion+re-add as one coherent change, and never stage `.workflow-blocked/`.
8. **Word swaps can break sentence grammar** ("a robust storage plan"→"a reliable storage plan" fine; "robust, seamless workflow" needs the comma cleaned too). Re-read each edited sentence.

## Acceptance criteria

- [ ] Step A1 grep re-run over all 12 posts: zero prose hits (attribute/JSON-LD false positives documented in the session summary if intentionally left).
- [ ] Same grep over each post's `verified.md`: zero prose hits.
- [ ] Both rebuilt posts: `qa.json` pass true, title-topic coherence visually confirmed (every H2 relates to the title), live 200, no 404 window observed.
- [ ] posts.json: no duplicate slugs, excerpts match rebuilt content.
- [ ] All 14 touched posts live-verified 200 after deploy; `accordingly` gone from silver-portfolio-allocation live HTML.
- [ ] Backups of all pre-edit dirs exist in `/tmp/content-cleanup-backups/`; nothing under `public/` gained new backup files.
- [ ] Pushed (content, standing permission) and deployed; session summary written.
