# PLAN: Deterministic Draft Auto-Repair (stop the daily quarantine bleed)

**Rank: 1 of 5 — do this first.**

**Goal:** The daily pipeline loses roughly one post every other day because the local gemma writer emits content the deterministic QA gate correctly blocks: leftover `[VERIFY]` markers, banned AI words the LLM fix loop can't remove, and cents-typo price ranges. Quarantines occurred on 6/17, 6/18, 6/19, 6/20, 6/21, 6/22, 6/23, 6/25, 6/27, 6/28, 6/30, 7/01, 7/03, 7/04, 7/07. This plan adds a deterministic sanitizer (like the existing dash sanitizer that fixed the 6/25–7/02 dash quarantines) that repairs these three failure classes before lint/QA ever sees them.

**Repo:** `/Users/nick/projects/fuseddistribution` (all paths below relative to this).

**Hard rules for the executor:**
- NEVER run `git reset --hard` in this repo.
- Commit locally; do NOT `git push` — this is a script change, not content, so it is outside the standing push permission. Nick reviews and pushes.
- Do not run anything between 9:00 and 10:00 AM PDT (daily cron pipeline runs then).

---

## Files to touch

- Create: `public/blog/scripts/sanitize-draft.py`
- Modify: `public/blog/scripts/write-article.sh` (the lint loop at ~lines 155–200)
- Test fixture already exists: `.workflow-blocked/2026-07-07/insuring-physical-silver-at-home-093707/verified.md` (contains real `[VERIFY]` markers)

## Background you need

- `write-article.sh` writes markdown to `verified.md`, then runs a lint loop (max 3 attempts): `sanitize_dashes` → `node lint-draft.mjs` → if fail, ask the LLM to fix → repeat. After 3 failures it exits 1 with a warning and the pipeline continues in "write-warn" mode; the later QA gate (`qa-local.mjs`) then blocks and quarantines.
- `qa-local.mjs` blockers relevant here (do not modify that file in this plan):
  - `/\[SLOT]|\[VERIFY]/i` → "leftover placeholder"
  - `/\[[A-Z][A-Za-z0-9 _-]{2,}\]/` → "unreplaced bracket placeholder"
  - `/\$\s*\d+(?:\.\d{2})?\s+(?:to|-)\s+\$\s*\d+\.\d{2}\b/i` → "budget range uses cents; likely numeric typo"
- `[VERIFY]` markers are intentional upstream: `gemma-research.sh` tells the model to mark uncertain stats `[VERIFY]`. In takeover mode (`CLAUDE_ENABLED=0`) nothing resolves them, so they reach QA and block.
- Live spot prices are available at `https://fuseddistribution.com/api/spot` returning JSON like `{"silver":62.61,"gold":4176.38,"prev":{...}}`. Use this to repair spot-price sentences instead of deleting them.

---

## Step 1: Create `public/blog/scripts/sanitize-draft.py`

Exact content:

