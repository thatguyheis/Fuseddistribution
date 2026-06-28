#!/usr/bin/env bash
# Pexels photos — fetches 1-2 Pexels images (SOP §8: >=1 photo/post) and injects
# <figure class="article-photo"> blocks into index.html after the first paragraphs.
# Runs AFTER T7 html. Needs PEXELS_API_KEY (from ~/.zprofile). Best-effort.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOG_DIR="$(dirname "$SCRIPT_DIR")"

SLUG="" KEYWORD="" BRAND="silver" N=2
for a in "$@"; do case "$a" in
  --keyword=*) KEYWORD="${a#--keyword=}";; --brand=*) BRAND="${a#--brand=}";; --n=*) N="${a#--n=}";;
  --*) echo "unknown flag $a">&2; exit 2;; *) SLUG="$a";; esac; done
[[ -n "$SLUG" ]] || { echo "usage: build-pexels.sh <slug> --keyword=">&2; exit 2; }
KEYWORD="${KEYWORD:-$(echo "$SLUG" | tr '-' ' ')}"
DIR="$BLOG_DIR/$SLUG"
HTML="$DIR/index.html"
[[ -f "$HTML" ]] || { echo "build-pexels: no index.html — run after T7" >&2; exit 0; }
[[ -n "${PEXELS_API_KEY:-}" ]] || { echo "build-pexels: PEXELS_API_KEY unset — skipping (SOP §8 photo missing)" >&2; exit 0; }

# Queries: keyword + a brand-generic fallback
if [[ "$BRAND" == "silver" ]]; then Q2="silver coins bullion"; else Q2="small business storefront"; fi
QUERIES="$KEYWORD|$Q2"

OUT=$(node "$SCRIPT_DIR/fetch-pexels.mjs" --post="$SLUG" --queries="$QUERIES" 2>&1)
echo "$OUT" | sed 's/^/  /'

# Parse "pexels-N.jpg — Photo by NAME on Pexels (URL)" -> inject figures
ATTR=$(echo "$OUT" | grep -oE "pexels-[0-9]+\.jpg — Photo by .* on Pexels" || true)
[[ -z "$ATTR" ]] && { echo "build-pexels: no photos downloaded — skipping injection" >&2; exit 0; }

HTML="$HTML" KEYWORD="$KEYWORD" N="$N" FETCH_OUT="$OUT" python3 - <<'PY'
import os, re, html as H
htmlpath=os.environ["HTML"]; kw=os.environ["KEYWORD"]; n=int(os.environ["N"])
# map pexels index -> photographer name from fetch output
names={}
for m in re.finditer(r"pexels-(\d+)\.jpg — Photo by (.+?) on Pexels", os.environ.get("FETCH_OUT","")):
    names[int(m.group(1))]=m.group(2).strip()
doc=open(htmlpath).read()
if 'class="article-photo"' in doc:
    print("  build-pexels: figures already present — skipping"); raise SystemExit(0)
# collect downloaded images present on disk
d=os.path.dirname(htmlpath)
figs=[]
for i in range(0,8):
    p=os.path.join(d,"images",f"pexels-{i}.jpg")
    if os.path.exists(p) and os.path.getsize(p)>5000:
        figs.append(i)
    if len(figs)>=n: break
if not figs:
    print("  build-pexels: no image files on disk"); raise SystemExit(0)
base_alt=H.escape(kw)
SUFFIXES=["","related to "+kw,"example for "+kw,"illustration for "+kw,"photo for "+kw,"image for "+kw,"visual for "+kw,"picture for "+kw]
def fig(i):
    cap=H.escape(f"Photo by {names[i]} on Pexels") if i in names else "Photo on Pexels"
    photographer=names.get(i,"")
    # Use photographer name in alt when available to make each alt unique
    if photographer:
        alt=H.escape(f"{kw}, photo by {photographer}")
    else:
        alt=H.escape(SUFFIXES[i] if i < len(SUFFIXES) else base_alt)
    return (f'<figure class="article-photo"><img src="images/pexels-{i}.jpg" '
            f'alt="{alt}" loading="lazy" /><figcaption>{cap}</figcaption></figure>')
# inject after the Nth </p> inside article-body
body_start=doc.find('class="article-body"')
inserted=0; idx=body_start
out=doc
positions=[]
for m in re.finditer(r'</p>', doc):
    if m.start()>body_start: positions.append(m.end())
# insert after 1st and 3rd paragraph (spread out), reverse order to keep offsets
targets=[]
for k,fi in enumerate(figs):
    pidx = positions[min(k*2, len(positions)-1)] if positions else None
    if pidx is not None: targets.append((pidx, fig(fi)))
for pidx, frag in sorted(targets, key=lambda t:-t[0]):
    out = out[:pidx] + "\n            " + frag + out[pidx:]
open(htmlpath,"w").write(out)
print(f"  build-pexels: injected {len(targets)} photo figure(s)")
PY
