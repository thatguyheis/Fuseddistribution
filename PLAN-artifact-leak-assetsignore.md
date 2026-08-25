# PLAN: Stop Serving Internal Pipeline Artifacts on the Live Site

**Rank: 4 of 5. Smallest plan — under an hour. Can be done any time, independent of the others.**

**Goal:** Verified live on 2026-07-07: every published post publicly serves its internal pipeline artifacts. `curl https://fuseddistribution.com/blog/silver-coin-holders-and-cases-guide/qa.json` → 200, same for `lint.json`, `meta.json`, `hooks.json`, `_status.json`. That's 136+ posts × 5 files of internal QA scores, lint reports, and pipeline stage state exposed — it reveals the site is machine-generated (bad for E-E-A-T if crawled), leaks internal tooling detail, and adds crawlable junk. `public/.assetsignore` already excludes `*.md`, `blog/*/social-copy.json`, etc. — these five patterns were simply missed.

**Repo:** `/Users/nick/projects/fuseddistribution`.

**Hard rules for the executor:**
- NEVER `git reset --hard`.
- `.assetsignore` is a config change, not content: commit locally, do NOT push without Nick. Deploying is fine (deploys are routine here and this only removes files from the served set).
- Do not deploy between 8:50 and 9:40 AM PDT (cron deploy race — a manual deploy near 9 AM can be superseded by the pipeline's deploy; if you must, verify your change is live afterward and redeploy if not).

---

## Files to touch

- Modify: `public/.assetsignore`

## Step 1: Confirm nothing on the site consumes these files

Already checked on 2026-07-07 (no references in any `index.html` or `src/worker.js`), but re-verify since posts regenerate daily:

```bash
cd /Users/nick/projects/fuseddistribution
grep -rl "meta\.json\|hooks\.json\|qa\.json\|lint\.json\|_status\.json" public --include="*.html" --include="*.js" | grep -v node_modules
grep -n "meta\.json\|hooks\.json\|qa\.json\|lint\.json\|_status\.json" src/worker.js
```

Expected: no output from either. If any hit appears, STOP and investigate that consumer before ignoring the file it reads.

Note: `posts.json` (blog listing data) and `projects.json` ARE consumed client-side — they are top-level (`blog/posts.json`, `projects.json`), not per-post, and must NOT be ignored. The patterns below are scoped to per-post dirs (`blog/*/...`) and cannot match `blog/posts.json`; double-check your final file anyway.

## Step 2: Add patterns to `public/.assetsignore`

Current content (for reference):

```
*.md
*.log
*.bak
.DS_Store
.assetsignore
blog/scripts
blog/research
blog/*/social-copy.json
blog/*/posting-pack.json
blog/*/posting-pack.md
```

Append these lines:

```
blog/*/qa.json
blog/*/lint.json
blog/*/meta.json
blog/*/hooks.json
blog/*/_status.json
```

## Step 3: Deploy and verify

```bash
npx wrangler deploy
```

Expected in output: asset count drops (~3147 → ~2500; 5 files × ~136 posts removed). Then verify — artifacts gone, real content untouched:

```bash
S=silver-coin-holders-and-cases-guide
for f in qa.json lint.json meta.json hooks.json _status.json; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w %{http_code} https://fuseddistribution.com/blog/$S/$f)" "$f"
done
# all five: 404
for u in "/blog/$S/" "/blog/$S/hero.jpg" "/blog/posts.json" "/api/spot" "/reserve/" "/" "/sitemap.xml"; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w %{http_code} https://fuseddistribution.com$u)" "$u"
done
# all: 200
```

Spot-check the blog listing renders (posts.json consumed by the blog index page): `curl -s https://fuseddistribution.com/blog/ | grep -c "$S"` → ≥1.

## Step 4: Commit (local only)

```bash
git add public/.assetsignore
git commit -m "fix: stop serving per-post pipeline artifacts (qa/lint/meta/hooks/_status)"
```

Do NOT push; tell Nick it's deployed and awaiting push approval.

---

## Edge cases a weaker model would miss

1. **`blog/posts.json` vs `blog/*/meta.json`.** The listing page depends on `blog/posts.json`. The glob `blog/*/meta.json` has a path segment between, so it can't match it — but a careless "cleaner" pattern like `blog/**/*.json` would take the site's blog listing down. Only add the five exact patterns.
2. **Deploy ≠ done.** Wrangler can report success while the 9 AM cron's parallel deploy supersedes yours (documented incident in this repo). Verify with curl AFTER deploying; if artifacts still return 200 fifteen minutes later, check `npx wrangler deployments list` and redeploy.
3. **`.assetsignore` only affects future uploads — but assets are manifest-based**, so an excluded file disappears from the live manifest on the next deploy. No cache purge should be needed (Workers assets serve from the manifest), but if a 200 lingers, it's CDN cache: retest with `curl -H "Cache-Control: no-cache"` and give it time before escalating.
4. **Don't ignore `hero.jpg`, `photo-post.jpg`, `images/`, or `hero.svg`.** Post pages and social cards reference them. Only the five JSON artifact patterns.
5. **The pipeline reads these files locally** (`build-links.mjs` reads `meta.json`, etc.). `.assetsignore` changes only what wrangler uploads — zero effect on local pipeline behavior. Do not "help" by moving/deleting the files themselves.
6. **`reel-data.md`/`verified.md`/`gemma_draft.md` are already covered** by the existing `*.md` rule (verified 404 live). Don't add redundant rules.

## Acceptance criteria

- [ ] All five artifact URLs return 404 for at least 3 different post slugs (test one old, one recent, one from today).
- [ ] Post pages, hero images, `/blog/posts.json`, `/api/spot`, `/reserve/`, `/`, `/sitemap.xml` all still 200.
- [ ] Blog listing page still renders post cards.
- [ ] Deployed asset count dropped by roughly 5 × post count.
- [ ] One-line diff review: `git diff HEAD~1 -- public/.assetsignore` shows exactly 5 added lines.
- [ ] Committed locally, NOT pushed.
