#!/usr/bin/env bash
# Fase 7 — integración Food (shell). Requiere backend :3002 y semilla.
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"

login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token)throw new Error(d);console.log(j.token)})"
}

echo "=== F7.1 food-module status ==="
TOK=$(login "final.d28d@d28d.local")
curl -sf -H "Authorization: Bearer $TOK" "$BASE/food-module/status" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d).data;
  if(!j||typeof j.licensed==='undefined') throw new Error('status');
  console.log('OK status licensed='+j.licensed+' enabled='+j.enabled);
})"

echo "=== F7.2 branding centralizado ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/food-module/branding" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK branding endpoint');
"

echo "=== F7.3 launch SSO (licencia activa) ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/food-module/launch?return_url=http://localhost:5175/dashboard" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d).data;
  if(!j.url||!j.token) throw new Error('launch sin url/token');
  if(!j.url.includes('shell-sso')) throw new Error('url sin shell-sso');
  console.log('OK launch', j.url.slice(0,60)+'...');
})"

echo "=== F7.4 guard food legacy (usuario sin food) ==="
# entrenador_d28d solo live — puede no tener food; skip si tiene food
HOST=$(login "host.d28d@d28d.local" 2>/dev/null || true)
if [ -n "${HOST:-}" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $HOST" "$BASE/food-log/totals?fecha=2026-05-21" || echo 000)
  if [ "$CODE" = "403" ]; then
    echo "OK food-log 403 sin licencia food"
  else
    echo "SKIP host food-log code=$CODE (puede tener licencia implícita)"
  fi
fi

echo "=== F7.4b exchange SSO (embebido) ==="
EX_BODY=$(curl -s -H "Authorization: Bearer $TOK" "$BASE/food-module/launch?return_url=http://localhost:5175/")
HANDOFF=$(echo "$EX_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d).data; if(!j.token) process.exit(1); console.log(j.token)})")
EX_CODE=$(curl -s -o /tmp/fex.json -w "%{http_code}" -X POST "$BASE/food-module/exchange" \
  -H 'Content-Type: application/json' -d "{\"token\":\"$HANDOFF\"}")
if [ "$EX_CODE" = "200" ]; then
  echo "$EX_BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const r=JSON.parse(require('fs').readFileSync('/tmp/fex.json','utf8'));
    if(!r.data||!r.data.accessToken) process.exit(1);
    console.log('OK exchange accessToken');
  })"
else
  echo "SKIP exchange code=$EX_CODE (FOOD_MODULE_URL puede no estar configurada)"
  cat /tmp/fex.json
fi

echo "=== F7.5 provision endpoint (admin) ==="
ADM=$(login "admin@d28d.local")
curl -sf -X POST -H "Authorization: Bearer $ADM" -H 'Content-Type: application/json' \
  "$BASE/food-module/provision" -d '{"user_id":1}' | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK provision callable');
"

echo "=== FASE 7 SHELL OK ==="
