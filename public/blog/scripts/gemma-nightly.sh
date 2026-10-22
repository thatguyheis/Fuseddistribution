#!/usr/bin/env bash
# gemma-nightly.sh — overnight pipeline: research briefs + full article drafts
# Runs at 11 PM via launchd. Outputs 4 post drafts (2 silver + 2 tech) for
# Claude's 9 AM run. Claude skips seo-plan + blog-write — just polish + build.
#
# Output per topic:
#   public/blog/[slug]/gemma_draft.md        — full article draft
#   public/blog/research/YYYY-MM-DD-[slug].md — research brief
#   public/blog/research/YYYY-MM-DD-queue.json — today's 4 posts for Claude to consume

set -euo pipefail
export TZ=America/Los_Angeles

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
RESEARCH_DIR="$BLOG_DIR/research"
TODAY="${GEMMA_RUN_DATE:-${BLOG_RUN_DATE:-$(date '+%Y-%m-%d')}}"
# Queue is consumed by the NEXT 9 AM run. When this script runs at night
# (>= noon), date the queue for tomorrow; morning manual runs date it today.
# Fixes the mismatch where 23:00 runs wrote ${TODAY}-queue.json that the next
# morning's pipeline (which looks for its own date) never found.
if [[ -n "${GEMMA_RUN_DATE:-}${BLOG_RUN_DATE:-}" ]]; then
  QUEUE_DATE="$TODAY"
elif [[ $(date '+%H') -ge 12 ]]; then
  QUEUE_DATE=$(date -v+1d '+%Y-%m-%d')
else
  QUEUE_DATE=$TODAY
fi
# Briefs and failed candidates belong to the same operating date as the queue.
TODAY="$QUEUE_DATE"
INDEX_FILE="$RESEARCH_DIR/topic-index.json"
QUEUE_FILE="$RESEARCH_DIR/${QUEUE_DATE}-queue.json"

mkdir -p "$RESEARCH_DIR"

# An existing queue remains authoritative even when the topic pool is exhausted.
if [[ -f "$QUEUE_FILE" ]]; then
  echo "Queue already exists for today: $QUEUE_FILE"
  exit 0
fi


python3 "$SCRIPT_DIR/../../../scripts/topic-inventory.py" --unblock --date "$QUEUE_DATE"

# An unfinished plan already names the work. A new model pass must not rotate
# to unrelated topics and silently replace that daily obligation.
if [[ -f "$RESEARCH_DIR/${QUEUE_DATE}-plan.json" && "${GEMMA_RECOVER_PLAN:-0}" != "1" ]]; then
  echo "Daily plan exists without a completed queue; editorial owner recovery required" >&2
  exit 1
fi

# ── FD pre-flight ─────────────────────────────────────────────────────────────
# 2026-06-10 23:03 run died on system-wide "Too many open files" (kern.num_files
# hit kern.maxfiles) caused by stale chrome-headless-shell / workerd processes
# left over from crashed renders. Clean them up and verify headroom before work.
ulimit -n 65536 2>/dev/null || true
# Process cleanup requires proven ownership; unrelated browser/worker jobs
# must never be killed by a scheduled content run.
sleep 2
FD_USED=$(sysctl -n kern.num_files)
FD_MAX=$(sysctl -n kern.maxfiles)
if (( FD_USED * 100 / FD_MAX > 80 )); then
  echo "WARN: system file table ${FD_USED}/${FD_MAX} (>80%) even after stale-process cleanup. Top FD consumers:"
  lsof -n 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -5
fi

# ── Topic seed pools ──────────────────────────────────────────────────────────

SILVER_TOPICS=()
while IFS= read -r topic; do SILVER_TOPICS+=("$topic"); done < <(python3 "$SCRIPT_DIR/../../../scripts/topic-inventory.py" --list silver)

TECH_TOPICS=()
while IFS= read -r topic; do TECH_TOPICS+=("$topic"); done < <(python3 "$SCRIPT_DIR/../../../scripts/topic-inventory.py" --list tech)

# ── Read/update rotation index ────────────────────────────────────────────────

