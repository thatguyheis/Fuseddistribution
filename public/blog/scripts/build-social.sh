#!/usr/bin/env bash
# T10 social — local LLM leaf stage. Reads verified.md + hooks.json, writes
# social-copy.json (SOP §14). The model writes captions; Python assembles the schema,
# adds deterministic CTAs/hashtags/disclaimer, and strips em/en dashes everywhere.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_LLM="${LOCAL_LLM:-$HOME/bin/hermes-local.sh}"
if [[ ! -x "$LOCAL_LLM" ]]; then
  LOCAL_LLM="$HOME/bin/gemma.sh"
fi

SLUG="" IN="" HOOKS="" OUT="" BRAND="silver"
for a in "$@"; do case "$a" in
  --in=*) IN="${a#--in=}";; --hooks=*) HOOKS="${a#--hooks=}";; --out=*) OUT="${a#--out=}";; --brand=*) BRAND="${a#--brand=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
if [[ -n "$SLUG" ]]; then IN="${IN:-$BLOG_DIR/$SLUG/verified.md}"; HOOKS="${HOOKS:-$BLOG_DIR/$SLUG/hooks.json}"; OUT="${OUT:-$BLOG_DIR/$SLUG/social-copy.json}"; fi
[[ -f "$IN" ]] || { echo "error: no input $IN">&2; exit 2; }
[[ -n "$SLUG" ]] || SLUG="$(basename "$(dirname "$OUT")")"

BODY="$(cat "$IN")"
g() { HERMES_LOCAL_MAX_TOKENS="${2:-160}" GEMMA_MAX_TOKENS="${2:-160}" "$LOCAL_LLM" "$1" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g' || true; }

FB=$(g "Write a 3-sentence Facebook caption for this article. Lead with the strongest fact. Plain tone, no hashtags, no em dashes:

$BODY")
IG=$(g "Write a punchy 2-sentence Instagram caption for this article. Plain tone, no hashtags, no em dashes:

$BODY")
LI=$(g "Write a 2-sentence professional LinkedIn caption leading with the data insight. No em dashes:

$BODY")
XP=$(g "Write a tweet under 200 characters with the strongest claim from this article. No hashtags, no em dashes:

$BODY" 80)

FB="$FB" IG="$IG" LI="$LI" XP="$XP" BRAND="$BRAND" SLUG="$SLUG" HOOKS="$HOOKS" OUT="$OUT" python3 <<'PY'
import json, os, re
slug=os.environ["SLUG"]; brand=os.environ["BRAND"]
url=f"https://fuseddistribution.com/blog/{slug}/"
hooks={}
hp=os.environ["HOOKS"]
if os.path.exists(hp): hooks=json.load(open(hp))
hashtags=hooks.get("hashtags") or ("#SilverInvesting #PreciousMetals #SilverBugs #HardAssets #InflationHedge" if brand=="silver" else "#LocalBusiness #SmallBusinessTips #DigitalMarketing #GoogleMyBusiness #WebDesign")
dq=hooks.get("discussion_question","What's your take?")
share="Send this to someone who needs to hear it."

def clean(s):
    s=re.sub(r"[—–]", ", ", s or "").strip()
    s=re.sub(r"\s+", " ", s)
    return s.strip(' ,')

fb=clean(os.environ["FB"]); ig=clean(os.environ["IG"]); li=clean(os.environ["LI"]); xp=clean(os.environ["XP"])
# enforce X length incl url
xfull=f"{xp} {url}"
if len(xfull)>280: xp=xp[:280-len(url)-2].rsplit(" ",1)[0]; xfull=f"{xp} {url}"

disclaimer="Silver and precious metals markets involve risk. This content is for informational purposes only and is not financial advice." if brand=="silver" else ""

out={
  "slug":slug,"topic":brand,"blog_url":url,
  "reel":{
    "facebook":f"{fb} {share}",
    "instagram":f"{ig} {share}\n\n{hashtags}",
    "linkedin":f"{li} {url}",
    "x":xfull,
  },
  "photo":{
    "facebook":f"{fb}\n\n{dq}",
    "instagram":f"{ig}\n\n{hashtags}",
    "linkedin":f"{li} {url}",
  },
  "hashtags":hashtags,
  "discussion_question":dq,
}
if disclaimer: out["disclaimer"]=disclaimer
# final em-dash guard across all strings
def scrub(o):
    if isinstance(o,str): return re.sub(r"[—–]",", ",o)
    if isinstance(o,dict): return {k:scrub(v) for k,v in o.items()}
    return o
out=scrub(out)
json.dump(out, open(os.environ["OUT"],"w"), indent=2)
# validate
assert "—" not in json.dumps(out) and "–" not in json.dumps(out), "em dash leaked"
print(f"[social] wrote {os.environ['OUT']} (x len {len(out['reel']['x'])})")
PY
