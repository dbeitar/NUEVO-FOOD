#!/usr/bin/env bash
# Pruebas Fases 1-6. Requiere backend en marcha y semilla aplicada.
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"

login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token)throw new Error(d);console.log(j.token)})"
}

echo "=== F1 entrenador_d28d ==="
./scripts/test_d28d_host_role.sh "$BASE" || exit 1

echo "=== F2 licencias ==="
TOK=$(login "final.d28d@d28d.local")
curl -sf -H "Authorization: Bearer $TOK" "$BASE/licenses/me" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  const m=j.data?.module_access||{};
  if(!m.d28d) throw new Error('falta licencia d28d');
  console.log('OK licenses/me', Object.keys(m).filter(k=>m[k]).join(','));
})"

echo "=== F5 payment links public ==="
curl -sf "$BASE/payment-links/public" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK payment-links/public');
"

echo "=== F3 gym user ==="
GYM=$(login "final.gym@d28d.local")
curl -sf -H "Authorization: Bearer $GYM" "$BASE/licenses/me" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const m=JSON.parse(d).data?.module_access||{};
  if(!m.gym && !m.d28d) throw new Error('gym sin modulos');
  console.log('OK gym modules');
})"

echo "=== ALL PHASES API OK ==="
