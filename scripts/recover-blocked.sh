#!/bin/zsh
# Recover quarantined posts: restore -> sanitize -> refresh date -> rebuild html
# (preserving photo figures) -> re-QA -> register -> commit. One commit per post.
# NO deploy here. NO gate bypass: still-failing posts are removed from public/.
set -euo pipefail
cd /Users/nick/projects/fuseddistribution
BLOG=public/blog
SD=$BLOG/scripts
TODAY=$(date +%Y-%m-%d)
PASS=(); FAIL=(); SKIP=()

# newest attempt per slug across all .workflow-blocked/*/ dirs
# (lexical sort: later date dirs + later HHMMSS overwrite earlier)
typeset -A latest
for d in .workflow-blocked/*/*(/N); do
  base=${d:t}
  [[ $base == manual-cleanup-* || $base == manual-content-cleanup ]] && continue
  slug=$(echo "$base" | sed -E 's/-[0-9]{6}(-[a-z0-9]+)?$//')
  [[ -f "$d/verified.md" && -f "$d/index.html" && -f "$d/meta.json" ]] || { SKIP+=("$base (incomplete)"); continue; }
  latest[$slug]=$d
done

for slug in ${(k)latest}; do
  src=${latest[$slug]}
  echo "== $slug (from $src)"

  # skip if already live (a later run may have published the same slug)
  if grep -q "\"slug\": \"$slug\"" $BLOG/posts.json; then SKIP+=("$slug (already in posts.json)"); continue; fi
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://fuseddistribution.com/blog/$slug/")
  if [[ $code == 200 ]]; then SKIP+=("$slug (already live)"); continue; fi

  [[ -e $BLOG/$slug ]] && { SKIP+=("$slug (dir exists in public/blog — resolve manually)"); continue; }
  cp -R "$src" "$BLOG/$slug"

  # repair text artifacts in the render source
  python3 $SD/sanitize-draft.py $BLOG/$slug/verified.md
  # refresh publish date to today (posts.json is newest-first; stale dates break ordering)
  python3 - "$BLOG/$slug/meta.json" "$TODAY" <<'PY'
import json,sys
p,today=sys.argv[1],sys.argv[2]
m=json.load(open(p)); old=m.get("date"); m["date"]=today
m.pop("humanDate", None)
json.dump(m,open(p,"w"),indent=2)
print(f"  date {old} -> {today}")
PY

  # rebuild html from repaired verified.md (also fixes date in rendered JSON-LD)
  node $SD/build-html.mjs --slug=$slug 2>&1 | sed 's/^/  /'

  # rebuild drops pexels <figure> blocks (they live in index.html, not verified.md)
  # -> restore them from the quarantined original at build-pexels positions
  SRC_HTML="$src/index.html" DST_HTML="$BLOG/$slug/index.html" python3 - <<'PY'
import os, re
src=open(os.environ["SRC_HTML"]).read()
dstp=os.environ["DST_HTML"]; dst=open(dstp).read()
figs=re.findall(r'<figure class="article-photo">.*?</figure>', src, re.S)
if not figs: print("  figures: none in source — skipping"); raise SystemExit(0)
if 'class="article-photo"' in dst: print("  figures: already present"); raise SystemExit(0)
body_start=dst.find('class="article-body"')
positions=[m.end() for m in re.finditer(r'</p>', dst) if m.start()>body_start]
targets=[]
for k,frag in enumerate(figs):
    pidx=positions[min(k*2, len(positions)-1)] if positions else None
    if pidx is not None: targets.append((pidx, frag))
out=dst
for pidx,frag in sorted(targets, key=lambda t:-t[0]):
    out=out[:pidx]+"\n            "+frag+out[pidx:]
open(dstp,"w").write(out)
print(f"  figures: restored {len(targets)}")
PY

  # repair reel script + social copy text in place
  python3 $SD/sanitize-draft.py $BLOG/$slug/reel-script.md 2>/dev/null || true
  [[ -f $BLOG/$slug/social-copy.json ]] && python3 - "$BLOG/$slug/social-copy.json" <<'PY'
import json,subprocess,sys,tempfile,os
p=sys.argv[1]
d=json.load(open(p))
def walk(x):
    if isinstance(x,str):
        if " " not in x.strip(): return x  # slugs, URLs, single tokens: not prose
        f=tempfile.NamedTemporaryFile("w",suffix=".md",delete=False); f.write(x); f.close()
        subprocess.run(["python3","public/blog/scripts/sanitize-draft.py",f.name],check=True,capture_output=True)
        out=open(f.name).read(); os.unlink(f.name); return out
    if isinstance(x,list): return [walk(i) for i in x]
    if isinstance(x,dict): return {k:walk(v) for k,v in x.items()}
    return x
json.dump(walk(d),open(p,"w"),indent=2)
PY

  # re-gate. NO bypass.
  if node $SD/qa-local.mjs --slug=$slug --out=$BLOG/$slug/qa.json; then
    node $SD/add-to-posts.mjs --slug=$slug
    # topic-history append (same format/section logic as build-post.sh)
    BLOGDIR=$BLOG SLUG=$slug TODAY=$TODAY python3 - <<'PY'
import json,os
bd=os.environ["BLOGDIR"]; slug=os.environ["SLUG"]; today=os.environ["TODAY"]
meta=json.load(open(os.path.join(bd,slug,"meta.json")))
brand=meta.get("brand","tech"); kw=slug.replace("-"," ")
path=os.path.join(bd,"topic-history.md")
section="## Silver Posts" if brand=="silver" else "## Tech Posts"
row=f"| {today} | {slug} | General | {kw} (recovered) |"
text=open(path).read()
if slug in text: print("  topic-history: already present"); raise SystemExit(0)
def insert(text, section, row):
    lines=text.splitlines(); res=[]; i=0; done=False
    while i < len(lines):
        res.append(lines[i])
        if not done and lines[i].strip()==section:
            j=i+1
            while j < len(lines) and not (("|" in lines[j]) and set(lines[j].strip()) <= set("|-: ")):
                res.append(lines[j]); j+=1
            if j < len(lines):
                res.append(lines[j]); res.append(row); i=j; done=True
        i+=1
    if not done:
        res += ["", section, "", "| Date | Slug | Broad Category | Angle |", "|------|------|----------------|-------|", row]
    return "\n".join(res)
open(path,"w").write(insert(text, section, row)+"\n")
print(f"  topic-history: appended under {section}")
PY
    node $SD/generate-sitemap.mjs
    git add "$BLOG/$slug/" $BLOG/posts.json $BLOG/topic-history.md public/sitemap.xml
    git commit -m "feat: $slug (recovered from quarantine)"
    PASS+=($slug)
  else
    echo "  STILL FAILING: $(cat $BLOG/$slug/qa.json 2>/dev/null || echo 'no qa.json')"
    rm -rf "$BLOG/$slug"   # restore repo state; original stays in .workflow-blocked
    FAIL+=($slug)
  fi
done

echo; echo "RECOVERED: ${PASS[*]:-none}"; echo "STILL BLOCKED: ${FAIL[*]:-none}"; echo "SKIPPED: ${SKIP[*]:-none}"
