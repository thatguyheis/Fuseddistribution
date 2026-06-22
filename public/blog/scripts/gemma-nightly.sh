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

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
RESEARCH_DIR="$BLOG_DIR/research"
TODAY=$(date '+%Y-%m-%d')
# Queue is consumed by the NEXT 9 AM run. When this script runs at night
# (>= noon), date the queue for tomorrow; morning manual runs date it today.
# Fixes the mismatch where 23:00 runs wrote ${TODAY}-queue.json that the next
# morning's pipeline (which looks for its own date) never found.
if [[ $(date '+%H') -ge 12 ]]; then
  QUEUE_DATE=$(date -v+1d '+%Y-%m-%d')
else
  QUEUE_DATE=$TODAY
fi
INDEX_FILE="$RESEARCH_DIR/topic-index.json"
QUEUE_FILE="$RESEARCH_DIR/${QUEUE_DATE}-queue.json"

mkdir -p "$RESEARCH_DIR"

# ── FD pre-flight ─────────────────────────────────────────────────────────────
# 2026-06-10 23:03 run died on system-wide "Too many open files" (kern.num_files
# hit kern.maxfiles) caused by stale chrome-headless-shell / workerd processes
# left over from crashed renders. Clean them up and verify headroom before work.
ulimit -n 65536 2>/dev/null || true
pkill -f "chrome-headless-shell" 2>/dev/null || true
pkill -x workerd 2>/dev/null || true
sleep 2
FD_USED=$(sysctl -n kern.num_files)
FD_MAX=$(sysctl -n kern.maxfiles)
if (( FD_USED * 100 / FD_MAX > 80 )); then
  echo "WARN: system file table ${FD_USED}/${FD_MAX} (>80%) even after stale-process cleanup. Top FD consumers:"
  lsof -n 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -5
fi

# ── Topic seed pools ──────────────────────────────────────────────────────────

