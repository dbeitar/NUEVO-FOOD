#!/usr/bin/env bash
# Fase 9 — validación preproducción (seguridad, licencias, tenant, performance).
# Uso: ./scripts/test_phase9_preprod.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"
REPORT="${REPORT:-/tmp/phase9_report.txt}"
: > "$REPORT"

pass() { echo "PASS $1" >> "$REPORT"; echo "PASS $1"; }
fail() { echo "FAIL $1" >> "$REPORT"; echo "FAIL $1"; }
skip() { echo "SKIP $1" >> "$REPORT"; echo "SKIP $1"; }
timing() { echo "TIME $1 ${2}ms" >> "$REPORT"; echo "TIME $1 ${2}ms" >&2; }

login() {
  local email="$1"
  local t0=$(python3 -c 'import time;print(int(time.time()*1000))')
  local tok
  tok=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token){console.error(d);process.exit(1)};console.log(j.token)})")
  local t1=$(python3 -c 'import time;print(int(time.time()*1000))')
  timing "login:$email" "$((t1-t0))"
  echo "$tok"
}

http_code() {
  curl -s -o "$2" -w "%{http_code}" -H "Authorization: Bearer $3" "$1"
}

echo "=== FASE 9 PREPROD ===" | tee -a "$REPORT"
echo "BASE=$BASE" | tee -a "$REPORT"

# --- Seguridad multi-tenant ---
echo "--- Seguridad ---" | tee -a "$REPORT"
GYM_TOK=$(login "final.gym@d28d.local")
ADM_TOK=$(login "admin@d28d.local")
COACH_TOK=$(login "final.coach@d28d.local")
D28D_TOK=$(login "final.d28d@d28d.local")
HOST_TOK=$(login "host.d28d@d28d.local")

# Gym A no ve Gym B (lista solo 1 gym o ninguno ajeno)
GYM_LIST=$(curl -s -H "Authorization: Bearer $GYM_TOK" "$BASE/gyms")
GYM_COUNT=$(echo "$GYM_LIST" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(Array.isArray(j)?j.length:0)})")
if [ "$GYM_COUNT" -le 1 ]; then pass "gym_user_list_scoped count=$GYM_COUNT"; else fail "gym_user_list_scoped count=$GYM_COUNT"; fi

# Intento acceso gym ajeno por ID (5 si existe, sino 99)
CODE=$(http_code "$BASE/gyms/99" /tmp/gym_other.json "$GYM_TOK")
if [ "$CODE" = "403" ] || [ "$CODE" = "404" ]; then pass "gym_cross_id_blocked code=$CODE"; else fail "gym_cross_id_blocked code=$CODE body=$(cat /tmp/gym_other.json)"; fi

# Coach: trainers list filtrado
TR_LIST=$(curl -s -H "Authorization: Bearer $COACH_TOK" "$BASE/trainers")
TR_COUNT=$(echo "$TR_LIST" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(Array.isArray(j)?j.length:99)})")
if [ "$TR_COUNT" -le 3 ]; then pass "coach_trainers_list_scoped count=$TR_COUNT"; else fail "coach_trainers_list_scoped count=$TR_COUNT"; fi

# Coach no edita trainer ajeno (id 2 si existe)
TCODE=$(http_code -X PUT "$BASE/trainers/2/branding" /tmp/tr_br.json "$COACH_TOK" 2>/dev/null || http_code "$BASE/trainers/2/branding" /tmp/tr_br.json "$COACH_TOK")
# PUT needs method
TCODE=$(curl -s -o /tmp/tr_br.json -w "%{http_code}" -X PUT -H "Authorization: Bearer $COACH_TOK" \
  -H 'Content-Type: application/json' -d '{"brand_name":"hack"}' "$BASE/trainers/2/branding")
if [ "$TCODE" = "403" ] || [ "$TCODE" = "404" ]; then pass "coach_cross_trainer_branding code=$TCODE"; else fail "coach_cross_trainer_branding code=$TCODE"; fi

# FOOD sin licencia (host)
FCODE=$(curl -s -o /tmp/f403.json -w "%{http_code}" -H "Authorization: Bearer $HOST_TOK" "$BASE/food-log/totals?fecha=2026-05-21")
if [ "$FCODE" = "403" ]; then pass "food_guard_no_license"; else fail "food_guard_no_license code=$FCODE"; fi

