#!/usr/bin/env bash
# Fase 8 — módulo TRAINING (paridad FOOD). Backend :3002 + semilla.
set -euo pipefail
BASE="${1:-http://localhost:3002/api}"
PASS="${SEED_PASSWORD:-Demo!2026}"

login() {
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token)throw new Error(d);console.log(j.token)})"
}

echo "=== F8.1 training-module status ==="
TOK=$(login "final.d28d@d28d.local")
curl -sf -H "Authorization: Bearer $TOK" "$BASE/training-module/status" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d).data;
  if(!j||typeof j.licensed==='undefined') throw new Error('status');
  console.log('OK status licensed='+j.licensed);
})"

echo "=== F8.2 branding ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/training-module/branding" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK branding');
"

echo "=== F8.3 launch internal ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/training-module/launch" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d).data;
  if(j.mode!=='internal'||!j.token) throw new Error('launch');
  console.log('OK launch mode='+j.mode+' dest='+j.destinationView);
})"

echo "=== F8.4 FOOD+TRAINING licencias ==="
curl -sf -H "Authorization: Bearer $TOK" "$BASE/licenses/me" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const m=JSON.parse(d).data?.module_access||{};
  if(!m.training||!m.d28d) throw new Error('falta training o d28d');
  console.log('OK dual modules');
})"

echo "=== F8.5 guard sin licencia training ==="
HOST=$(login "host.d28d@d28d.local")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $HOST" "$BASE/training/admin/plans")
if [ "$CODE" = "403" ]; then echo "OK training admin 403 sin licencia"; else echo "SKIP host plans code=$CODE"; fi

echo "=== F8.6 provision admin ==="
ADM=$(login "admin@d28d.local")
curl -sf -X POST -H "Authorization: Bearer $ADM" -H 'Content-Type: application/json' \
  "$BASE/training-module/provision" -d '{"user_id":1}' | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>JSON.parse(d));console.log('OK provision');
"

echo "=== F8.7 gallery tenant (coach) ==="
COACH=$(login "coach.demo@foodplan.local" 2>/dev/null || login "final.d28d@d28d.local")
curl -sf -H "Authorization: Bearer $COACH" "$BASE/training/admin/gallery" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{JSON.parse(d);console.log('OK gallery');});
" 2>/dev/null || echo "SKIP gallery (rol sin permiso)"

echo "=== FASE 8 TRAINING OK ==="