SILVER_TOPICS=(
  # Buying guides
  "how to buy silver for the first time"
  "where to buy silver online safely"
  "best online silver dealers in 2026"
  "how to buy silver coins at spot price"
  "buying silver from a local coin shop vs online"
  "how to avoid silver dealer scams"
  "how to read silver spot price charts"
  "silver premiums explained for beginners"
  "how to compare silver premiums across dealers"
  "should you buy silver in dips or dollar cost average"
  # Product types
  "american silver eagle complete buying guide"
  "canadian silver maple leaf vs american silver eagle"
  "silver bars vs silver coins which is better"
  "silver rounds vs silver coins differences"
  "1 oz silver coins vs 10 oz silver bars which to buy"
  "100 oz silver bars pros and cons"
  "junk silver coins guide pre-1965 US silver"
  "what is 90 percent silver junk silver worth buying"
  "morgan silver dollars as investment"
  "proof silver coins worth buying or not"
  "silver numismatic coins vs bullion coins"
  "canadian silver maple leaf investment guide"
  "austrian silver philharmonic guide"
  "britannias vs eagles which silver coin is best"
  "silver rounds complete buyer guide"
  # Investing and strategy
  "how much silver should you own in your portfolio"
  "silver as a percentage of net worth how much"
  "dollar cost averaging silver strategy explained"
  "silver investment for beginners complete guide"
  "how to build a silver stacking portfolio from scratch"
  "silver IRA what it is and how to open one"
  "self-directed IRA for silver step by step"
  "silver vs gold which is better investment in 2026"
  "physical silver vs silver ETF pros and cons"
  "silver ETF vs physical silver tax differences"
  "is silver a good hedge against inflation"
  "silver as emergency money why it works"
  "silver portfolio allocation beginner vs advanced"
  "how to use silver to protect against currency devaluation"
  "silver alongside stocks and bonds diversification guide"
  # Market and price
  "what moves silver price up and down"
  "silver spot price explained what it means"
  "silver to gold ratio explained how to use it"
  "how to track silver price daily"
  "silver price history and long term trends"
  "silver supply deficit explained 2026"
  "why silver has industrial demand driving price"
  "solar panel silver demand impact on price"
  "electric vehicle silver demand explained"
  "silver market outlook 2026 what analysts say"
  # Storage and safety
  "how to store silver at home safely"
  "best silver storage options for investors"
  "home safe vs safety deposit box for silver"
  "silver storage vault vs home storage"
  "how to organize and inventory your silver collection"
  "silver tarnish why it happens and how to prevent it"
  "does tarnished silver lose value"
  "best ways to clean silver coins without damage"
  "silver coin holders and cases guide"
  "insuring physical silver at home"
  # Selling
  "how to sell silver for the best price"
  "best places to sell silver coins in 2026"
  "selling silver to a dealer vs private sale"
  "how to get the most money when selling silver"
  "capital gains tax on silver how it works"
  "silver IRS reporting requirements what you need to know"
  "selling junk silver coins where and how"
  # History and fundamentals
  "silver as money throughout history"
  "silver standard vs gold standard explained"
  "why silver was used as currency for 5000 years"
  "how inflation erodes purchasing power and silver protects it"
  "silver and the Bretton Woods collapse explained"
  "the Hunt Brothers silver squeeze of 1980"
  "silver price all-time highs what drove them"
  "silver in ancient civilizations as currency"
  "silver monetary history complete guide"
  # Authenticity and grading
  "how to spot fake silver coins and bars"
  "silver counterfeit detection guide"
  "magnet test for silver does it work"
  "ice test for silver explained"
  "how to verify silver purity at home"
  "PCGS NGC certified silver coins guide"
  "graded silver coins worth paying premium or not"
  # Beginner basics
  "silver purity marks what .999 .9999 means"
  "troy ounce vs regular ounce silver explained"
  "what is silver spot price and how is it set"
  "silver premium over spot explained"
  "how to start buying silver with 100 dollars"
  "silver stacking for beginners first steps"
  "silver vs cash which holds value better"
  # Industrial demand
  "silver industrial uses explained for investors"
  "silver in solar panels how much is used"
  "silver supply shortage what it means for prices"
  "silver mining stocks vs physical silver"
  "silver supply deficit sixth consecutive year 2026"
  "largest silver producing countries in the world"
  "silver recycling and scrap recovery market"
  # Reserve funnel
  "silver reserve plan what it is and how it works"
  "building a silver reserve on a monthly budget"
  "silver reserve vs 401k which makes more sense"
  # News and outlook
  "silver price prediction 2026 what analysts expect"
  "why silver price dropped this month explained"
  "silver vs gold performance comparison 2025 2026"
  "COMEX silver inventory what declining stockpiles mean for price"
  "solar panel demand silver price impact 2026"
  "silver price all-time high when will it happen again"
  "is now a good time to buy silver 2026"
  "silver price chart analysis support and resistance levels"
  # Tax and legal
  "silver capital gains tax how it works in the US"
  "do you have to report silver coin purchases to IRS"
  "IRS rules for selling silver coins 1099-B reporting"
  "state sales tax on silver coins which states charge it"
  "how to keep records of silver purchases for taxes"
  "silver coins gift tax rules what you need to know"
  "silver in an LLC vs personal ownership tax differences"
  # Retirement
  "silver IRA how to set one up step by step"
  "can you put physical silver in an IRA"
  "self-directed IRA approved silver coins and bars list"
  "silver IRA vs physical silver at home which is better"
  "best silver IRA custodians compared 2026"
  "rolling over 401k into silver IRA what to know"
  # COMEX and paper silver
  "what is COMEX silver and how does it affect spot price"
  "paper silver vs physical silver the key difference"
  "silver short squeeze 2026 is it possible"
  "how silver futures work explained for stackers"
  "COMEX silver delivery process explained"
  "why COMEX price and physical silver price diverge"
  # Dealer reviews
  "APMEX review 2026 premiums selection and service"
  "JM Bullion vs SD Bullion which dealer is better"
  "Gainesville Coins review 2026"
  "Provident Metals review is it legit"
  "APMEX vs JM Bullion premium comparison 2026"
  "best silver dealers in the US ranked"
  # Tools and tracking
  "best apps to track your silver portfolio value"
  "how to set silver spot price alerts for free"
  "silver premium calculator how to build one"
  "how to build a silver inventory spreadsheet"
  "CoinStats vs Delta for precious metals tracking"
  "how to calculate your average cost per ounce silver"
  # Estate and inheritance
  "what to do when you inherit silver coins and bars"
  "how to value inherited silver for estate purposes"
  "selling inherited silver coins taxes and process"
  "how to divide silver in an estate fairly"
  "inherited junk silver what to do with it"
  # Mining and stocks
  "silver mining stocks vs physical silver which is better"
  "best silver mining stocks to watch in 2026"
  "First Majestic Silver vs physical silver investment"
  "silver royalty companies explained Wheaton Precious Metals"
  "how silver mine production affects spot price"
  # Coin guides - specific
  "Morgan silver dollar complete buying guide"
  "Peace silver dollar value and history"
  "Perth Mint silver Kangaroo buying guide"
  "Mexican silver Libertad coins guide"
  "silver panda coins from China complete guide"
  "Engelhard silver bars history and collector value"
  "Johnson Matthee silver bars guide"
)

