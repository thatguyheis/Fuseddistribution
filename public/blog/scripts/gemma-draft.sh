#!/usr/bin/env bash
# gemma-draft.sh — generate a free first-draft via local Gemma 4 E2B
# Usage: ./gemma-draft.sh "target keyword" "silver|tech" [slug]
# Output: public/blog/[slug]/gemma_draft.md
#
# Produces a low-cost structural draft for deterministic gates and Codex review.
# Review the draft, then pass it as context to blog-write for final polish.

set -euo pipefail

KEYWORD="${1:-}"
BRAND="${2:-silver}"   # silver | tech
SLUG="${3:-}"

if [[ -z "$KEYWORD" ]]; then
  echo "Usage: $0 \"target keyword\" [silver|tech] [slug]"
  exit 1
fi

# Derive slug from keyword if not provided
if [[ -z "$SLUG" ]]; then
  SLUG=$(echo "$KEYWORD" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
fi

OUTDIR="$(dirname "$0")/../$SLUG"
OUTFILE="$OUTDIR/gemma_draft.md"

mkdir -p "$OUTDIR"

# Brand-specific CTA context
if [[ "$BRAND" == "silver" ]]; then
  BRAND_CONTEXT="Fused Distribution — silver/precious metals reserve plans. CTA points to /reserve/. Audience: retail investors interested in physical silver."
else
  BRAND_CONTEXT="Fused Distribution Technology Solutions — local business websites and digital marketing. CTA points to /#contact. Audience: small business owners."
fi

PROMPT="You are writing a first-draft blog post for $BRAND_CONTEXT

Target keyword: $KEYWORD

Write a 600-800 word first draft. Requirements:
- Lead with the key point (answer-first)
- Use H2 subheadings (## format)
- Include 3-5 specific facts or statistics (mark as [STAT - verify] if unsure)
- Plain, direct tone. No fluff. No em dashes.
- End with a clear call to action
- Output markdown only, no preamble

Begin the draft now."

echo "Generating draft for: $KEYWORD"
echo "Brand: $BRAND | Slug: $SLUG"
echo "Output: $OUTFILE"
echo "---"

# Call Ollama API
RESPONSE=$(curl -s http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"gemma4:e2b\",
    \"prompt\": $(echo "$PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"stream\": false,
    \"options\": {
      \"temperature\": 0.7,
      \"num_predict\": 1200
    }
  }")

DRAFT=$(echo "$RESPONSE" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["response"])')

# Write output
cat > "$OUTFILE" <<EOF
# Gemma Draft — $KEYWORD
**Brand:** $BRAND | **Slug:** $SLUG
**Generated:** $(date '+%Y-%m-%d %H:%M')
**Model:** gemma4:e2b (local, \$0)

> Review this draft. Verify all [STAT - verify] markers.
> Pass to blog-write skill as: "Use this draft as a starting point: [paste]"

---

$DRAFT
EOF

echo ""
echo "Draft saved: $OUTFILE"
echo "Word count: $(echo "$DRAFT" | wc -w | tr -d ' ') words"
echo ""
echo "Next: run the deterministic build gates, then have Codex review any blocked output."
