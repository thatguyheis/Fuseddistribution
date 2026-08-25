# PLAN: Inline Internal Link Injector + Deterministic Gate

**Rank: 2 of 5.**

**Goal:** A 2026-07-07 audit found ALL 156 published posts have zero inline internal links in body prose — every post only has the mechanical bottom "Related" block, violating BLOG-SOP.md §9 (requires 2-3 inline links woven into paragraphs). The spec for the gate is already written in `docs/CODEX-HANDOFF-2026-07-07-inline-link-gate.md`. This plan (a) makes `build-links.mjs` deterministically inject 2 inline links into body paragraphs, then (b) adds the gate checks to `qa-local.mjs`. Both must ship together.

**Repo:** `/Users/nick/projects/fuseddistribution`.

**Hard rules for the executor:**
- NEVER `git reset --hard` in this repo.
- Commit locally only; do NOT push (script change, outside standing push permission).
- Don't run between 9:00–10:00 AM PDT (daily cron window).
- Read `docs/CODEX-HANDOFF-2026-07-07-inline-link-gate.md` in full before starting — it is the authoritative spec for the gate checks.

---

## Files to touch

- Modify: `public/blog/scripts/build-links.mjs` (currently ~60 lines; only appends a Related block to `verified.md`)
- Modify: `public/blog/scripts/qa-local.mjs` (add gate checks in `validateHtml` and a new `validateInlineLinks` function)
- Reference (read, don't modify): `public/blog/BLOG-SOP.md` §9; `docs/CODEX-HANDOFF-2026-07-07-inline-link-gate.md`

## Critical ordering constraint (THE key edge case)

The pipeline runs `build-links.mjs` (stage "links") on `verified.md`, then `build-html.mjs` (T7) renders it, then `qa-local.mjs` (T11) gates it. Today `build-links.mjs` produces ONLY the Related block. **If you add the gate without the injector, every future post fails QA and the daily pipeline quarantines 100% of posts.** The injector change and the gate change must land in the same commit, and you must prove the injector satisfies the gate on a real post before committing.

## Step 1: Extend `build-links.mjs` with inline injection

After the existing code that builds `chosen` (the 2-3 related posts, tag-ranked, liveness-verified) and BEFORE the Related-block append, add inline injection. Insert this after the `if (chosen.length === 0)` guard and the existing `let body = readFileSync(verifiedPath, "utf8");` line (move that read up if needed so `body` exists):

```js
// ── Inline injection (SOP §9: 2-3 links INSIDE body paragraphs) ──────────
// For each of the first two chosen posts, find a body paragraph containing a
// significant word from that post's title and wrap the first occurrence in a
// markdown link. Fallback: append a pointer sentence to a mid-article paragraph.
const STOP = new Set(["about","after","best","business","businesses","complete",
  "does","explained","from","getting","guide","into","local","more","need",
  "needs","small","that","their","them","they","this","what","when","where",
  "which","while","with","without","your","silver","how","why","for","and",
  "the","you"]);

function titleAnchors(title) {
  return (title.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [])
    .filter((w) => !STOP.has(w));
}

function injectInline(body, post) {
  const lines = body.split("\n");
  // paragraph line indexes: non-empty, not heading, not list, not already-linked-heavy
  const paraIdx = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.trim() && !/^#|^[-*>]|^\d+\.|^!\[|^\|/.test(l.trim()))
    .map(({ i }) => i);
  if (paraIdx.length === 0) return { body, how: "none" };

  for (const anchor of titleAnchors(post.title)) {
    const re = new RegExp(`\\b(${anchor})\\b`, "i");
    for (const i of paraIdx.slice(1)) { // slice(1): keep the very first paragraph clean for the hook
      const line = lines[i];
      if (line.includes(`](/blog/`)) continue;          // one inline link per paragraph
      const m = line.match(re);
      if (!m) continue;
      // never wrap text that is already inside a markdown link
      const before = line.slice(0, m.index);
      const opens = (before.match(/\[/g) || []).length;
      const closes = (before.match(/\]/g) || []).length;
      if (opens > closes) continue;
      lines[i] = line.slice(0, m.index) +
        `[${m[0]}](/blog/${post.slug}/)` + line.slice(m.index + m[0].length);
      return { body: lines.join("\n"), how: `anchor "${m[0]}" para ${i}` };
    }
  }
  // fallback: append a pointer sentence to a middle paragraph without links
  const mid = paraIdx.filter((i) => !lines[i].includes(`](/blog/`));
  if (mid.length) {
    const i = mid[Math.floor(mid.length / 2)];
    lines[i] = lines[i].replace(/\s*$/, "") +
      ` For more on this, see [${post.title}](/blog/${post.slug}/).`;
    return { body: lines.join("\n"), how: `fallback sentence para ${i}` };
  }
  return { body, how: "none" };
}

let inlineCount = 0;
for (const p of chosen.slice(0, 2)) {
  const r = injectInline(body, p);
  if (r.how !== "none") { body = r.body; inlineCount += 1; console.log(`build-links: inline -> ${p.slug} (${r.how})`); }
}
if (inlineCount < 2) console.error(`build-links: WARNING only ${inlineCount} inline links injected`);
```

Keep the existing Related-block append after this (it operates on the now-modified `body`). Also note the existing early-exit `if (/##\s*Related/i.test(body)) ... exit 0` — inline injection must run BEFORE that check would skip everything; restructure so a re-run on a file that already has a Related block also skips inline injection (idempotency): simplest is to keep the early exit where it is and put the injection after it, since a file with a Related block was already processed.

## Step 2: Verify markdown links render to `<a href>` in HTML

`build-links.mjs` already writes markdown links in the Related block and `build-html.mjs` renders them (all live posts have `<a href="/blog/...">` in the Related section), so inline markdown links will render too. Prove it:

```bash
cd /Users/nick/projects/fuseddistribution
# use any recently published post as a guinea pig — COPY it, never edit in place
cp -R public/blog/silver-coin-holders-and-cases-guide /tmp/gate-test
grep -n "](/blog/" /tmp/gate-test/verified.md | head   # see current links (Related only)
```

Then run the injector against the copy. `build-links.mjs` resolves the post dir from the slug under `public/blog/`, so instead test via the `--verified=` flag it already supports:

```bash
# temporarily remove the Related block from the copy so build-links doesn't early-exit
python3 - <<'PY'
import re
p = "/tmp/gate-test/verified.md"
t = open(p).read()
t = re.split(r"\n## Related\n", t)[0]
open(p, "w").write(t)
PY
node public/blog/scripts/build-links.mjs --slug=silver-coin-holders-and-cases-guide --verified=/tmp/gate-test/verified.md
grep -c "](/blog/" /tmp/gate-test/verified.md
```

Expected: console shows two `build-links: inline ->` lines; grep count = 2 inline + 3 Related + 1 read-next = 6. Note this reads `public/blog/silver-coin-holders-and-cases-guide/meta.json` for tags — that's fine, it exists.

Then render the copy to HTML and confirm anchors land inside body paragraphs. Check `build-html.mjs` usage first (`head -20 public/blog/scripts/build-html.mjs`) — it likely takes `--slug` and reads from the post dir, so you may need to run the whole check on a scratch slug dir under `public/blog/` instead; if so, name it `zz-gate-test`, and DELETE-check: you may create it, but ask Nick before deleting anything you didn't create.

## Step 3: Add the gate to `qa-local.mjs`

Add this function (adapting the handoff spec's four checks) and call it from `validateHtml` after `validateSectionRepetition(html, blockers)`:

```js
function validateInlineLinks(html, blockers, slugDirRoot, selfSlug) {
  const bodyMatch = html.match(/<div class="article-body">([\s\S]*?)(<h2\b[^>]*>\s*Related\s*<\/h2>|<\/article>)/i);
  if (!bodyMatch) { blockers.push('inline links: article-body not found'); return; }
  const body = bodyMatch[1];

  // Check 1: >=2 inline internal links before the Related block
  const inline = (body.match(/href="\/blog\/[a-z0-9-]+\/"/g) || []);
  pushIf(inline.length < 2, blockers, `inline internal links: ${inline.length} found, need >=2`);

  // Check 2: Related block with >=2 items + Read next line
  const relatedBlock = html.match(/<h2\b[^>]*>\s*Related\s*<\/h2>([\s\S]*?)(<h2|<\/article>)/i)?.[1] ?? '';
  const relatedLinks = (relatedBlock.match(/href="\/blog\//g) || []).length;
  pushIf(relatedLinks < 2, blockers, `related block: ${relatedLinks} links, need >=2`);
  pushIf(!/Read next:/i.test(html), blockers, 'missing Read next line');

  // Check 3: every internal blog link target exists locally
  const targets = [...html.matchAll(/href="\/blog\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
  for (const t of new Set(targets)) {
    if (t === selfSlug) continue;
    pushIf(!existsSync(join(slugDirRoot, t, 'index.html')), blockers, `link target missing: /blog/${t}/`);
  }

  // Check 4: bare internal paths in prose (text nodes, not attributes)
  const text = textFromHtml(body);
  pushIf(/(^|[^\w"'=\/])\/(reserve|blog\/[a-z0-9-]+)\/(\s|[.,)]|$)/.test(text), blockers, 'bare internal path in prose');
}
```

Call site — change `validateHtml(join(dir, 'index.html'), blockers);` plumbing so the function receives what it needs; simplest is to widen `validateHtml`:

```js
function validateHtml(htmlPath, blockers, slug) {
  const html = readText(htmlPath);
  ...
  if (html) {
    validateTopicCoherence(html, blockers);
    validateSectionRepetition(html, blockers);
    validateInlineLinks(html, blockers, BLOG_DIR, slug);
  }
}
// and in main():  validateHtml(join(dir, 'index.html'), blockers, slug);
```

Note: `validateTextSurface` already covers `Note:\s*Replace` and bracket placeholders (the handoff's other check-4 half) — do not duplicate those.

## Step 4: Prove gate + injector agree

```bash
# gate must PASS on a post processed by the new injector (from Step 2 output),
# and FAIL on any existing live post (they have zero inline links):
node public/blog/scripts/qa-local.mjs --slug=silver-coin-holders-and-cases-guide --out=/tmp/qa-old.json; echo "exit=$?"
cat /tmp/qa-old.json   # expect pass:false with "inline internal links: 0 found"
```

Then run qa-local against the Step-2 test artifact (rebuild its index.html from the injected verified.md first). Expect `pass: true` with no inline-link blockers. If the injector output still fails the gate, fix the injector, not the gate.

**Regression check:** the gate change must not break existing passing behavior for the other validators. Run `node public/blog/scripts/qa-local.mjs` on 3 different live post slugs and confirm the ONLY new blockers are inline-link ones.

## Step 5: Commit (local only)

```bash
git add public/blog/scripts/build-links.mjs public/blog/scripts/qa-local.mjs
git commit -m "feat: inline internal link injector + deterministic link gate (SOP §9)"
```

Do NOT push. Note for Nick + Codex (Codex owns the gate design per the handoff — flag any spec deviations in the commit message body or a short note in `docs/`).

---

## Edge cases a weaker model would miss

1. **Gate without injector bricks the pipeline** — 100% quarantine from the next 9 AM run. Same commit, proven together (Step 4).
2. **Old posts must keep passing... they won't.** All 156 live posts fail the new gate by design. That's fine — qa-local only runs on NEW posts at build time. But if any recovery/backfill process re-runs qa-local on old artifacts (see PLAN-quarantine-backlog-recovery), those posts must go through the injector first. If executing both plans, do the backlog recovery BEFORE enabling this gate, or make recovery run `build-links.mjs` on each restored post.
3. **Don't wrap text already inside a link.** The `opens > closes` bracket-count guard handles `[silver coins](/blog/x/)` — wrapping "silver" inside it would nest links and break HTML.
4. **First paragraph is skipped** (`paraIdx.slice(1)`): SOP wants an answer-first hook; a link in sentence one hurts that. Mid-body placement is the requirement.
5. **Same-run slugs.** SOP §9 rule 4: never link to a slug created in the same pipeline run. `build-links.mjs` already enforces this via the liveness check (`isLive` HEAD request) — do not add same-run slugs via the fallback sentence path either (fallback only uses `chosen`, which is already filtered — OK as written).
6. **Check 3 gate uses local existence, not HTTP.** During a pipeline run the current post isn't deployed yet; HTTP-checking would be flaky and slow. Local `public/blog/<slug>/index.html` existence is the right test (handoff allows either).
7. **Related-heading regex variance.** Live HTML may render as `<h2 id="related">Related</h2>` — the regexes above use `<h2\b[^>]*>` for that reason. Verify against a real live post file before trusting them.
8. **`--verified=` test path quirk:** build-links reads `meta.json` from the real slug dir even when `--verified` points elsewhere. Fine for testing, but don't accidentally point it at a slug with no meta.json.
9. **Idempotency:** the existing `## Related` early-exit doubles as the injection guard. If you restructure, a re-run must not inject duplicate inline links.

## Acceptance criteria

- [ ] `build-links.mjs` on a Related-stripped copy of a real post injects exactly 2 inline markdown links into body paragraphs (not headings, not lists, not para 1) plus the Related block.
- [ ] Rendered HTML puts `href="/blog/..."` anchors inside `<p>` tags before the Related heading.
- [ ] `qa-local.mjs` fails an unmodified live post with `inline internal links: 0 found, need >=2` and passes the injector-processed test post.
- [ ] `qa-local.mjs` still reports zero NEW non-link blockers on 3 live posts (no regression in existing checks).
- [ ] Running build-links twice on the same file does not duplicate links.
- [ ] Single local commit containing both files; NOT pushed.
- [ ] After Nick pushes: next 9 AM cron publishes a post whose live HTML contains ≥2 inline body links (check with the sed/grep one-liner from the handoff).