TECH_TOPICS=(
  # Google Business Profile
  "how to set up google business profile step by step"
  "google business profile optimization guide 2026"
  "why your google business profile isnt showing up"
  "how to rank higher on google maps"
  "google business profile categories which to choose"
  "how to add photos to google business profile correctly"
  "google business profile posts what to write"
  "google business profile Q and A how to use it"
  "google business profile messaging setup and tips"
  "google business profile insights explained"
  # Local SEO
  "local SEO for small business beginner guide"
  "what is NAP consistency and why it matters"
  "local citations for small business how to build them"
  "local SEO ranking factors 2026"
  "near me searches how to rank for them"
  "local keyword research for small businesses"
  "local backlinks how to get them for free"
  "neighborhood SEO targeting specific areas"
  "local SEO audit how to do one yourself"
  "service area business SEO guide"
  # Reviews and reputation
  "how to get more google reviews for your business"
  "how to ask customers for google reviews"
  "how to respond to negative google reviews"
  "google review strategy that actually works"
  "does responding to reviews improve local SEO"
  "how many google reviews do you need to rank"
  "fake google reviews how to handle them"
  "review generation tools for small business"
  "yelp vs google reviews which matters more"
  "how to turn bad reviews into better outcomes"
  # Website
  "what a small business website needs to succeed"
  "how much does a small business website cost"
  "small business website mistakes to avoid"
  "why your website isnt getting customers"
  "what pages every small business website needs"
  "mobile website speed why it matters for local business"
  "website conversion rate what it means and how to improve it"
  "call to action best practices for small business websites"
  "contact page best practices for local business"
  "landing page vs website which do you need"
  # Social media
  "instagram for local business complete guide"
  "facebook page vs facebook group for business"
  "how often to post on social media for small business"
  "tiktok for local business does it work"
  "social media content ideas for small business"
  "instagram stories for local business how to use"
  "facebook ads for local business beginner guide"
  "how to target local customers with facebook ads"
  "best time to post on instagram for local business"
  "social media analytics what metrics actually matter"
  # Email marketing
  "email marketing for small business getting started"
  "how to build an email list for your local business"
  "email newsletter ideas for small business"
  "best email marketing tools for small business 2026"
  "email open rate what is good for small business"
  "automated email sequences for local business"
  "welcome email sequence for new customers"
  "email marketing vs social media which is better"
  # Customer retention
  "how to get repeat customers for your small business"
  "customer loyalty program ideas for small business"
  "how to follow up with customers after a sale"
  "text message marketing for small business"
  "SMS marketing vs email marketing small business"
  "how to collect customer contact info at point of sale"
  "customer referral program how to start one"
  "word of mouth marketing strategy small business"
  "thank you card marketing for local business"
  # Online booking
  "online booking system for small business guide"
  "best appointment booking tools for small business 2026"
  "how online booking reduces no-shows"
  "calendar booking link how to add to google business profile"
  "online booking vs phone calls for appointments"
  # Analytics
  "google analytics for small business what to track"
  "website analytics for local business beginner guide"
  "how to know if your website is working"
  "google search console for small business explained"
  "tracking phone calls from your website how to"
  # Content and video
  "blogging for small business does it work"
  "content marketing ideas for local business"
  "how often should a small business blog"
  "evergreen content ideas for small business website"
  "short form video for local business complete guide"
  "how to make reels for your local business"
  "behind the scenes content ideas for small business"
  "customer testimonial video how to film and use"
  "youtube for local business worth it or not"
  # Paid ads
  "google ads for small business is it worth it"
  "facebook ads budget for local business how much to spend"
  "google local service ads explained"
  "retargeting ads for small business how they work"
  "pay per click vs organic SEO for small business"
  # Directories and listings
  "online directories for small business which ones matter"
  "yelp for business is it worth it in 2026"
  "apple maps business listing how to claim it"
  "bing places for business setup guide"
  # AI and tools
  "AI tools for small business marketing in 2026"
  "how to start using AI in your small business"
  "ChatGPT for small business owners beginners guide"
  "best free AI tools for small business 2026"
  "how to use AI to write better business emails"
  "AI for customer service small business how to set it up"
  "how to use AI to create social media content faster"
  "AI scheduling tools for small business"
  "what AI can and cannot do for your small business"
  "how to build AI prompts that actually work"
  "AI writing tools comparison for small business"
  "how to automate repetitive business tasks with AI"
  "AI chatbot for small business website setup guide"
  "using AI to respond to Google reviews automatically"
  "AI tools for restaurant ordering and menu management"
  "how to train your team on AI tools step by step"
  "AI for bookkeeping small business tools compared"
  "Claude vs ChatGPT for small business which is better"
  # General tech
  "website speed for local business why it matters"
  "how to speed up your small business website"
  "instagram marketing for local business"
  "word of mouth marketing strategy"
  "how to get repeat customers"
  "google business profile setup guide"
  "online booking system for small business"
  "website speed and local business ranking"
  "social media posting schedule for small business"
)