if [[ -n "${GEMMA_SILVER_INDEX:-}${GEMMA_TECH_INDEX:-}" ]]; then
  SI="${GEMMA_SILVER_INDEX:-0}"
  TI="${GEMMA_TECH_INDEX:-0}"
elif [[ -f "$INDEX_FILE" ]]; then
  SI=$(python3 -c "import json; d=json.load(open('$INDEX_FILE')); print(d.get('silver',0))")
  TI=$(python3 -c "import json; d=json.load(open('$INDEX_FILE')); print(d.get('tech',0))")
else
  SI=0
  TI=0
fi

SILVER_LEN=${#SILVER_TOPICS[@]}
TECH_LEN=${#TECH_TOPICS[@]}

# ── Helpers ───────────────────────────────────────────────────────────────────

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-55
}

ollama_call() {
  # Use the repository-owned Ollama adapter so scheduled work and recovery share
  # one local runtime with a bounded model response timeout.
  local prompt="$1"
  local max_tokens="${2:-1400}"
  HERMES_LOCAL_MODEL="${GEMMA_RESEARCH_MODEL:-gemma3:4b}" \
    HERMES_LOCAL_MAX_TOKENS="$max_tokens" \
    HERMES_LOCAL_TIMEOUT="${GEMMA_RESEARCH_TIMEOUT:-600}" \
    "$SCRIPT_DIR/../../../scripts/ollama-local-no-think.sh" "$prompt"
}

ensure_local_model_service() {
  local endpoint="${OLLAMA_LOCAL_BASE_URL:-http://127.0.0.1:11434}"
  if ! curl -fsS --max-time 5 "$endpoint/api/tags" >/dev/null 2>&1; then
    launchctl kickstart -k "gui/$(id -u)/homebrew.mxcl.ollama"
    for _ in {1..24}; do
      curl -fsS --max-time 2 "$endpoint/api/tags" >/dev/null 2>&1 && break
      sleep 5
    done
  fi
  curl -fsS --max-time 5 "$endpoint/api/tags" >/dev/null 2>&1 || {
    echo "ERROR: local Ollama API did not become ready" >&2
    return 1
  }
  HERMES_LOCAL_MODEL="${GEMMA_RESEARCH_MODEL:-gemma3:4b}" \
    HERMES_LOCAL_MAX_TOKENS=8 HERMES_LOCAL_TIMEOUT=180 \
    "$SCRIPT_DIR/../../../scripts/ollama-local-no-think.sh" "Reply with exactly READY."
}

word_count() {
  printf '%s' "$1" | awk '{ count += NF } END { print count + 0 }'
}

require_model_output() {
  local kind="$1"
  local value="$2"
  local minimum="$3"
  local count
  count=$(word_count "$value")
  if (( count < minimum )); then
    echo "ERROR: Gemma $kind output too short (${count} words; minimum ${minimum})" >&2
    return 1
  fi
}

# ── Process one topic ─────────────────────────────────────────────────────────

process_topic() {
  local KEYWORD="$1"
  local BRAND="$2"   # silver | tech

  local SLUG
  SLUG=$(slugify "$KEYWORD")
  local POST_DIR="$BLOG_DIR/$SLUG"
  local BRIEF_FILE="$RESEARCH_DIR/${TODAY}-${SLUG}.md"
  local DRAFT_FILE="$POST_DIR/gemma_draft.md"

  mkdir -p "$POST_DIR" "$RESEARCH_DIR/failed-candidates/$TODAY"

  echo "  Topic: $KEYWORD ($BRAND)"

  # A date in model output is not validation. Preserve existing drafts for the
  # editorial owner rather than implicitly promoting them into a publish queue.
  if [[ -f "$DRAFT_FILE" ]]; then
    echo "    DEFERRED: existing draft requires owner review: $DRAFT_FILE" >&2
    return 1
  fi

  # Brand context — read from MASTER_CONTEXT file
  local MC_FILE
  if [[ "$BRAND" == "silver" ]]; then
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-silver.md"
  else
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-tech.md"
  fi

  local BRAND_CTX
  if [[ "$BRAND" == "silver" ]]; then
    BRAND_CTX="Fused Distribution. Explain the exact silver or collecting topic to a curious general reader. No investment predictions."
  else
    BRAND_CTX="Fused Distribution. Explain the exact requested business task to a small business owner. Do not redirect to SEO, Google Business Profile or sales unless the keyword explicitly requests it."
  fi

  # ── Fetch live spot price for silver posts ──
  local SPOT_LINE=""
  if [[ "$BRAND" == "silver" ]]; then
    local SPOT_JSON
    SPOT_JSON=$(curl -s --max-time 10 "https://fuseddistribution.com/api/spot" 2>/dev/null)
    if [[ -n "$SPOT_JSON" ]]; then
      local SILVER_SPOT GOLD_SPOT
      SILVER_SPOT=$(echo "$SPOT_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d['silver']:.2f}\")" 2>/dev/null)
      GOLD_SPOT=$(echo "$SPOT_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d['gold']:.2f}\")" 2>/dev/null)
      if [[ -n "$SILVER_SPOT" ]]; then
        SPOT_LINE="LIVE SPOT PRICES (fetched $TODAY): Silver = \$$SILVER_SPOT/oz | Gold = \$$GOLD_SPOT/oz
Use these EXACT values for all hypothetical price examples (not round numbers).
Always cite the date: e.g. 'at \$$SILVER_SPOT/oz as of $TODAY'."
        echo "    Spot: silver=\$$SILVER_SPOT gold=\$$GOLD_SPOT"
      fi
    fi
  fi

  local SOURCE_SEEDS
  SOURCE_SEEDS=$(python3 - "$SCRIPT_DIR/../data/topic-pool.json" "$KEYWORD" <<'PYSOURCES'
import json,sys
for topic in json.load(open(sys.argv[1]))['topics']:
 if topic['keyword']==sys.argv[2]:
  print(' '.join(topic.get('sourceUrls',[])))
  if topic.get('strategy'):
   print('\nEditorial direction, not verified evidence: '+json.dumps({k:topic[k] for k in ['strategy','evidencePaths','usageCaveat','sourceScope','sop'] if k in topic},ensure_ascii=False))
  break
PYSOURCES
)
  # ── Step 1: Research brief ──
  echo "    [1/2] Research brief..."
  local BRIEF_PROMPT="You are a content strategist for $BRAND_CTX

${SPOT_LINE:+$SPOT_LINE

}Target keyword: \"$KEYWORD\"

Primary research starting points: $SOURCE_SEEDS
These links are not fetched evidence. Mark unsupported factual claims [VERIFY]; do not invent quotations or claim to have read a source.

Write a structured content brief for the exact keyword/title candidate below. Do not drift to an adjacent topic.

## Search Intent
One sentence: what does someone searching this exact keyword actually want?

## Best Angle
One sentence: what angle makes this post stand out from generic results?

## Competitor Gap
Two sentences: what do most articles on this topic miss?

## Topic Contract
One sentence confirming the slug, SEO title, search intent, H2 plan, and body all answer the same reader problem. Name 3-6 required topic terms and 2-4 forbidden drift topics.

## Key Points (5 bullets)
Specific, factual, non-obvious points that directly satisfy the keyword. Mark uncertain stats [VERIFY].

## H2 Structure
4-5 H2 headings in logical order. At least half must include the keyword's core terms or close synonyms.

## SEO Title
One title, 55 chars max, includes the keyword's core terms and matches the search intent. Do not substitute a different topic.

## Internal Links
2 slugs from: dollar-cost-averaging-silver, silver-coins-rounds-bars, silver-etf-vs-physical, silver-inflation-hedge, silver-portfolio-allocation, silver-premiums-explained, silver-storage-guide, silver-supply-deficit, silver-to-gold-ratio, what-is-junk-silver, where-to-buy-silver, getting-google-reviews, google-business-profile-setup, local-seo-near-me, what-a-website-does-for-your-business, word-of-mouth-referrals

Output sections only. No preamble."

  local BRIEF
  BRIEF=$(ollama_call "$BRIEF_PROMPT" 700)
  require_model_output "research brief for $SLUG" "$BRIEF" 100 || return 1
  if ! grep -qi 'Search Intent' <<<"$BRIEF" || ! grep -qi 'H2 Structure' <<<"$BRIEF"; then
    echo "ERROR: Gemma research brief for $SLUG is missing required sections" >&2
    return 1
  fi

  cat > "$BRIEF_FILE" <<EOF
# Research Brief — $KEYWORD
**Date:** $TODAY | **Brand:** $BRAND | **Slug:** $SLUG
**Model:** ${GEMMA_RESEARCH_MODEL:-gemma3:4b} (local Ollama)

---

$BRIEF

---
EOF
  echo "    Brief saved."

  # ── Step 2: Full article draft (CHUNKED) ──
  # Generate section-by-section instead of one big call. Each gemma call stays
  # well under the model's 4096-token context: intro, then one call per H2,
  # then a templated CTA. Smaller focused prompts = better quality + no truncation.
  echo "    [2/2] Article draft (chunked)..."

  # Shared style rules — kept short to save context budget.
  local STYLE="Rules: plain direct tone, second person (you/your), short sentences, use contractions.
No em dashes or en dashes (use a comma or two sentences).
No buzzwords: leverage, utilize, streamline, facilitate, foster, harness, empower, elevate, revolutionize, embark, robust, seamlessly, cutting-edge, holistic, paradigm, ecosystem, synergy, cornerstone, testament, landscape, realm, beacon, catalyst, transformative, groundbreaking.
No hedging: 'it is important to note', 'it is worth mentioning', 'needless to say'.
No filler transitions: moreover, furthermore, additionally, consequently, notably, thus, indeed.
No filler openers: 'In today's landscape', 'When it comes to', 'In an era of', 'In recent years'.
No banned phrases: dive in, delve into, bridge the gap, a testament to, in this article, master the art of.
Omit uncertain statistics and unsupported claims. Do not invent sources or use placeholders. Output prose only, no headings, no preamble, no meta-commentary."

  # Brand CTA URL
  local CTA_URL
  if [[ "$BRAND" == "silver" ]]; then CTA_URL="https://fuseddistribution.com/reserve/"; else CTA_URL="https://fuseddistribution.com/#contact"; fi

  # 2a. Extract H2 headings (one per line) from the brief.
  local HEADINGS_RAW
  HEADINGS_RAW=$(ollama_call "From the research brief below, list ONLY 6 distinct H2 section headings, one per line. No numbers, no markdown symbols (#, -, *), no extra text.

Exact keyword: $KEYWORD
Every heading must answer a distinct part of this exact topic. Do not add unrelated marketing advice.
Brief:
$BRIEF" 200)

  local HEADINGS=()
  while IFS= read -r h; do
    h=$(echo "$h" | sed -E 's/^[[:space:]]*[#>*-]+[[:space:]]*//; s/^[[:space:]]*[0-9]+[.)][[:space:]]*//; s/^[[:space:]]+//; s/[[:space:]]+$//')
    [[ -n "$h" && ${#h} -le 80 ]] && HEADINGS+=("$h")
  done <<< "$HEADINGS_RAW"
  # Fallback if parsing yielded nothing
  if (( ${#HEADINGS[@]} == 0 )); then
    HEADINGS=("Overview" "What to Know" "How to Get Started" "Costs and Tradeoffs" "Common Mistakes" "Next Steps")
  fi
  # Cap at 6 sections
  HEADINGS=("${HEADINGS[@]:0:6}")
  echo "      sections: ${#HEADINGS[@]} — ${HEADINGS[*]}"

  # Reject an off-topic outline before spending inference on body sections.
  printf '%s\n' "${HEADINGS[@]}" | python3 "$SCRIPT_DIR/../../../scripts/validate-research-outline.py" "$KEYWORD" || return 1

  # 2b. Intro (answer-first).
  local INTRO
  INTRO=$(ollama_call "Write the opening paragraph (3-4 sentences) of a blog post for $BRAND_CTX
Keyword: \"$KEYWORD\". Answer the keyword question directly in the first sentence (answer-first). No heading.
${SPOT_LINE:+$SPOT_LINE}
$STYLE" 260)

  # Preserve the coherent partial article even if a later section is rejected.
  local PARTIAL_FILE="$RESEARCH_DIR/failed-candidates/$TODAY/${SLUG}-partial-$$.md"
  printf '# %s\n\n%s\n' "$KEYWORD" "$INTRO" > "$PARTIAL_FILE"

  # 2c. One section per heading.
  local SECTIONS=""
  local KEYPOINTS
  KEYPOINTS=$(echo "$BRIEF" | sed -n '/Key Points/,/H2 Structure/p' | head -20)
  local H
  for H in "${HEADINGS[@]}"; do
    echo "      section: $H"
    local SEC
    SEC=$(ollama_call "Blog post for $BRAND_CTX. Keyword: \"$KEYWORD\".
Write 200-240 words for the section titled \"$H\" in 3-4 specific paragraphs. Do not repeat the heading. Stay specific to this section.
Relevant points:
$KEYPOINTS
$STYLE" 520)
    # The model sometimes echoes the exact title despite the prose-only prompt.
    # Remove only that opening duplicate; unexpected headings still fail QA.
    SEC=$(printf '%s\n' "$SEC" | python3 "$SCRIPT_DIR/normalize-section.py" "$H")
    printf '%s\n' "$SEC" > "$RESEARCH_DIR/failed-candidates/$TODAY/${SLUG}-section-$(slugify "$H")-$$.md"
    if ! require_model_output "section $H" "$SEC" 180 || grep -Eq '^[[:space:]]*#{1,6}[[:space:]]' <<<"$SEC"; then
      # Retry only the deficient section, once. Never pad or relax final QA.
      SEC=$(ollama_call "Revise this section for $BRAND_CTX about \"$KEYWORD\".
Section: $H
Write 220-260 words of specific, useful explanation in 3-4 paragraphs.
Use only supported points below; omit uncertain claims. No invented numbers.
Relevant points:
$KEYPOINTS
Current section:
$SEC
$STYLE" 650)
      SEC=$(printf '%s\n' "$SEC" | python3 "$SCRIPT_DIR/normalize-section.py" "$H")
      printf '%s\n' "$SEC" > "$RESEARCH_DIR/failed-candidates/$TODAY/${SLUG}-section-$(slugify "$H")-$$-revised.md"
      require_model_output "revised section $H" "$SEC" 180 || return 1
      if grep -Eq '^[[:space:]]*#{1,6}[[:space:]]' <<<"$SEC"; then
        echo "ERROR: revised section still contains unexpected headings" >&2
        return 1
      fi
    fi
    SECTIONS+="## $H

$SEC

"
    printf '\n## %s\n\n%s\n' "$H" "$SEC" >> "$PARTIAL_FILE"
  done

  # 2d. CTA (templated — reliable URL).
  local CTA
  CTA=$(ollama_call "Write a 2-sentence call to action for $BRAND_CTX ending by pointing readers to $CTA_URL. Keyword context: \"$KEYWORD\".
$STYLE" 120)

  # Assemble
  local DRAFT="$INTRO

$SECTIONS$CTA"

  # Preserve every candidate before validation so the owner can repair a failed
  # run without repeating model work. This file is never a publication approval.
  local CANDIDATE_DIR="$RESEARCH_DIR/failed-candidates/$TODAY"
  mkdir -p "$CANDIDATE_DIR"
  printf '%s\n' "$DRAFT" > "$CANDIDATE_DIR/${SLUG}-$(date '+%H%M%S')-$$.md"
  require_model_output "article draft for $SLUG" "$DRAFT" 1100 || return 1
  local heading_count
  heading_count=$(grep -c '^## ' <<<"$SECTIONS" || true)
  if (( heading_count < 5 || heading_count > 6 )); then
    echo "ERROR: Gemma article draft for $SLUG has ${heading_count} sections; expected 5-6" >&2
    return 1
  fi
  if grep -Eq '\[VERIFY\]|\[SLOT\]|TODO|lorem ipsum' <<<"$DRAFT"; then
    echo "ERROR: Gemma article draft for $SLUG contains an unresolved placeholder" >&2
    return 1
  fi

  cat > "$DRAFT_FILE" <<EOF
<!-- gemma_draft: $TODAY | keyword: $KEYWORD | brand: $BRAND -->
# GEMMA DRAFT — $KEYWORD
> Generated: $TODAY | Model: ${GEMMA_RESEARCH_MODEL:-gemma3:4b} (local Ollama) | Status: NEEDS POLISH
> Editorial owner: verify sources and topic coherence before publication. Draft status is not approval.

---

$DRAFT
EOF

  echo "    Draft saved: $DRAFT_FILE"
  echo "$SLUG|$KEYWORD|$BRAND"
}

# Select unpublished topics, including after a partial failure leaves the index
# unchanged. Never overwrite an existing article just to meet a daily count.
select_unpublished() {
  local brand="$1" start="$2"
  python3 "$SCRIPT_DIR/../../../scripts/topic-inventory.py" --select "$brand" --start "$start" --date "$QUEUE_DATE"
}
if [[ "${GEMMA_RECOVER_PLAN:-0}" != "1" ]]; then
read -r S1_IDX S2_IDX <<<"$(select_unpublished silver "$SI")"
read -r T1_IDX T2_IDX <<<"$(select_unpublished tech "$TI")"
[[ -n "$S2_IDX" && -n "$T2_IDX" ]] || exit 1
TOPIC_S1="${SILVER_TOPICS[$S1_IDX]}"
TOPIC_S2="${SILVER_TOPICS[$S2_IDX]}"
TOPIC_T1="${TECH_TOPICS[$T1_IDX]}"
TOPIC_T2="${TECH_TOPICS[$T2_IDX]}"
else
  S1_IDX="$SI"; S2_IDX="$SI"; T1_IDX="$TI"; T2_IDX="$TI"
fi

# Explicit owner recovery reuses the saved obligation; never rotate topics.
if [[ "${GEMMA_RECOVER_PLAN:-0}" == "1" ]]; then
  RECOVERY_TOPICS=()
  while IFS= read -r topic; do RECOVERY_TOPICS+=("$topic"); done < <(python3 - "$RESEARCH_DIR/${QUEUE_DATE}-plan.json" <<'PYPLAN'
import json,sys
plan=json.load(open(sys.argv[1]))
assert [p['brand'] for p in plan['posts']] == ['silver','silver','tech','tech']
for post in plan['posts']: print(post['keyword'])
PYPLAN
)
  [[ "${#RECOVERY_TOPICS[@]}" == 4 ]] || exit 1
  TOPIC_S1="${RECOVERY_TOPICS[0]}"; TOPIC_S2="${RECOVERY_TOPICS[1]}"
  TOPIC_T1="${RECOVERY_TOPICS[2]}"; TOPIC_T2="${RECOVERY_TOPICS[3]}"
  # Attempt logging may preserve the rotation, but cannot advance it again.
  S2_IDX=$((SI - 1)); T2_IDX=$((TI - 1))
fi

# ── Main ──────────────────────────────────────────────────────────────────────

echo "=== Gemma Nightly — $TODAY ==="
echo "Silver: [$S1_IDX] $TOPIC_S1 / [$S2_IDX] $TOPIC_S2"
echo "Tech:   [$T1_IDX] $TOPIC_T1 / [$T2_IDX] $TOPIC_T2"
echo ""

# Record intended output before inference. This is a recovery manifest, never
# a publishable queue or approval; preserve it across retries of the same date.
python3 "$SCRIPT_DIR/daily-research-plan.py" "$RESEARCH_DIR" "$QUEUE_DATE" \
  "$TOPIC_S1" "$TOPIC_S2" "$TOPIC_T1" "$TOPIC_T2"

ensure_local_model_service

QUEUE_ENTRIES=()
FAILED_TOPICS=()

run_topic() {
  local keyword="$1"
  local brand="$2"
  local result

  # A malformed model response is a topic failure, not a batch failure. Keep
  # processing the remaining topics so one bad inference cannot starve the
  # whole next-day queue.
  if result=$(process_topic "$keyword" "$brand"); then
    QUEUE_ENTRIES+=("$result")
  else
    FAILED_TOPICS+=("$keyword")
    echo "  DEFERRED: $keyword ($brand)"
  fi
}

echo "[Silver 1/2]"
run_topic "$TOPIC_S1" "silver"
sleep 3

echo "[Silver 2/2]"
run_topic "$TOPIC_S2" "silver"
sleep 3

echo "[Tech 1/2]"
run_topic "$TOPIC_T1" "tech"
sleep 3

echo "[Tech 2/2]"
run_topic "$TOPIC_T2" "tech"

# Preserve failed topics independently of rotation. Otherwise one permanently
# malformed draft monopolizes both brands every night and starves later topics.
python3 - "$RESEARCH_DIR" "$QUEUE_DATE" "$INDEX_FILE" "$((S2_IDX + 1))" "$((T2_IDX + 1))" "${FAILED_TOPICS[@]}" <<'PYATTEMPT'
import datetime, json, pathlib, sys
directory, day, index_path, silver, tech, *failed = sys.argv[1:]
record = {'date': day, 'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'failedTopics': failed, 'status': 'owner_repair_required' if failed else 'drafts_completed',
          'nextIndex': {'silver': int(silver), 'tech': int(tech)}}
folder = pathlib.Path(directory) / 'attempts'
folder.mkdir(exist_ok=True)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%f')
(folder / (day + '-' + stamp + '.json')).write_text(json.dumps(record, indent=2) + '\n')
pathlib.Path(index_path).write_text(json.dumps(record['nextIndex']) + '\n')
PYATTEMPT

if (( ${#QUEUE_ENTRIES[@]} == 0 )); then
  echo "ERROR: no valid topics completed; queue not written" >&2
  exit 1
fi

# Write queue JSON for Claude's 9 AM run
python3 -c "
import json
entries = []
for line in '''$(printf '%s\n' "${QUEUE_ENTRIES[@]}")'''.strip().split('\n'):
    parts = line.split('|')
    if len(parts) == 3:
        slug, keyword, brand = parts
        keyword_lower = keyword.lower()

        # Determine ad_formats based on keyword content
        if any(w in keyword_lower for w in ['compare', 'vs', 'difference', 'best', 'dealer', 'buy']):
            ad_formats = ['google-search', 'stat-card']
        elif any(w in keyword_lower for w in ['how to', 'guide', 'step', 'setup', 'start']):
            ad_formats = ['apple-notes', 'stat-card']
        elif any(w in keyword_lower for w in ['what is', 'explained', 'history', 'why']):
            ad_formats = ['quote-card', 'stat-card']
        else:
            ad_formats = ['stat-card', 'google-search']

        # Determine ugc_angle based on keyword content
        if any(w in keyword_lower for w in ['compare', 'vs', 'best', 'dealer', 'alternative']):
            ugc_angle = 'comparison'
        elif any(w in keyword_lower for w in ['how to', 'step by step', 'setup', 'guide for beginners']):
            ugc_angle = 'demo'
        elif any(w in keyword_lower for w in ['why', 'what is', 'explained', 'history']):
            ugc_angle = 'testimonial'
        elif brand == 'tech' and any(w in keyword_lower for w in ['google', 'website', 'profile']):
            ugc_angle = 'founder'
        else:
            ugc_angle = 'testimonial' if brand == 'silver' else 'founder'

        entries.append({
            'slug': slug,
            'keyword': keyword,
            'brand': brand,
            'draft': f'public/blog/{slug}/gemma_draft.md',
            'ad_formats': ad_formats,
            'ugc_angle': ugc_angle
        })

queue = {'date': '$QUEUE_DATE', 'posts': entries}
with open('$QUEUE_FILE', 'w') as f:
    json.dump(queue, f, indent=2)
print(f'Queue written: {len(entries)} posts')
"

echo "Rotation advanced; failed topics remain in dated research/attempts records for owner repair."

if (( ${#FAILED_TOPICS[@]} > 0 )); then
  echo "WARNING: ${#FAILED_TOPICS[@]} topic(s) deferred to recorded owner recovery."
  printf '  - %s\n' "${FAILED_TOPICS[@]}"
fi

echo ""
echo "=== Done: $(date '+%H:%M:%S') ==="
echo "Queue: $QUEUE_FILE"
echo "The daily publisher picks this up at 9 AM."
