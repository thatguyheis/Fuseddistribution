#!/usr/bin/env bash
# Local Gemma text helper for scheduled Hermes takeover stages.
# Interface-compatible with ~/bin/gemma.sh:
#   hermes-local.sh "prompt"
#   echo "prompt" | hermes-local.sh
#
# Uses Ollama's OpenAI-compatible endpoint, but avoids the full Hermes
# agent/tool startup cost for small leaf prompts. The default Gemma QAT model
# is for direct text generation only; Ollama reports it does not support tools.
set -euo pipefail

MODEL="${HERMES_LOCAL_MODEL:-gemma3:4b-it-qat}"
BASE_URL="${HERMES_LOCAL_BASE_URL:-http://localhost:11434/v1}"
MAXTOK="${HERMES_LOCAL_MAX_TOKENS:-256}"
TEMPERATURE="${HERMES_LOCAL_TEMPERATURE:-0.35}"
TIMEOUT="${HERMES_LOCAL_TIMEOUT:-300}"
PROMPT="${1:-$(cat)}"

if [[ -z "${PROMPT//[[:space:]]/}" ]]; then
  echo "hermes-local.sh: empty prompt" >&2
  exit 2
fi

BODY=$(python3 -c '
import json, sys
print(json.dumps({
  "model": sys.argv[1],
  "messages": [{"role": "user", "content": sys.argv[2]}],
  "max_tokens": int(sys.argv[3]),
  "temperature": float(sys.argv[4]),
  "stream": False,
}))
' "$MODEL" "$PROMPT" "$MAXTOK" "$TEMPERATURE")

attempt=1
while (( attempt <= 3 )); do
  OUT=$(curl -sS --max-time "$TIMEOUT" \
    "$BASE_URL/chat/completions" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    text = data["choices"][0]["message"]["content"]
    if not text.strip():
        raise ValueError("empty response")
    print(text.strip())
except Exception:
    sys.exit(1)
' 2>/dev/null) && {
    printf '%s\n' "$OUT"
    exit 0
  }

  echo "hermes-local.sh: empty/error from $MODEL at $BASE_URL (attempt $attempt/3)" >&2
  sleep $(( attempt * 2 ))
  attempt=$(( attempt + 1 ))
done

echo "hermes-local.sh: failed after 3 attempts" >&2
exit 1
