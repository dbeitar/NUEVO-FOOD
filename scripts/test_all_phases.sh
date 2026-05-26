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

echo "=== F3 gym user ==="
GYM=$(login "final.gym@d28d.local")
curl -sf -H "Authorization: Bearer $GYM" "$BASE/licenses/me" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const m=JSON.parse(d).data?.module_access||{};
  if(!m.gym && !m.d28d) throw new Error('gym sin modulos');
  console.log('OK gym modules');
})"

echo "=== F4 branding gym fields ==="
ADM=$(login "admin@d28d.local")
curl -sf -H "Authorization: Bearer $ADM" "$BASE/gyms" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const gyms=JSON.parse(d);
  if(!Array.isArray(gyms)||!gyms.length) throw new Error('sin gyms');
  const g=gyms[0];
  if(!('favicon_url' in g) && !('faviconUrl' in g)) throw new Error('falta favicon en gym');
  console.log('OK gym branding shape');
})"

echo "=== F5 payment links public ==="
curl -sf "$BASE/payment-links/public" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK payment-links/public');
"

echo "=== F6 food-module status + training (licencia) ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/food-module/status" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  if(!j.data||typeof j.data.enabled==='undefined') throw new Error('food-module/status');
  console.log('OK food-module/status enabled='+j.data.enabled);
})"
curl -sf -H "Authorization: Bearer $TOK" "$BASE/training/gallery" -o /dev/null
echo "OK training/gallery con licencia"

echo "=== ALL PHASES API OK ==="
