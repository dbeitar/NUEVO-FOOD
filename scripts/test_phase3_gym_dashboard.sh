#!/usr/bin/env bash
# Fase 3: producto GYM en dashboard + licencia dual-read. Uso: ./scripts/test_phase3_gym_dashboard.sh [BASE_URL]
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"

login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token)throw new Error(d);console.log(j.token)})"
}

echo "== Gym admin: licencias =="
GYM=$(login "final.gym@d28d.local")
curl -sf -H "Authorization: Bearer $GYM" "$BASE/licenses/me" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const m=JSON.parse(d).data?.module_access||{};
  if(!m.gym) throw new Error('falta licencia gym');
  if(!m.d28d) throw new Error('falta licencia d28d');
  console.log('OK gym+d28d', Object.keys(m).filter(k=>m[k]).join(','));
})"

echo "== Solo D28D crea gym =="
GYM_TOKEN=$(login "final.gym@d28d.local")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/gyms" \
  -H "Authorization: Bearer $GYM_TOKEN" -H 'Content-Type: application/json' \
  -d '{"nombre":"X","email":"x@test.com","ciudad":"Bogota"}')
test "$CODE" = "403" && echo "OK gym admin no crea sedes"

D28D=$(login "admin.d28d@d28d.local")
curl -sf -X POST "$BASE/gyms" -H "Authorization: Bearer $D28D" -H 'Content-Type: application/json' \
  -d '{"nombre":"Test Phase3","email":"phase3-gym@test.local","ciudad":"Bogota"}' | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const g=JSON.parse(d).gym||JSON.parse(d).data;
  if(!g.invite_code) throw new Error('sin invite_code');
  console.log('OK creado invite', g.invite_code);
})"

echo "=== FASE 3 API OK ==="
