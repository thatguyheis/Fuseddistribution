// Deterministic uncited-attribution detector. Local writer models fabricate
// stat attributions ("According to HubSpot...", "(Source: Google Search
// Insights)") whenever research.json is absent — which is every Hermes-takeover
// build, since T1 research only runs with Claude available. This flags any
// named-source claim whose source is not in research.json, so the lint fix
// loop strips it and qa-local blocks anything that slips through.

import { readFileSync, existsSync } from "node:fs";

const SELF_NAMES = ["fused distribution", "fused"];

function normalize(name) {
  return name.toLowerCase()
    .replace(/&(?:amp|#\d+|[a-z]+);/g, " ") // html entities (&amp;) from rendered text
    .replace(/['’]s\b/g, "")                // possessives anywhere: BrightLocal's -> brightlocal
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Two significant shared tokens means the same source under a name variant
// ("Buffer LinkedIn Posting Frequency Study, August 2025" vs "(Aug 2025)").
function tokenOverlap(a, b) {
  const toks = (s) => new Set(s.split(" ").filter((w) => w.length > 3 && !/^\d+$/.test(w)));
  const A = toks(a), B = toks(b);
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n >= 2;
}

export function loadAllowedSources(researchPath) {
  const allowed = new Set(SELF_NAMES);
  if (researchPath && existsSync(researchPath)) {
    try {
      const research = JSON.parse(readFileSync(researchPath, "utf8"));
      for (const stat of research.stats || []) {
        const n = normalize(stat.source_name || "");
        if (n) allowed.add(n);
      }
    } catch {
      // unreadable research.json = no allowlist beyond self
    }
  }
  return allowed;
}

function isAllowed(candidate, allowed) {
  const n = normalize(candidate);
  if (!n || n.length < 3) return true; // too short to be a real org claim
  for (const a of allowed) {
    if (n.includes(a) || a.includes(n) || tokenOverlap(n, a)) return true;
  }
  return false;
}

// Org-name capture: capitalized word run, e.g. "HubSpot", "Google Search Insights".
// No `i` flag on patterns using ORG — case-insensitivity would let the run
// swallow lowercase words and capture whole sentences.
const ORG = "([A-Z][A-Za-z0-9.&'-]*(?:\\s+[A-Z][A-Za-z0-9.&'-]*)*)";
const PATTERNS = [
  new RegExp(`\\b[Aa]ccording to\\s+${ORG}`, "g"),
  new RegExp(`\\b(?:[Ss]tudy|[Rr]eport|[Ss]urvey|[Aa]nalysis|[Rr]esearch)\\s+(?:by|from)\\s+${ORG}`, "g"),
  new RegExp(`\\b(?:[Dd]ata|[Aa]nalytics|[Rr]esearch|[Bb]enchmarks?|[Ss]tatistics)\\s+from\\s+${ORG}`, "g"),
  new RegExp(`\\b${ORG}\\s+(?:data|benchmarks?|research|analytics|statistics)\\s+(?:show|shows|found|reveals?|puts?)`, "g"),
  /\(\s*Source:\s*([^)]+?)\s*\)/gi,
];

// Bare parenthetical org right after a numeric claim: "...60% of traffic (Statista)."
const NUMERIC_SENTENCE = /\d+(?:\.\d+)?\s*(?:%|percent)/i;
const BARE_PAREN_ORG = /\(([A-Z][A-Za-z0-9.&' -]{2,40})\)/g;
// Single-word parentheticals that are timing/labels, not sources
const PAREN_STOPWORDS = new Set([
  "example", "optional", "recommended", "important", "note", "free", "bonus",
  "new", "updated", "immediately", "later", "finally", "optionally", "typical",
  // Formula labels such as "Premium (Dollars)" describe units, not sources.
  "dollars", "percent", "percentage", "ounces", "ounce", "grams", "kilograms",
]);

export function findUncitedSources(text, researchPath) {
  const allowed = loadAllowedSources(researchPath);
  const hits = new Map();

  const flag = (raw, { capWords = 0 } = {}) => {
    // ORG allows '.' for names like GoldSilver.com, so a run can jump a
    // sentence boundary ("Google. Photo") — cut at ". " + drop possessives.
    const name = raw.split(/\.\s/)[0]
      .replace(/['’]s$/, "")
      .replace(/\s+benchmarks?$/i, "")
      .trim();
    // Real org names are short; a long capitalized run is a title or heading
    // the ORG regex swallowed, not a source.
    if (capWords && name.split(/\s+/).length > capWords) return;
    if (!isAllowed(name, allowed)) hits.set(name, (hits.get(name) || 0) + 1);
  };

  for (const re of PATTERNS) {
    const isSourceParen = re.source.includes("Source:");
    for (const m of text.matchAll(re)) flag(m[1], { capWords: isSourceParen ? 0 : 6 });
  }

  // A word that also appears lowercase somewhere in the document is ordinary
  // English ("still", "over", "spot"), not an org name — org names like
  // Statista or BrightLocal never show up lowercased. Parentheticals are
  // stripped first so a candidate can't vouch for itself.
  const textLower = text.replace(/\([^)]*\)/g, " ").toLowerCase();
  const isCommonWord = (w) =>
    new RegExp(`\\b${w.toLowerCase().replace(/[^a-z0-9]/g, "")}\\b`).test(textLower);

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (!NUMERIC_SENTENCE.test(sentence)) continue;
    for (const m of sentence.matchAll(BARE_PAREN_ORG)) {
      const candidate = m[1].trim();
      // skip pure-acronym parentheticals like "(CTR)" and ALL-CAPS shouting
      if (/^[A-Z]{2,6}$/.test(candidate)) continue;
      if (/^[A-Z0-9 ]+$/.test(candidate) && candidate.includes(" ")) continue;
      const words = candidate.split(/\s+/);
      if (words.length === 1 && (PAREN_STOPWORDS.has(words[0].toLowerCase()) || /ly$/i.test(words[0]))) continue;
      // org names are title-case runs; a lowercase-initial word inside means
      // ordinary prose like "(QE expansion era)" (years exempt)
      if (words.some((w) => /^[a-z]/.test(w) && !/^\d{4}$/.test(w))) continue;
      // skip phrases made entirely of ordinary words (years exempt)
      if (words.filter((w) => !/^\d{4}$/.test(w)).every(isCommonWord)) continue;
      flag(candidate);
    }
  }

  return [...hits.entries()].map(([source, count]) => ({ source, count }));
}
