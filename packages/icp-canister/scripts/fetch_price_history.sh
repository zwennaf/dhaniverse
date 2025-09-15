#!/usr/bin/env bash
set -euo pipefail

# fetch_price_history.sh
# Calls the local replica HTTP handler for /price-history and prints decoded JSON

CWD="$(cd "$(dirname "$0")/.." && pwd)"
cd "$CWD"

CANISTER_ID=${CANISTER_ID:-$(dfx canister id dhaniverse_backend 2>/dev/null || true)}
if [ -z "$CANISTER_ID" ]; then
  echo "Cannot determine CANISTER_ID. Run 'dfx canister id dhaniverse_backend' or set CANISTER_ID env var."
  exit 1
fi

URL="http://127.0.0.1:4943/api/v2/canister/$CANISTER_ID/http_request"
REQ='{"method":"GET","url":"/price-history","headers": []}'

RESP=$(curl -sS -X POST "$URL" -H "Content-Type: application/json" -d "$REQ") || {
  echo "curl failed"
  echo "$RESP"
  exit 1
}

# Decode the replica response body (base64) and pretty-print JSON
python3 - <<PY
import sys, json, base64
s = sys.stdin.read()
try:
    j = json.loads(s)
except Exception as e:
    print("Failed to parse replica JSON:", e)
    print(s)
    sys.exit(1)

body_b64 = j.get('body', '')
if not body_b64:
    print('Empty body in response; full response:')
    print(json.dumps(j, indent=2))
    sys.exit(0)

try:
    decoded = base64.b64decode(body_b64).decode('utf-8')
    try:
        parsed = json.loads(decoded)
        print(json.dumps(parsed, indent=2))
    except Exception:
        # Not JSON, print raw
        print(decoded)
except Exception as e:
    print('Failed to base64-decode or parse body:', e)
    print('Raw body base64:', body_b64)
PY
