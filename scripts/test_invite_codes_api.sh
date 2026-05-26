#!/usr/bin/env bash
# Verifica listado y edición de códigos invite (gyms/trainers/D28D).
set -euo pipefail
BASE_URL="${1:-http://localhost:3001/api}"
EMAIL="${2:-admin@d28d.local}"
PASSWORD="${3:-Demo!2026}"

login=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
token=$(echo "$login" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token||'')}catch(e){console.log('')}})")

if [ -z "$token" ]; then
  echo "FAIL login"
  exit 1
fi
echo "OK login"

meta=$(curl -s "$BASE_URL/admin/invite-codes" -H "Authorization: Bearer $token")
echo "$meta" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  const gyms=(j.gyms||[]).filter(g=>g.invite_code);
  const trainers=(j.trainers||[]).filter(t=>t.invite_code);
  console.log('D28D:', (j.d28d_codes||[]).join(', '));
  console.log('Gyms con código:', gyms.length, gyms[0]?gyms[0].invite_code:'');
  console.log('Trainers con código:', trainers.length, trainers[0]?trainers[0].invite_code:'');
  if(!gyms.length && !trainers.length) process.exit(2);
})"
echo "OK invite-codes metadata"

# Resolver un código de gym conocido
code=$(echo "$meta" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.gyms?.[0]?.invite_code||'')})")
if [ -n "$code" ]; then
  curl -s -X POST "$BASE_URL/auth/resolve-invite" -H 'Content-Type: application/json' -d "{\"code\":\"$code\"}" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  if(!j.success) { console.error('FAIL resolve', d); process.exit(3); }
  console.log('OK resolve-invite', j.data?.label||j.data?.type);
})"
fi
echo "Done."
