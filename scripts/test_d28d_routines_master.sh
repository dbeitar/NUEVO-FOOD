#!/usr/bin/env bash
# Maestro de Rutinas D28D — pruebas 1-8 del spec
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_BASE:-http://localhost:3002/api}"
EMAIL="${ADMIN_EMAIL:-admin@d28d.local}"
PASS="${ADMIN_PASS:-Demo!2026}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

login() {
  TOKEN=$(curl -sS -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.token){console.error(d);process.exit(1)};process.stdout.write(j.token)})")
  [[ -n "${TOKEN:-}" ]] || fail "login"
}

echo "=== Maestro Rutinas D28D ==="
login
hdr=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json')

# 8 Import
IMP=$(curl -sS -X POST "$API/d28d/routines/import/bundled" "${hdr[@]}")
echo "$IMP" | grep -q '"success":true' || fail "import"
pass "8 importar rutinas D28D"

# 1 Create
CREATE=$(curl -sS -X POST "$API/d28d/routines" "${hdr[@]}" -d '{
  "nombre":"Test Rutina Auto",
  "categoria":"Especiales",
  "nivel":"test",
  "descripcion":"Prueba script",
  "blocks":[{"tipo":"TABATA","orden":0,"nombre":"T1","config":{"rounds":4},"exercises":[{"nombre":"Burpees","orden":0,"repeticiones":"10"}]}]
}')
RID=$(echo "$CREATE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=JSON.parse(d).data?.id;process.stdout.write(id!=null?String(id):'')})")
[[ -n "$RID" ]] || fail "create"
pass "1 crear rutina id=$RID"

# 2 Edit
curl -sS -X PUT "$API/d28d/routines/$RID" "${hdr[@]}" -d '{"descripcion":"Editada"}' | grep -q '"success":true' || fail "edit"
pass "2 editar rutina"

# 3 Version
VER=$(curl -sS -X PUT "$API/d28d/routines/$RID?new_version=true" "${hdr[@]}" -d '{"descripcion":"v2"}')
VID=$(echo "$VER" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=JSON.parse(d).data?.id;process.stdout.write(id!=null?String(id):'')})")
echo "$VER" | grep -q '"version":2' || fail "version"
pass "3 versionar rutina id=$VID"

# 6 Duplicate
DUP=$(curl -sS -X POST "$API/d28d/routines/$VID/duplicate" "${hdr[@]}")
DID=$(echo "$DUP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=JSON.parse(d).data?.id;process.stdout.write(id!=null?String(id):'')})")
[[ -n "$DID" ]] || fail "duplicate"
pass "6 duplicar rutina id=$DID"

# 4 Programar clase con rutina
START=$(date -u -v+2d +"%Y-%m-%dT10:00:00" 2>/dev/null || date -u -d '+2 days' +"%Y-%m-%dT10:00:00" 2>/dev/null || echo "2026-06-01T10:00:00")
END=$(date -u -v+2d +"%Y-%m-%dT11:00:00" 2>/dev/null || date -u -d '+2 days' +"%Y-%m-%dT11:00:00" 2>/dev/null || echo "2026-06-01T11:00:00")
CLS=$(curl -sS -X POST "$API/live-classes/admin" "${hdr[@]}" -d "{
  \"zoom_link\":\"https://zoom.us/j/test-routine\",
  \"start_time\":\"$START\",
  \"end_time\":\"$END\",
  \"d28d_routine_id\":$VID,
  \"is_global\":true
}")
CID=$(echo "$CLS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const id=JSON.parse(d).data?.id;process.stdout.write(id!=null?String(id):'')})")
echo "$CLS" | grep -q 'd28d_routine' || fail "schedule class"
pass "4 programar clase con rutina id=$CID"

# 5 Visualizar en clase (admin list enriquecido)
VIEW=$(curl -sS "$API/live-classes/admin" "${hdr[@]}")
echo "$VIEW" | grep -q 'd28d_routine' || fail "host view data"
pass "5 visualizar rutina en clase en vivo"

# 7 Archive
curl -sS -X POST "$API/d28d/routines/$DID/archive" "${hdr[@]}" | grep -q 'archivada' || fail "archive"
pass "7 archivar rutina"

echo "=== Todas las pruebas del maestro de rutinas OK ==="