# ── Read/update rotation index ────────────────────────────────────────────────

if [[ -f "$INDEX_FILE" ]]; then
  SI=$(python3 -c "import json; d=json.load(open('$INDEX_FILE')); print(d.get('silver',0))")
  TI=$(python3 -c "import json; d=json.load(open('$INDEX_FILE')); print(d.get('tech',0))")
else
  SI=0
  TI=0
fi

SILVER_LEN=${#SILVER_TOPICS[@]}
TECH_LEN=${#TECH_TOPICS[@]}

S1_IDX=$((SI % SILVER_LEN))
S2_IDX=$(((SI + 1) % SILVER_LEN))
T1_IDX=$((TI % TECH_LEN))
T2_IDX=$(((TI + 1) % TECH_LEN))

TOPIC_S1="${SILVER_TOPICS[$S1_IDX]}"
TOPIC_S2="${SILVER_TOPICS[$S2_IDX]}"
TOPIC_T1="${TECH_TOPICS[$T1_IDX]}"
TOPIC_T2="${TECH_TOPICS[$T2_IDX]}"

# Save updated index
python3 -c "
import json
d = {'silver': $((SI + 2)), 'tech': $((TI + 2))}
with open('$INDEX_FILE', 'w') as f: json.dump(d, f)
"

# ── Helpers ───────────────────────────────────────────────────────────────────

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-55
}

ollama_call() {
  # Migrated 2026-06-16: gemma4:e2b gguf (7.7 GB) removed — swapped to death on
  # this 8 GB Mac. Now calls the LiteRT serve leaf endpoint (gemma-4-E2B, ~2 GB,
  # Metal GPU) at :9379. Service: com.nick.litert-serve. Helper: ~/bin/gemma.sh.
  # NOTE: model context = 4096 tokens — keep prompt + max_tokens under that.
  local prompt="$1"
  local max_tokens="${2:-1400}"
  M="gemma-e2b,gpu" N="$max_tokens" python3 -c '
import json, os, sys, urllib.request
body = json.dumps({
    "model": os.environ["M"],
    "messages": [{"role": "user", "content": sys.stdin.read()}],
    "max_tokens": int(os.environ["N"]),
    "temperature": 0.65,
}).encode()
req = urllib.request.Request("http://localhost:9379/v1/chat/completions",
                             data=body, headers={"Content-Type": "application/json"})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
    print(d["choices"][0]["message"]["content"])
except Exception as e:
    sys.stderr.write(f"litert call failed: {e}\n")
' <<<"$prompt" 2>/dev/null
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

  mkdir -p "$POST_DIR"

  echo "  Topic: $KEYWORD ($BRAND)"

  # Skip if already drafted today
  if [[ -f "$DRAFT_FILE" ]] && grep -q "$TODAY" "$DRAFT_FILE" 2>/dev/null; then
    echo "    SKIP (draft exists)"
    echo "$SLUG|$KEYWORD|$BRAND"
    return 0
  fi

  # Brand context — read from MASTER_CONTEXT file
  local MC_FILE
  if [[ "$BRAND" == "silver" ]]; then
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-silver.md"
  else
    MC_FILE="$BLOG_DIR/MASTER_CONTEXT-tech.md"
  fi

  local BRAND_CTX
  if [[ -f "$MC_FILE" ]]; then
    BRAND_CTX=$(awk '
      /^## Brand Identity/,/^## Audience/ { print }
      /^## Audience/,/^## Voice/ { print }
      /^## Voice/,/^## Content Pillars/ { print }
      /^## UGC Prompting Principles/,/^## Visual Identity/ { print }
    ' "$MC_FILE" | head -80)
  else
    if [[ "$BRAND" == "silver" ]]; then
      BRAND_CTX="Fused Distribution — silver and precious metals reserve plans. Audience: retail investors buying physical silver. CTA: /reserve/"
    else
      BRAND_CTX="Fused Distribution Technology Solutions — websites and digital marketing for local businesses. Audience: small business owners. CTA: /#contact"
    fi
  fi

  # ── Step 1: Research brief ──
  echo "    [1/2] Research brief..."
  local BRIEF_PROMPT="You are a content strategist for $BRAND_CTX

Target keyword: \"$KEYWORD\"

Write a structured content brief. Sections:

## Search Intent
One sentence: what does someone searching this actually want?

## Best Angle
One sentence: what angle makes this post stand out from generic results?

## Competitor Gap
Two sentences: what do most articles on this topic miss?

## Key Points (5 bullets)
Specific, factual, non-obvious. Mark uncertain stats [VERIFY].

## H2 Structure
4-5 H2 headings in logical order.

## SEO Title
One title, 55 chars max, includes keyword.

## Internal Links
2 slugs from: dollar-cost-averaging-silver, silver-coins-rounds-bars, silver-etf-vs-physical, silver-inflation-hedge, silver-portfolio-allocation, silver-premiums-explained, silver-storage-guide, silver-supply-deficit, silver-to-gold-ratio, what-is-junk-silver, where-to-buy-silver, getting-google-reviews, google-business-profile-setup, local-seo-near-me, what-a-website-does-for-your-business, word-of-mouth-referrals

Output sections only. No preamble."

  local BRIEF
  BRIEF=$(ollama_call "$BRIEF_PROMPT" 700)

  cat > "$BRIEF_FILE" <<EOF
# Research Brief — $KEYWORD
**Date:** $TODAY | **Brand:** $BRAND | **Slug:** $SLUG
**Model:** gemma-e2b (litert)

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
Mark any uncertain stat with [VERIFY]. Output prose only, no headings, no preamble, no meta-commentary."

  # Brand CTA URL
  local CTA_URL
  if [[ "$BRAND" == "silver" ]]; then CTA_URL="https://fuseddistribution.com/reserve/"; else CTA_URL="https://fuseddistribution.com/#contact"; fi

  # 2a. Extract H2 headings (one per line) from the brief.
  local HEADINGS_RAW
  HEADINGS_RAW=$(ollama_call "From the research brief below, list ONLY the 4-5 H2 section headings, one per line. No numbers, no markdown symbols (#, -, *), no extra text.

Brief:
$BRIEF" 200)

  local HEADINGS=()
  while IFS= read -r h; do
    h=$(echo "$h" | sed -E 's/^[[:space:]]*[#>*-]+[[:space:]]*//; s/^[[:space:]]*[0-9]+[.)][[:space:]]*//; s/^[[:space:]]+//; s/[[:space:]]+$//')
    [[ -n "$h" && ${#h} -le 80 ]] && HEADINGS+=("$h")
  done <<< "$HEADINGS_RAW"
  # Fallback if parsing yielded nothing
  if (( ${#HEADINGS[@]} == 0 )); then
    HEADINGS=("Overview" "What to Know" "How to Get Started" "Common Mistakes")
  fi
  # Cap at 6 sections
  HEADINGS=("${HEADINGS[@]:0:6}")
  echo "      sections: ${#HEADINGS[@]} — ${HEADINGS[*]}"

  # 2b. Intro (answer-first).
  local INTRO
  INTRO=$(ollama_call "Write the opening paragraph (3-4 sentences) of a blog post for $BRAND_CTX
Keyword: \"$KEYWORD\". Answer the keyword question directly in the first sentence (answer-first). No heading.
$STYLE" 260)

  # 2c. One section per heading.
  local SECTIONS=""
  local KEYPOINTS
  KEYPOINTS=$(echo "$BRIEF" | sed -n '/Key Points/,/H2 Structure/p' | head -20)
  local H
  for H in "${HEADINGS[@]}"; do
    echo "      section: $H"
    local SEC
    SEC=$(ollama_call "Blog post for $BRAND_CTX. Keyword: \"$KEYWORD\".
Write the body for the section titled \"$H\" (2-3 short paragraphs). Do not repeat the heading. Stay specific to this section.
Relevant points:
$KEYPOINTS
$STYLE" 320)
    SECTIONS+="## $H

$SEC

"
  done

  # 2d. CTA (templated — reliable URL).
  local CTA
  CTA=$(ollama_call "Write a 2-sentence call to action for $BRAND_CTX ending by pointing readers to $CTA_URL. Keyword context: \"$KEYWORD\".
$STYLE" 120)

  # Assemble
  local DRAFT="$INTRO

$SECTIONS$CTA"

  cat > "$DRAFT_FILE" <<EOF
<!-- gemma_draft: $TODAY | keyword: $KEYWORD | brand: $BRAND -->
# GEMMA DRAFT — $KEYWORD
> Generated: $TODAY | Model: gemma-e2b (litert) | Status: NEEDS POLISH
> Claude: apply writing rules, verify [VERIFY] stats, then build HTML. Do NOT rewrite from scratch.

---

$DRAFT
EOF

  echo "    Draft saved: $DRAFT_FILE"
  echo "$SLUG|$KEYWORD|$BRAND"
}

# ── Main ──────────────────────────────────────────────────────────────────────

echo "=== Gemma Nightly — $TODAY ==="
echo "Silver: [$S1_IDX] $TOPIC_S1 / [$S2_IDX] $TOPIC_S2"
echo "Tech:   [$T1_IDX] $TOPIC_T1 / [$T2_IDX] $TOPIC_T2"
echo ""

# Check if queue already exists for today
if [[ -f "$QUEUE_FILE" ]]; then
  echo "Queue already exists for today: $QUEUE_FILE"
  echo "Delete it to re-run. Exiting."
  exit 0
fi

QUEUE_ENTRIES=()

echo "[Silver 1/2]"
RESULT=$(process_topic "$TOPIC_S1" "silver")
QUEUE_ENTRIES+=("$RESULT")
sleep 3

echo "[Silver 2/2]"
RESULT=$(process_topic "$TOPIC_S2" "silver")
QUEUE_ENTRIES+=("$RESULT")
sleep 3

echo "[Tech 1/2]"
RESULT=$(process_topic "$TOPIC_T1" "tech")
QUEUE_ENTRIES+=("$RESULT")
sleep 3

echo "[Tech 2/2]"
RESULT=$(process_topic "$TOPIC_T2" "tech")
QUEUE_ENTRIES+=("$RESULT")

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

echo ""
echo "=== Done: $(date '+%H:%M:%S') ==="
echo "Queue: $QUEUE_FILE"
echo "Claude picks this up at 9 AM."
