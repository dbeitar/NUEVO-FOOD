#!/usr/bin/env bash
# Run K6 performance suite via Docker (no k6 install required)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K6_DIR="$ROOT/performance/k6"
RESULTS="$ROOT/performance/results"
BASE_URL="${BASE_URL:-http://host.docker.internal:3002/api}"
PROFILE="${K6_PROFILE:-full}"
K6_IMAGE="${K6_IMAGE:-grafana/k6:0.54.0}"
PASSWORD="${K6_PASSWORD:-Demo!2026}"
USER_EMAIL="${K6_USER_EMAIL:-final.d28d@d28d.local}"
ADMIN_EMAIL="${K6_ADMIN_EMAIL:-admin@foodplan.local}"

mkdir -p "$RESULTS"
export BASE_URL K6_PROFILE

# If BASE_URL points to localhost, K6 inside Docker must use host.docker.internal instead.
BASE_URL_HOST="$BASE_URL"
BASE_URL_DOCKER="$BASE_URL"
if [[ "$BASE_URL" == *"localhost"* || "$BASE_URL" == *"127.0.0.1"* ]]; then
  BASE_URL_DOCKER="http://host.docker.internal:3002/api"
fi

get_token() {
  local email="$1"
  local res
  res="$(curl -sf -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}" \
    "${BASE_URL_HOST%/}/auth/login")"
  node -e 'const j=JSON.parse(process.argv[1]); if(!j.token) process.exit(2); process.stdout.write(j.token);' "$res"
}

run_post_audit() {
  node "$ROOT/performance/analyze/postgres-audit.mjs" "$RESULTS/$1"
}

run_parse() {
  node "$ROOT/performance/analyze/parse-k6-summaries.mjs"
}

run_capacity() {
  node "$ROOT/performance/analyze/capacity-estimate.mjs"
}

run_scenario() {
  local id="$1"
  local script="$2"
  echo ""
  echo "========== K6 $id ($PROFILE) =========="
  set +e
  docker run --rm \
    -v "$K6_DIR:/scripts:ro" \
    -v "$RESULTS:/results" \
    -e BASE_URL="$BASE_URL_DOCKER" \
    -e K6_PROFILE="$PROFILE" \
    -e K6_PASSWORD="$PASSWORD" \
    -e K6_TOKEN_USER="${K6_TOKEN_USER:-}" \
    -e K6_TOKEN_ADMIN="${K6_TOKEN_ADMIN:-}" \
    "$K6_IMAGE" run \
    --summary-export="/results/${id}-summary.json" \
    "/scripts/scenarios/${script}"
  local code=$?
  set -e
  echo "{\"scenario\":\"$id\",\"script\":\"$script\",\"exit_code\":$code,\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    >> "$RESULTS/run-log.jsonl"
  if [ "$code" -ne 0 ]; then
    echo "[WARN] Scenario $id exited with code $code (kept running suite)."
  fi
}

echo "BASE_URL_HOST=$BASE_URL_HOST BASE_URL_DOCKER=$BASE_URL_DOCKER PROFILE=$PROFILE"
curl -sf "${BASE_URL_HOST%/}/health" >/dev/null || { echo "Backend not reachable at $BASE_URL_HOST"; exit 1; }

# Pre-auth once to avoid auth rate-limits during load scenarios.
export K6_TOKEN_USER="${K6_TOKEN_USER:-$(get_token "$USER_EMAIL")}"
export K6_TOKEN_ADMIN="${K6_TOKEN_ADMIN:-$(get_token "$ADMIN_EMAIL")}"
echo "K6 user token: ${#K6_TOKEN_USER} chars"
echo "K6 admin token: ${#K6_TOKEN_ADMIN} chars"

run_post_audit "postgres-audit-before.json"

SCENARIOS=(
  "01-health:01-health.js"
  "02-login:02-login.js"
  "06-communication:06-communication.js"
  "11-audit:11-audit-writes.js"
  "03-usuario-final:03-usuario-final.js"
  "04-d28d:04-d28d.js"
  "05-training:05-training.js"
  "07-stress:07-stress.js"
  "08-spike:08-spike.js"
  "09-endurance:09-endurance.js"
)

for entry in "${SCENARIOS[@]}"; do
  id="${entry%%:*}"
  script="${entry##*:}"
  run_scenario "$id" "$script"
done

run_post_audit "postgres-audit-after.json"
run_parse
run_capacity

echo ""
echo "Done. Results in $RESULTS"