```python
#!/usr/bin/env python3
"""Deterministic draft sanitizer. Repairs the three recurring QA blockers the
local writer produces: [VERIFY] markers, banned AI words, cents-typo ranges.
Runs on markdown (verified.md). Idempotent. No LLM involved.

Usage: python3 sanitize-draft.py <path-to-verified.md>
"""
import json
import re
import sys
import urllib.request

SPOT_URL = "https://fuseddistribution.com/api/spot"

# Word/phrase swaps for every term lint-draft.mjs flags. Longest first so
# phrases match before their component words. All lowercase; case of the
# first letter is preserved at replacement time.
SWAPS = [
    ("it is important to note that", ""),
    ("it is worth mentioning that", ""),
    ("it's important to note that", ""),
    ("it is important to note", ""),
    ("take it to the next level", "improve it"),
    ("embark on a journey", "start"),
    ("unleash the potential", "use"),
    ("unlock the power", "use"),
    ("lay the groundwork", "prepare"),
    ("in today's landscape", "today"),
    ("master the art of", "get good at"),
    ("push the boundaries", "go further"),
    ("needless to say", ""),
    ("when it comes to", "for"),
    ("in this blog post", "here"),
    ("bridge the gap", "close the gap"),
    ("a testament to", "proof of"),
    ("in recent years", "recently"),
    ("drive synergies", "work together"),
    ("pave the way", "prepare"),
    ("capitalize on", "take advantage of"),
    ("best practices", "proven methods"),
    ("in this article", "here"),
    ("in this guide", "here"),
    ("best-in-class", "top"),
    ("game-changing", "important"),
    ("in an era of", "with"),
    ("delve deeper", "go deeper"),
    ("cutting-edge", "modern"),
    ("delve into", "look at"),
    ("end-to-end", "complete"),
    ("value-add", "benefit"),
    ("dive in", "get started"),
    ("groundbreaking", "new"),
    ("transformative", "major"),
    ("revolutionize", "change"),
    ("consequently", "as a result"),
    ("additionally", "also"),
    ("furthermore", "also"),
    ("unparalleled", "unmatched"),
    ("seamlessly", "smoothly"),
    ("cornerstone", "foundation"),
    ("streamline", "simplify"),
    ("facilitate", "help"),
    ("spearhead", "lead"),
    ("watershed", "turning point"),
    ("ecosystem", "system"),
    ("paradigm", "model"),
    ("testament", "proof"),
    ("landscape", "market"),
    ("paramount", "essential"),
    ("holistic", "complete"),
    ("scalable", "flexible"),
    ("moreover", "also"),
    ("catalyst", "trigger"),
    ("leverage", "use"),
    ("utilize", "use"),
    ("empower", "help"),
    ("harness", "use"),
    ("elevate", "improve"),
    ("tapestry", "mix"),
    ("synergy", "teamwork"),
    ("notably", "in particular"),
    ("robust", "reliable"),
    ("seamless", "smooth"),
    ("foster", "build"),
    ("embark", "start"),
    ("beacon", "example"),
    ("indeed", ""),
    ("realm", "area"),
    ("nexus", "hub"),
    ("thus", "so"),
]


def fetch_spot():
    try:
        with urllib.request.urlopen(SPOT_URL, timeout=10) as r:
            d = json.loads(r.read().decode("utf-8"))
        return float(d["silver"]), float(d["gold"])
    except Exception:
        return None, None


def repair_verify(text):
    """Resolve or remove [VERIFY]-marked claims.

    - Heading lines: strip the marker only (never delete a heading).
    - Sentence mentions silver/gold spot price with a $ figure and live spot
      data is available: replace the $ figure with the live price, strip marker.
    - Anything else: delete the whole sentence (the stat is untrusted).
    """
    if "[VERIFY]" not in text:
        return text
    silver, gold = fetch_spot()
    out_lines = []
    for line in text.split("\n"):
        if "[VERIFY]" not in line:
            out_lines.append(line)
            continue
        if line.lstrip().startswith("#"):
            out_lines.append(line.replace("[VERIFY]", "").rstrip())
            continue
        # Split into sentences. Keep it simple: split on '. ' boundaries that
        # are not inside a number ("$4.5" must not split).
        parts = re.split(r"(?<!\d)(?<=[.!?])\s+", line)
        kept = []
        for s in parts:
            if "[VERIFY]" not in s:
                kept.append(s)
                continue
            low = s.lower()
            price_m = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", s)
            metal = "silver" if "silver" in low else ("gold" if "gold" in low else None)
            spot = {"silver": silver, "gold": gold}.get(metal)
            if price_m and spot and ("spot" in low or "price" in low or "per ounce" in low):
                # A sentence can carry both metals ("gold is $X ... silver is $Y").
                # Walk each $ figure and pick the metal word nearest BEFORE it.
                def price_for_position(pos):
                    g = low.rfind("gold", 0, pos)
                    sv = low.rfind("silver", 0, pos)
                    if g < 0 and sv < 0:
                        return spot
                    return gold if g > sv else silver
                figs = list(re.finditer(r"\$\s*([\d,]+(?:\.\d+)?)", s))
                new_s, last = [], 0
                usable = True
                for f in figs:
                    p = price_for_position(f.start())
                    if p is None:
                        usable = False
                        break
                    new_s.append(s[last:f.start(1)] + f"{p:.2f}")
                    last = f.end(1)
                if not usable:
                    continue  # drop sentence: metal named but no live price
                s = "".join(new_s) + s[last:]
                s = s.replace("[VERIFY]", "").replace("  ", " ").rstrip()
                kept.append(s)
            else:
                pass  # drop the sentence entirely
        rebuilt = " ".join(x for x in kept if x.strip())
        if rebuilt.strip():
            out_lines.append(rebuilt)
        # if the whole line was one unverifiable sentence, the line disappears
    return "\n".join(out_lines)


def repair_banned(text):
    for term, repl in SWAPS:
        pattern = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)

        def sub(m, repl=repl):
            src = m.group(0)
            if not repl:
                return ""
            if src[0].isupper():
                return repl[0].upper() + repl[1:]
            return repl

        text = pattern.sub(sub, text)
    # tidy artifacts of empty replacements: ", ," / " ,", double spaces,
    # a lowercase sentence start after removing a leading hedge
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,", ",", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    return text


def repair_cents(text):
    # "$5.00 to $10.00" or "$7 - $15.50" -> drop cents inside $A to/- $B ranges
    def fix(m):
        return re.sub(r"\$\s*(\d+)\.\d{2}\b", r"$\1", m.group(0))

    return re.sub(
        r"\$\s*\d+(?:\.\d{2})?\s+(?:to|-)\s+\$\s*\d+(?:\.\d{2})?", fix, text
    )


def main():
    path = sys.argv[1]
    with open(path, encoding="utf-8") as f:
        text = f.read()
    text = repair_verify(text)
    text = repair_banned(text)
    text = repair_cents(text)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


if __name__ == "__main__":
    main()
```

