#!/usr/bin/env bash
set -euo pipefail

# Local Ollama helper for Qwen 3.5 and other models that support think=false.
# Keeps the existing Hermes helper interface while avoiding long reasoning
# traces for bounded writing and structured-data tasks.
MODEL="${HERMES_LOCAL_MODEL:-gemma3:4b}"
BASE_URL="${OLLAMA_LOCAL_BASE_URL:-http://127.0.0.1:11434}"
MAXTOK="${HERMES_LOCAL_MAX_TOKENS:-512}"
TEMPERATURE="${HERMES_LOCAL_TEMPERATURE:-0.25}"
TIMEOUT="${HERMES_LOCAL_TIMEOUT:-300}"
PROMPT="${1:-$(cat)}"

if [[ -z "$PROMPT" ]]; then
  echo "ollama-local-no-think.sh: empty prompt" >&2
  exit 2
fi

# launchd can report Ollama as running after its localhost listener has died.
# Recover the existing service before every local inference call, then fail
# quickly with a useful diagnostic if the endpoint does not return.
if ! curl -fsS --max-time 3 "$BASE_URL/api/tags" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/homebrew.mxcl.ollama" >/dev/null 2>&1 || true
  READY=0
  for _ in {1..24}; do
    if curl -fsS --max-time 3 "$BASE_URL/api/tags" >/dev/null 2>&1; then
      READY=1
      break
    fi
    sleep 5
  done
  if [[ "$READY" -ne 1 ]]; then
    echo "ollama-local-no-think.sh: Ollama API unavailable after LaunchAgent recovery" >&2
    exit 75
  fi
fi

BODY=$(python3 -c '
import json, sys
print(json.dumps({
  "model": sys.argv[1],
  "messages": [{"role": "user", "content": sys.argv[2]}],
  "think": False,
  "stream": False,
  "options": {
    "num_predict": int(sys.argv[3]),
    "temperature": float(sys.argv[4]),
  },
}))
' "$MODEL" "$PROMPT" "$MAXTOK" "$TEMPERATURE")

curl -fsS --max-time "$TIMEOUT" "$BASE_URL/api/chat" \
  -H 'Content-Type: application/json' \
  -d "$BODY" \
  | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    text = data["message"]["content"]
    if not text.strip():
        raise ValueError("empty response")
    print(text.strip())
except Exception as error:
    print(f"ollama-local-no-think.sh: invalid Ollama response: {error}", file=sys.stderr)
    sys.exit(1)
'
