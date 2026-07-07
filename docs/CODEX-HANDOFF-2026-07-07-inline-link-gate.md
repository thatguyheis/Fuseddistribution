# Codex Handoff — Deterministic Inline Internal Link Gate

Date: 2026-07-07
From: Claude (editorial/QA lane)
To: Codex (workflow architecture / gates)
Approved by: Nick

## Problem

BLOG-SOP.md §9 requires 2-3 inline internal links inside body paragraphs (intro link + mid-body link) plus the bottom Related block and Read-next line. An audit of all 156 published posts on 2026-07-07 found **zero posts with any inline body link**. Every post has the identical mechanical pattern: 3 links in a bottom `<h2>Related</h2>` list + 1 Read-next line, nothing woven into prose. The write stage satisfies the checklist with the Related block; no deterministic gate catches the missing inline links, so the miss shipped 156 times.

Two secondary defects the same gate family should catch (both found live on 2026-07-06 posts):

1. Bare internal paths as plain text in prose, e.g. literal `/reserve/` not wrapped in `<a>` (seen in `best-ways-to-clean-silver-coins-without-damage`, `does-tarnished-silver-lose-value`).
2. Unreplaced template placeholders shipped to production, e.g. `[Link to Scheduling Tool]` and a leftover "Note: Replace ..." instruction paragraph (seen in `welcome-email-sequence-for-new-customers`).

## What Claude already changed (2026-07-07)

- BLOG-SOP.md §9 rewritten: inline requirement now explicit ("Related block alone does NOT pass"), correct/wrong HTML examples added, Related block format documented (it existed site-wide but was documented nowhere), self-check commands added (steps 5-6).
- Checklist item (§ pre-commit list, ~line 62) reworded to "2-3 INLINE links inside body paragraphs + Related block + Read next".
- The 5 most recent posts retrofitted with inline links and the bare-path/placeholder bugs fixed. Older 151 posts intentionally NOT backfilled per Nick's decision.

SOP changes are prompt-level guidance only. The write stage ignored §9 once already; a deterministic gate is needed.

## Requested gate (proposed spec — Codex owns final design)

Add to the blog QA stage (wherever build-post QA runs, before posts.json registration), per slug:

**Check 1 — inline link count.** Count `href="/blog/` occurrences in `index.html` between `<div class="article-body">` and `<h2>Related</h2>`. FAIL if < 2. Reference implementation:

```bash
n=$(sed -n '/<div class="article-body">/,/<h2>Related<\/h2>/p' "public/blog/$SLUG/index.html" | grep -c 'href="/blog/')
[ "$n" -ge 2 ] || fail "inline internal links: $n found, need >=2"
```

**Check 2 — Related block present.** `<h2>Related</h2>` with >=2 `<li><a href="/blog/` entries, plus a `Read next:` line. FAIL if absent.

**Check 3 — link targets resolve.** Every `href="/blog/[slug]/"` in the article must exist as `public/blog/[slug]/index.html` locally OR return HTTP 200 live. Must NOT be a slug created in the same pipeline run (SOP §9 rule 4).

**Check 4 — no bare internal paths / placeholders in body.** FAIL on any of these inside article body text (outside tag attributes):
- Regex `[^"'=](/reserve/|/blog/[a-z0-9-]+/)` matching in text nodes (bare path in prose)
- `\[Link to`, `\[Your Service\]`-style unreplaced `[...]` placeholders combined with a "Note: Replace" paragraph

Failure handling: same path as existing QA failures — block registration to posts.json, preserve artifacts in `.workflow-blocked/`, notify. Do not silently strip or auto-fix.

## Notes / observations for Codex

- `automated-email-sequences-for-local-business` (2026-07-05) body repeats the same 5 talking points ~4 times under different H2s, and `welcome-email-sequence-for-new-customers` body content (GBP/reviews/website) does not match its title/topic at all. Both passed QA. Suggests the QA brain stage is not checking topic-title coherence or repetition; separate issue, flagging only.
- Existing per-post artifacts `qa.json` / `lint.json` contain no link checks today; the new checks could live there for auditability.
- Claude will follow updated SOP §9 (inline links + self-check) in the write stage from the next pipeline run regardless of gate status; the gate is the backstop.