Then: `chmod +x public/blog/scripts/sanitize-draft.py`

## Step 2: Test standalone against the real quarantined draft

```bash
cd /Users/nick/projects/fuseddistribution
cp .workflow-blocked/2026-07-07/insuring-physical-silver-at-home-093707/verified.md /tmp/test-draft.md
python3 public/blog/scripts/sanitize-draft.py /tmp/test-draft.md
grep -c 'VERIFY' /tmp/test-draft.md          # expect: 0
grep -icE 'robust|paramount|furthermore' /tmp/test-draft.md   # expect: 0
node public/blog/scripts/lint-draft.mjs /tmp/test-draft.md --quiet && echo LINT-PASS
```

Expected: `LINT-PASS`. If lint still fails, run without `--quiet`, read which term remains, add it to `SWAPS`, retest. Also open `/tmp/test-draft.md` and read the paragraphs that contained `[VERIFY]` — confirm the spot-price sentences now carry a plausible live price (silver ≈ $60s, gold ≈ $4100s as of 2026-07) and no sentence fragments were left behind.

## Step 3: Wire into `write-article.sh`

In `public/blog/scripts/write-article.sh`, find the lint loop (search for `for attempt in 1 2 3`). It currently begins each pass with `sanitize_dashes "$OUT"`. Change the loop body so every pass runs both sanitizers:

```bash
for attempt in 1 2 3; do
  sanitize_dashes "$OUT"
  python3 "$SD/sanitize-draft.py" "$OUT"
  if node "$LINT" "$OUT" --out="$LINT_OUT" --quiet; then
```

Note: check what variable the script uses for its own directory (the dash sanitizer block and the `$LINT` assignment near the top show the convention — it may be `$SD`, `$SCRIPT_DIR`, or a literal path). Use the same variable. If none exists, use `"$(dirname "$0")/sanitize-draft.py"`.

## Step 4: Run one full end-to-end check without publishing

Re-run the quarantined post through the write stage only (this writes `verified.md` fresh via the local model, so it needs ollama running — check with `curl -s localhost:11434/api/tags >/dev/null && echo OK`). If ollama is not running, skip this step; Step 2 already proves the sanitizer works, and tomorrow's 9 AM cron is the live test.

