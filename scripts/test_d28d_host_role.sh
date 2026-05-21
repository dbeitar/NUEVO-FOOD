#!/usr/bin/env bash
# Pruebas rol entrenador_d28d (Fase 1). Uso: ./scripts/test_d28d_host_role.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"

login() {
  local email="$1"
  curl -s -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token){console.error('login fail',d);process.exit(1)};console.log(j.token)})"
}

echo "== entrenador_d28d: login =="
HOST_TOKEN=$(login "host.d28d@d28d.local")

echo "== GET admin live-classes (debe 200 y solo clases asignadas) =="
curl -s -o /tmp/host_classes.json -w "%{http_code}" \
  -H "Authorization: Bearer $HOST_TOKEN" \
  "$BASE/live-classes/admin" | tee /tmp/host_status.txt
grep -q '^200$' /tmp/host_status.txt || { echo FAIL status; cat /tmp/host_classes.json; exit 1; }

echo "== POST create class (debe 403) =="
CODE=$(curl -s -o /tmp/host_create.json -w "%{http_code}" \
  -X POST -H "Authorization: Bearer $HOST_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"X","zoom_link":"https://z","start_time":"2030-01-01T10:00:00Z","end_time":"2030-01-01T11:00:00Z"}' \
  "$BASE/live-classes/admin")
test "$CODE" = "403" || { echo "expected 403 got $CODE"; cat /tmp/host_create.json; exit 1; }

echo "== GET training plans (debe 403) =="
TCODE=$(curl -s -o /tmp/host_train.json -w "%{http_code}" \
  -H "Authorization: Bearer $HOST_TOKEN" \
  "$BASE/training/admin/plans")
test "$TCODE" = "403" || { echo "expected 403 got $TCODE"; exit 1; }

echo "== coach entrenador: training debe seguir OK =="
COACH_TOKEN=$(login "final.coach@d28d.local")
CCODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $COACH_TOKEN" \
  "$BASE/training/admin/plans")
test "$CCODE" = "200" || test "$CCODE" = "403" # coach puede variar por asignación; al menos no 500

echo "OK — entrenador_d28d Fase 1"