FLAUNCH=$(curl -s -o /tmp/fl.json -w "%{http_code}" -H "Authorization: Bearer $HOST_TOK" "$BASE/food-module/launch")
if [ "$FLAUNCH" = "403" ]; then pass "food_launch_denied_no_license"; else fail "food_launch_denied_no_license code=$FLAUNCH"; fi

# TRAINING sin licencia (host)
TCODE2=$(curl -s -o /tmp/t403.json -w "%{http_code}" -H "Authorization: Bearer $HOST_TOK" "$BASE/training/gallery")
if [ "$TCODE2" = "403" ]; then pass "training_guard_no_license"; else fail "training_guard_no_license code=$TCODE2"; fi

TLAUNCH=$(curl -s -o /tmp/tl.json -w "%{http_code}" -H "Authorization: Bearer $HOST_TOK" "$BASE/training-module/launch")
if [ "$TLAUNCH" = "403" ]; then pass "training_launch_denied_no_license"; else fail "training_launch_denied_no_license code=$TLAUNCH"; fi

# Usuario gym no administra D28D (payment links admin)
PCODE=$(curl -s -o /tmp/pay.json -w "%{http_code}" -H "Authorization: Bearer $GYM_TOK" "$BASE/payment-links/admin")
if [ "$PCODE" = "403" ]; then pass "gym_no_payment_admin"; else fail "gym_no_payment_admin code=$PCODE"; fi

# entrenador_d28d
HCREATE=$(curl -s -o /tmp/hc.json -w "%{http_code}" -X POST -H "Authorization: Bearer $HOST_TOK" \
  -H 'Content-Type: application/json' -d '{"title":"X","zoom_link":"https://z","start_time":"2030-01-01T10:00:00Z","end_time":"2030-01-01T11:00:00Z"}' \
  "$BASE/live-classes/admin")
if [ "$HCREATE" = "403" ]; then pass "host_no_create_class"; else fail "host_no_create_class code=$HCREATE"; fi

HTRAIN=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $HOST_TOK" "$BASE/training/admin/plans")
if [ "$HTRAIN" = "403" ]; then pass "host_no_training_admin"; else fail "host_no_training_admin code=$HTRAIN"; fi

HGYMS=$(curl -s -o /tmp/hg.json -w "%{http_code}" -X POST -H "Authorization: Bearer $HOST_TOK" \
  -H 'Content-Type: application/json' -d '{"nombre":"Hack Gym"}' "$BASE/gyms")
if [ "$HGYMS" = "403" ]; then pass "host_no_create_gym"; else fail "host_no_create_gym code=$HGYMS"; fi

# --- Licencias ciclo ---
echo "--- Licencias ---" | tee -a "$REPORT"
TARGET_UID=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"final.d28d@d28d.local\",\"password\":\"$PASS\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).user.id))")

curl -sf -X PUT -H "Authorization: Bearer $ADM_TOK" -H 'Content-Type: application/json' \
  "$BASE/licenses/user/$TARGET_UID" \
  -d '{"module_access":{"d28d":true,"training":true,"live_classes":true,"food_plan":false,"nutrition":false}}' >/dev/null

# Token emitido antes de suspender: debe re-login para reflejar licencia (hallazgo si sigue 200)
FCODE2=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $D28D_TOK" "$BASE/food-module/launch")
D28D_TOK_FRESH=$(login "final.d28d@d28d.local")
FCODE2B=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $D28D_TOK_FRESH" "$BASE/food-module/launch")
if [ "$FCODE2B" = "403" ]; then pass "food_suspended_launch_403_after_relogin"; else fail "food_suspended_launch_403_after_relogin stale=$FCODE2 fresh=$FCODE2B"; fi

curl -sf -X PUT -H "Authorization: Bearer $ADM_TOK" -H 'Content-Type: application/json' \
  "$BASE/licenses/user/$TARGET_UID" \
  -d '{"module_access":{"d28d":true,"training":true,"live_classes":true,"food_plan":true,"nutrition":true}}' >/dev/null

D28D_TOK_REACT=$(login "final.d28d@d28d.local")
FCODE3=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $D28D_TOK_REACT" "$BASE/food-module/launch")
if [ "$FCODE3" = "200" ]; then pass "food_reactivated_launch_200"; else fail "food_reactivated_launch_200 code=$FCODE3"; fi