```bash
mkdir -p /tmp/sanitize-e2e && cd /Users/nick/projects/fuseddistribution
HERMES_TAKEOVER=1 CLAUDE_ENABLED=0 LOCAL_LLM=/Users/nick/bin/hermes-local.sh \
HERMES_LOCAL_BASE_URL=http://localhost:11434/v1 HERMES_LOCAL_MODEL=gemma3:4b-it-qat HERMES_LOCAL_MAX_TOKENS=256 \
bash public/blog/scripts/write-article.sh --slug=sanitize-e2e-test --keyword="how to store silver coins safely" --out=/tmp/sanitize-e2e/verified.md
```

(Check `write-article.sh --help` or its arg parsing at the top of the file for the exact flag names; adjust if they differ.) Expected: `lint PASS` on attempt 1 or 2. Delete `/tmp/sanitize-e2e` afterward.

## Step 5: Commit (local only)

```bash
git add public/blog/scripts/sanitize-draft.py public/blog/scripts/write-article.sh
git commit -m "fix: deterministic draft sanitizer for [VERIFY]/banned-word/cents quarantine causes"
```

Do NOT push. Leave a note for Nick that it's ready for review.

---

## Edge cases a weaker model would miss

1. **Do not delete spot-price sentences — repair them.** A dumb fix strips `[VERIFY]` markers, which ships unverified fabricated stats (the draft claims silver "$62.62" — a stale/fabricated number). Equally dumb is deleting every `[VERIFY]` sentence, which guts silver posts of their key numbers. The rule: repair with live `/api/spot` data when the sentence is a spot-price claim, delete otherwise.
2. **`[VERIFY]` inside headings.** Deleting a "sentence" that is a heading destroys document structure. Strip the marker only.
3. **Sentence splitting near prices.** `"$4.5 trillion. Next sentence"` — a naive `split('.')` chops `$4.5`. The regex in Step 1 uses `(?<!\d)` to avoid splitting inside numbers.
4. **Word-boundary and case.** `leverage → use` must not mangle `leveraged` mid-word differently than expected (`\b` handles it: "leveraged" won't match "leverage\b"... it will actually match "leverage" inside "leveraged"? No — `\bleverage\b` does not match in "leveraged" because there's no boundary before "d". Correct as written). And `Robust → Reliable` must keep the capital.
5. **Longest-phrase-first ordering.** If `landscape → market` ran before `in today's landscape → today`, you'd get "in today's market" left containing the banned opener pattern. The `SWAPS` list is ordered longest-first — keep it that way when adding terms.
6. **Empty replacements leave grammar scars.** "Indeed, this works" → ", this works". The tidy-up regexes in `repair_banned` fix leading commas, double spaces, and re-capitalize sentence starts. Spot-check output by reading it, not just by lint pass.
7. **`|| true` guards in write-article.sh exist for session-limit handling.** Do not "clean up" or restructure the surrounding loop; only add the one sanitizer line. The comments in that file explain why.
8. **The reel-timing quarantine class (7/04, "22s window shorter than narration minimum") is NOT fixed by this plan.** That's a reel-script generation issue. Out of scope — do not attempt it here; note it as remaining.
9. **Network failure fetching /api/spot** must not crash the pipeline. `fetch_spot` returns `(None, None)` and the sentence is dropped instead — degraded but safe.

## Acceptance criteria

- [ ] `python3 public/blog/scripts/sanitize-draft.py` on a copy of `.workflow-blocked/2026-07-07/.../verified.md` produces a file with zero `[VERIFY]`, zero lint violations (`lint-draft.mjs` exits 0).
- [ ] Silver/gold spot sentences in that file contain live prices from `/api/spot` (compare with `curl -s https://fuseddistribution.com/api/spot`).
- [ ] Running the sanitizer twice on the same file produces identical output (idempotent): `python3 ... f.md && md5 f.md && python3 ... f.md && md5 f.md` — same hash.
- [ ] `write-article.sh` diff shows exactly one added line in the lint loop (plus nothing else changed).
- [ ] Committed locally; NOT pushed.
- [ ] Next 9 AM cron run (check `~/Library/Logs/daily-blog-reel.log` after 10 AM): no `write-warn`/quarantine caused by placeholder, banned word, or cents range.
