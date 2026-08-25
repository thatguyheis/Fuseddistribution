# PLAN: Recover the Quarantined Post Backlog (~19 finished posts sitting dead)

**Rank: 3 of 5. Depends on PLAN-quarantine-autorepair (uses its sanitizer). Do BEFORE enabling the gate in PLAN-inline-link-injector-gate, or run its injector on each recovered post.**

**Goal:** `.workflow-blocked/` holds ~19 fully built posts (article, hero, images, reel script, social copy — all paid for in compute and API calls) blocked by QA failures that are now deterministically repairable. The 2026-07-02 session proved the recovery recipe manually (4 posts restored, sanitized, re-QA'd, published same day). This plan scripts that recipe and drains the backlog.

**Repo:** `/Users/nick/projects/fuseddistribution`.

**Hard rules for the executor:**
- NEVER `git reset --hard`.
- Content commits (blog posts, sitemap, posts.json, topic-history) MAY be pushed to `origin main` under the standing permission (granted 2026-06-10). The recovery SCRIPT itself is not content — commit it separately and do not push that commit's file... in practice: put the script commit first, content commits after, and push only if the script commit is content-free is impossible to separate — then simplest safe route: **commit the script locally, do all content commits, and push nothing until Nick confirms** OR push content-only by committing the script AFTER the content pushes. Choose: script commit LAST, unpushed.
- No gate bypass ever: a post that still fails `qa-local.mjs` after repair stays blocked.
- Run outside 9:00–10:00 AM PDT. A manual `wrangler deploy` near 9 AM can be superseded by the cron's own deploy — after deploying, verify your version is live (see Step 6).

---

## Files to touch

- Create: `scripts/recover-blocked.sh`
- Modified by the script at runtime: `public/blog/<slug>/` dirs, `public/blog/posts.json`, `public/blog/topic-history.md`, `public/sitemap.xml`
- Requires (from PLAN-quarantine-autorepair): `public/blog/scripts/sanitize-draft.py`

## Inventory (verified 2026-07-07)

```
.workflow-blocked/2026-06-18: canadian-silver-maple-leaf-investment-guide, how-to-ask-customers-for-google-reviews, how-to-get-more-google-reviews-for-your-business
.workflow-blocked/2026-06-19: austrian-silver-philharmonic-guide, britannias-vs-eagles-which-silver-coin-is-best, google-review-strategy-that-actually-works, how-to-respond-to-negative-google-reviews
.workflow-blocked/2026-06-20: does-responding-to-reviews-improve-local-seo, how-many-google-reviews-do-you-need-to-rank, how-much-silver-should-you-own-in-your-portfolio, silver-rounds-complete-buyer-guide
.workflow-blocked/2026-06-21: (duplicate -recovery/-fix2 attempts of 6/20 slugs — take NEWEST attempt per slug across all dates)
.workflow-blocked/2026-06-22: how-to-turn-bad-reviews-into-better-outcomes, silver-investment-for-beginners-complete-guide
.workflow-blocked/2026-06-23: how-much-does-a-small-business-website-cost
.workflow-blocked/2026-06-25: what-pages-every-small-business-website-needs
.workflow-blocked/2026-06-27: landing-page-vs-website-which-do-you-need
.workflow-blocked/2026-06-28: instagram-for-local-business-complete-guide
.workflow-blocked/2026-06-30: silver-supply-deficit-explained-2026
.workflow-blocked/2026-07-01: facebook-ads-for-local-business-beginner-guide
.workflow-blocked/2026-07-03: best-silver-storage-options-for-investors
.workflow-blocked/2026-07-04: silver-storage-vault-vs-home-storage
.workflow-blocked/2026-07-07: insuring-physical-silver-at-home
SKIP: .workflow-blocked/2026-06-17/manual-cleanup-145530 (not a post)
```

Dir naming: `<slug>-HHMMSS[...suffix]`. The slug is the dir name with the trailing `-\d{6}.*` stripped.

## Step 1: Create `scripts/recover-blocked.sh`

```bash
#!/bin/zsh
# Recover quarantined posts: restore -> sanitize -> rebuild html -> re-QA ->
# register -> commit. One commit per post. NO deploy here (Step 5 does that once).
set -euo pipefail
cd /Users/nick/projects/fuseddistribution
BLOG=public/blog
SD=$BLOG/scripts
TODAY=$(date +%Y-%m-%d)
PASS=(); FAIL=(); SKIP=()

# newest attempt per slug across all .workflow-blocked/*/ dirs
typeset -A latest
for d in .workflow-blocked/*/*(/N); do
  base=${d:t}
  [[ $base == manual-cleanup-* ]] && continue
  slug=$(echo "$base" | sed -E 's/-[0-9]{6}(-[a-z0-9]+)?$//')
  [[ -f "$d/verified.md" && -f "$d/index.html" ]] || { SKIP+=("$base (incomplete)"); continue; }
  # newest wins: dirs sort by date dir + HHMMSS; overwrite as we iterate sorted order
  latest[$slug]=$d
done

for slug in ${(k)latest}; do
  src=${latest[$slug]}
  echo "== $slug (from $src)"

  # skip if already live (a later run may have published the same slug)
  if grep -q "\"slug\": \"$slug\"" $BLOG/posts.json; then SKIP+=("$slug (already in posts.json)"); continue; fi
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://fuseddistribution.com/blog/$slug/")
  if [[ $code == 200 ]]; then SKIP+=("$slug (already live)"); continue; fi

  [[ -e $BLOG/$slug ]] && { SKIP+=("$slug (dir exists in public/blog — resolve manually)"); continue; }
  cp -R "$src" "$BLOG/$slug"

  # repair text artifacts
  python3 $SD/sanitize-draft.py $BLOG/$slug/verified.md
  # refresh publish date to today (posts.json is newest-first; stale dates break ordering)
  python3 - "$BLOG/$slug/meta.json" "$TODAY" <<'PY'
import json,sys
p,today=sys.argv[1],sys.argv[2]
m=json.load(open(p)); old=m.get("date"); m["date"]=today
json.dump(m,open(p,"w"),indent=2)
print(f"  date {old} -> {today}")
PY

  # rebuild html from repaired verified.md (also fixes date in rendered JSON-LD)
  node $SD/build-html.mjs --slug=$slug 2>&1 | sed 's/^/  /'
  # repair social copy + reel script text in place (sanitizer is markdown/text-safe)
  python3 $SD/sanitize-draft.py $BLOG/$slug/reel-script.md 2>/dev/null || true
  python3 - "$BLOG/$slug/social-copy.json" <<'PY'
import json,subprocess,sys,tempfile,os
p=sys.argv[1]
d=json.load(open(p))
def walk(x):
    if isinstance(x,str):
        f=tempfile.NamedTemporaryFile("w",suffix=".md",delete=False); f.write(x); f.close()
        subprocess.run(["python3","public/blog/scripts/sanitize-draft.py",f.name],check=True)
        out=open(f.name).read(); os.unlink(f.name); return out
    if isinstance(x,list): return [walk(i) for i in x]
    if isinstance(x,dict): return {k:walk(v) for k,v in x.items()}
    return x
json.dump(walk(d),open(p,"w"),indent=2)
PY

  # re-gate. NO bypass.
  if node $SD/qa-local.mjs --slug=$slug --out=$BLOG/$slug/qa.json; then
    node $SD/add-to-posts.mjs --slug=$slug
    title=$(python3 -c "import json;print(json.load(open('$BLOG/$slug/meta.json'))['title'])")
    echo "- $TODAY $slug — $title (recovered)" >> $BLOG/topic-history.md
    node $SD/generate-sitemap.mjs
    git add "$BLOG/$slug/" $BLOG/posts.json $BLOG/topic-history.md public/sitemap.xml
    git commit -m "feat: $slug (recovered from quarantine)"
    PASS+=($slug)
  else
    echo "  STILL FAILING: $(cat $BLOG/$slug/qa.json)"
    rm -rf "$BLOG/$slug"   # restore repo state; original stays in .workflow-blocked
    FAIL+=($slug)
  fi
done

echo; echo "RECOVERED: ${PASS[*]:-none}"; echo "STILL BLOCKED: ${FAIL[*]:-none}"; echo "SKIPPED: ${SKIP[*]:-none}"
```

`chmod +x scripts/recover-blocked.sh`

**Before running:** check `build-html.mjs` and `topic-history.md` conventions:
- `head -20 public/blog/scripts/build-html.mjs` — confirm the `--slug=` flag and that it reads `verified.md` + `meta.json` from the slug dir. If flags differ, adjust the script.
- `tail -5 public/blog/topic-history.md` — match the existing line format exactly (the format above is a guess; copy the real one).
- Confirm what `build-post.sh` does between html and qa that we might be skipping: it runs pexels injection (photos already exist in the quarantined artifacts) — but **rebuilding index.html from verified.md may drop the injected `<figure>` photo blocks** if pexels injection edits index.html post-render. Check: `grep -n "figure\|inject" public/blog/scripts/build-pexels.sh | head`. If injection targets index.html, re-run `build-pexels.sh` after `build-html.mjs` (images are already downloaded in the dir; check that script for an offline/reuse mode) or skip the html rebuild for posts whose only defect is in social-copy (repair index.html in place with sanitize-draft.py instead).

## Step 2: Dry-run on ONE post first

Run the loop body manually for `insuring-physical-silver-at-home` (the newest, known-simple failure: bracket placeholder). Verify each intermediate:

```bash
# after sanitize: no [VERIFY], lint passes
grep -c VERIFY public/blog/insuring-physical-silver-at-home/verified.md   # 0
node public/blog/scripts/lint-draft.mjs public/blog/insuring-physical-silver-at-home/verified.md --quiet && echo OK
# after html rebuild: photos still present
grep -c "<figure" public/blog/insuring-physical-silver-at-home/index.html  # expect 2
# qa passes
node public/blog/scripts/qa-local.mjs --slug=insuring-physical-silver-at-home
```

Read the rendered article body once with human eyes (or print the first 40 lines of text) — sentence-drop repairs can leave a paragraph thin. If a paragraph has fewer than 2 sentences, delete the whole paragraph.

## Step 3: Run the full script

`./scripts/recover-blocked.sh 2>&1 | tee /tmp/recover-blocked.log`

Expect a mix: placeholder/banned-word/cents failures should recover; the reel-timing failure (`silver-storage-vault-vs-home-storage`, segment narration window) will likely STILL FAIL — that's correct behavior, leave it.

## Step 4: Push content commits

Standing permission covers these (blog posts, posts.json, sitemap, topic-history):

```bash
git push origin main
```

If push is rejected by GitHub secret scanning, STOP and follow BLOG-SOP.md §17.

## Step 5: Deploy + verify

```bash
npx wrangler deploy
sleep 5
# every recovered slug must be live:
for s in $(git log --oneline -30 | grep "recovered from quarantine" | sed -E 's/.*feat: ([a-z0-9-]+) .*/\1/'); do
  printf "%s %s\n" "$(curl -s -o /dev/null -w %{http_code} https://fuseddistribution.com/blog/$s/)" "$s"
done
# blog listing must include them:
curl -s https://fuseddistribution.com/blog/posts.json | grep -c '"slug"'
```

All 200s; posts.json count = local count (`grep -c '"slug"' public/blog/posts.json`). If posts.json live ≠ local, redeploy once (known stale-manifest race, fixed 7/02 but verify anyway).

## Step 6: Commit the script itself (local only, unpushed)

```bash
git add scripts/recover-blocked.sh
git commit -m "feat: quarantine recovery script"
```

Do NOT push this one until Nick reviews. (If it's already entangled with pushed content commits, tell Nick rather than rewriting history — NEVER rewrite pushed commits in this repo.)

---

## Edge cases a weaker model would miss

1. **Duplicate attempts:** 6/20 and 6/21 contain the same slugs (`-recovery`, `-fix2` suffixes). Recover only the newest attempt per slug; publishing two dirs for one slug corrupts posts.json.
2. **Already republished slugs:** a quarantined slug may have been successfully re-generated on a later day. The `posts.json` + live-200 checks catch this. Skip, don't overwrite.
3. **Stale dates:** artifacts carry June dates in `meta.json` AND inside `index.html` JSON-LD. `add-to-posts.mjs` prepends to a newest-first list — a June date at the top breaks the listing order. Update meta.json date and REBUILD html so the JSON-LD matches; a sed on index.html alone misses `dateModified` variants.
4. **Pexels figures live in index.html, not verified.md.** Rebuilding html from verified.md can silently drop the photo figures. Verify `<figure` count = 2 after rebuild (Step 2); if dropped, re-run the pexels injection step.
5. **Stat freshness:** silver posts from mid-June may quote June spot prices as "current". The sanitizer only repairs `[VERIFY]` sentences. Grep each recovered silver post for `\$\d+` near "spot"/"per ounce" and update to `/api/spot` values where the sentence claims currency ("currently", "today", "as of").
6. **Topic-history dedupe:** the daily pipeline picks topics by consulting `topic-history.md` / `topic-index.json`. Registering recovered posts without appending topic-history means tomorrow's run could pick the same topic again → cannibalization.
7. **No gate bypass, no half-publish:** if qa-local fails post-repair, remove the restored dir from `public/blog/` (otherwise an unregistered-but-deployed dir ships via wrangler assets — everything under `public/` deploys, registered or not).
8. **Reel videos:** recovered posts have reel scripts but no rendered MP4s. The 11:00 `render-missing-reels` LaunchAgent should pick them up; don't render manually.
9. **Deploy race:** never deploy 8:50–9:40 AM PDT; the cron's deploy can supersede yours (documented incident). Verify live content after deploy, not just exit code.
10. **`set -euo pipefail` + zsh arrays:** `${PASS[*]:-none}` and `typeset -A` are zsh-isms; keep the shebang `/bin/zsh` (matches the repo's other scripts).

## Acceptance criteria

- [ ] Every recovered slug: live 200, present in live posts.json, present in sitemap.xml, `<figure` count preserved, qa.json `pass: true`, zero `[VERIFY]`/banned words in live HTML.
- [ ] posts.json local slug-count increased by exactly the number of RECOVERED posts; no duplicate slugs (`grep -o '"slug": "[^"]*"' public/blog/posts.json | sort | uniq -d` → empty).
- [ ] Still-failing posts remain in `.workflow-blocked/` untouched, and `public/blog/` contains no unregistered recovered dirs.
- [ ] topic-history.md has one line per recovered post in the existing format.
- [ ] One git commit per recovered post, pushed; recovery script committed separately, unpushed.
- [ ] Final summary block (RECOVERED / STILL BLOCKED / SKIPPED) written to `docs/session_summary_<date>_quarantine_recovery.md`.
