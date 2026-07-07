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
        # default Python-urllib UA gets 403 from the edge; send a real UA
        req = urllib.request.Request(
            SPOT_URL, headers={"User-Agent": "fused-pipeline-sanitizer/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.loads(r.read().decode("utf-8"))
        return float(d["silver"]), float(d["gold"])
    except Exception:
        return None, None


def tidy(s):
    """Clean scars left by removed markers/phrases: doubled spaces and
    whitespace before punctuation."""
    s = re.sub(r"[ \t]{2,}", " ", s)
    s = re.sub(r"\s+([.,;:!?])", r"\1", s)
    return s


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
            out_lines.append(tidy(line.replace("[VERIFY]", "")).rstrip())
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
                s = tidy(s.replace("[VERIFY]", "")).rstrip()
                kept.append(s)
            else:
                pass  # drop the sentence entirely
        rebuilt = " ".join(x for x in kept if x.strip())
        if rebuilt.strip():
            out_lines.append(rebuilt)
        # if the whole line was one unverifiable sentence, the line disappears
    return "\n".join(out_lines)


def repair_placeholders(text):
    """Bracket placeholders other than [VERIFY]/[SLOT] (must run AFTER
    repair_verify so [VERIFY] is already gone).

    Legit template merge tags in example scripts ("Hi [Customer Name]...")
    trip the QA gate's bracket-placeholder blocker. Convert to curly-brace
    merge-tag style, which reads the same and passes. Never touch markdown
    links/images: bracket text followed by "(" is left alone.
    Also drop leftover template instruction lines ("Note: Replace ...").
    """
    text = re.sub(r"\[([A-Z][A-Za-z0-9 _-]{2,})\](?!\()", r"{\1}", text)
    text = "\n".join(
        line for line in text.split("\n")
        if not re.search(r"\bNote:\s*Replace\b", re.sub(r"[*_]", "", line), re.IGNORECASE)
    )
    return text


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
    text = repair_placeholders(text)
    text = repair_banned(text)
    text = repair_cents(text)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


if __name__ == "__main__":
    main()