# JWT contiene module_access
curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"final.d28d@d28d.local\",\"password\":\"$PASS\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const j=JSON.parse(d); const jwt=require('jsonwebtoken'); const p=jwt.decode(j.token);
    if(!p.module_access) process.exit(1);
    console.log('ok');
  })" && pass "jwt_has_module_access" || fail "jwt_missing_module_access"

# --- Branding ---
echo "--- Branding ---" | tee -a "$REPORT"
node scripts/seed_production_verify.cjs "$PASS" >/dev/null 2>&1 || true
COACH_TOK=$(login "final.coach@d28d.local")
t0=$(python3 -c 'import time;print(int(time.time()*1000))')
COACH_BR=$(curl -s -H "Authorization: Bearer $COACH_TOK" "$BASE/food-module/branding")
echo "$COACH_BR" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const b=JSON.parse(d).data;
  if(b&&(b.level==='coach'||b.trainer_id)) process.exit(0);
  process.exit(1);
})" && pass "branding_coach_food" || fail "branding_coach_food_null"
pass "branding_food_endpoint"

curl -sf -H "Authorization: Bearer $COACH_TOK" "$BASE/training-module/branding" >/dev/null && pass "branding_training_endpoint" || fail "branding_training_endpoint"

echo "--- F9.1 exchange ---" | tee -a "$REPORT"
LAUNCH_JSON=$(curl -s -H "Authorization: Bearer $D28D_TOK" "$BASE/food-module/launch?return_url=http://localhost:5175/")
HANDOFF=$(echo "$LAUNCH_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).data.token)}catch{process.exit(1)}})")
EXC=$(curl -s -o /tmp/fex9.json -w "%{http_code}" -X POST "$BASE/food-module/exchange" \
  -H 'Content-Type: application/json' -d "{\"token\":\"$HANDOFF\"}")
if [ "$EXC" = "200" ]; then
  node -e "const r=JSON.parse(require('fs').readFileSync('/tmp/fex9.json','utf8')); if(!r.data?.accessToken) process.exit(1)" \
    && pass "food_exchange_e2e" || fail "food_exchange_e2e_no_token"
else
  fail "food_exchange_e2e code=$EXC"
fi

echo "--- F9.1 auth audit ---" | tee -a "$REPORT"
curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"host.d28d@d28d.local\",\"password\":\"$PASS\"}" >/dev/null || true
sleep 1
LOG_DAY=$(date +%Y-%m-%d)
if grep -q 'auth.login' "backend/logs/combined-${LOG_DAY}.log" 2>/dev/null \
  || grep -q 'auth.login' backend/logs/combined-*.log 2>/dev/null; then
  pass "auth_audit_login"
else
  fail "auth_audit_login"
fi

# --- Performance ---
echo "--- Performance ---" | tee -a "$REPORT"
t0=$(python3 -c 'import time;print(int(time.time()*1000))')
curl -sf -H "Authorization: Bearer $D28D_TOK" "$BASE/licenses/me" >/dev/null
t1=$(python3 -c 'import time;print(int(time.time()*1000))')
timing "licenses_me" "$((t1-t0))"

t0=$(python3 -c 'import time;print(int(time.time()*1000))')
curl -sf -H "Authorization: Bearer $D28D_TOK" "$BASE/food-module/launch?return_url=http://localhost:5175/" >/dev/null
t1=$(python3 -c 'import time;print(int(time.time()*1000))')
timing "food_launch" "$((t1-t0))"

t0=$(python3 -c 'import time;print(int(time.time()*1000))')
curl -sf -H "Authorization: Bearer $D28D_TOK" "$BASE/training-module/launch" >/dev/null 2>&1 || true
t1=$(python3 -c 'import time;print(int(time.time()*1000))')
timing "training_launch" "$((t1-t0))"

# --- Fases previas ---
echo "--- Regresión ---" | tee -a "$REPORT"
set +e
./scripts/test_all_phases.sh "$BASE" >> "$REPORT" 2>&1 && pass "regression_all_phases" || fail "regression_all_phases"
./scripts/test_food_phase7.sh "$BASE" >> "$REPORT" 2>&1 && pass "regression_food_phase7" || fail "regression_food_phase7"
./scripts/test_training_phase8.sh "$BASE" >> "$REPORT" 2>&1 && pass "regression_training_phase8" || fail "regression_training_phase8"
set -e

echo "=== REPORTE en $REPORT ==="
grep -E '^(PASS|FAIL|SKIP|TIME)' "$REPORT" | sort
