#!/usr/bin/env bash
# gemma-nightly.sh — overnight pipeline: research briefs + full article drafts
# Runs at 11 PM via launchd. Outputs 4 post drafts (2 silver + 2 tech) for
# Claude's 9 AM run. Claude skips seo-plan + blog-write — just polish + build.
#
# Output per topic:
#   blog/[slug]/gemma_draft.md        — full article draft
#   blog/research/YYYY-MM-DD-[slug].md — research brief
#   blog/research/YYYY-MM-DD-queue.json — today's 4 posts for Claude to consume

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
RESEARCH_DIR="$BLOG_DIR/research"
TODAY=$(date '+%Y-%m-%d')
INDEX_FILE="$RESEARCH_DIR/topic-index.json"
QUEUE_FILE="$RESEARCH_DIR/${TODAY}-queue.json"

mkdir -p "$RESEARCH_DIR"

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
  local prompt="$1"
  local max_tokens="${2:-1400}"
  curl -s --max-time 180 http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"gemma4:e2b\",
      \"prompt\": $(echo "$prompt" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
      \"stream\": false,
      \"options\": { \"temperature\": 0.65, \"num_predict\": $max_tokens }
    }" 2>/dev/null | python3 -c 'import json,sys; d=json.loads(sys.stdin.read()); print(d.get("response",""))' 2>/dev/null
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
**Model:** gemma4:e2b

---

$BRIEF

---
EOF
  echo "    Brief saved."

  # ── Step 2: Full article draft ──
  echo "    [2/2] Article draft..."
  local DRAFT_PROMPT="You are writing a blog post for $BRAND_CTX

Target keyword: \"$KEYWORD\"

Research brief:
$BRIEF

Write a 700-900 word article. Rules:
- First paragraph answers the keyword question directly (answer-first)
- Use the H2 structure from the brief
- Include 3-4 specific stats or facts (mark uncertain ones [VERIFY])
- Plain, direct tone. Second person (you/your). Short sentences.
- No em dashes. No buzzwords (leverage, utilize, streamline, empower, transform, revolutionize, seamlessly, robust, cutting-edge, comprehensive, holistic).
- No filler openers: 'In today's landscape', 'When it comes to', 'In an era of'
- No filler transitions: moreover, furthermore, additionally, notably
- End with a 2-sentence CTA pointing to the brand URL above
- Output article markdown only. No preamble, no meta-commentary."

  local DRAFT
  DRAFT=$(ollama_call "$DRAFT_PROMPT" 1400)

  cat > "$DRAFT_FILE" <<EOF
<!-- gemma_draft: $TODAY | keyword: $KEYWORD | brand: $BRAND -->
# GEMMA DRAFT — $KEYWORD
> Generated: $TODAY | Model: gemma4:e2b | Status: NEEDS POLISH
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
            'draft': f'blog/{slug}/gemma_draft.md',
            'ad_formats': ad_formats,
            'ugc_angle': ugc_angle
        })

queue = {'date': '$TODAY', 'posts': entries}
with open('$QUEUE_FILE', 'w') as f:
    json.dump(queue, f, indent=2)
print(f'Queue written: {len(entries)} posts')
"

echo ""
echo "=== Done: $(date '+%H:%M:%S') ==="
echo "Queue: $QUEUE_FILE"
echo "Claude picks this up at 9 AM."
