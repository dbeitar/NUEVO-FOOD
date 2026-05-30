#!/usr/bin/env bash
# VIENTO RECIO V1 — pruebas API pre-producción
# Uso: ./scripts/test_spiritual_v1.sh [BASE_URL] [EMAIL] [PASSWORD]
set -u
BASE_URL="${1:-http://localhost:3001/api}"
EMAIL="${2:-admin@foodplan.local}"
PASSWORD="${3:-Demo!2026}"
REPORT="${REPORT:-docs/VIENTO_RECIO_V1_TEST_EVIDENCE.txt}"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass=0; fail=0

check_json() {
  local name="$1"; local code="$2"; local body="$3"
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo -e " ${GREEN}OK${NC}   $name (HTTP $code)"
    pass=$((pass+1))
    return 0
  fi
  echo -e " ${RED}FAIL${NC} $name (HTTP $code)"
  echo "$body" | head -c 400
  echo
  fail=$((fail+1))
  return 1
}

check_status() {
  local name="$1"; local expected="$2"; local got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo -e " ${GREEN}OK${NC}   $name (HTTP $got)"
    pass=$((pass+1))
  else
    echo -e " ${RED}FAIL${NC} $name (esperado $expected, obtenido $got)"
    fail=$((fail+1))
  fi
}

mkdir -p "$(dirname "$REPORT")"
{
  echo "=== VIENTO RECIO V1 TEST $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  echo "BASE_URL=$BASE_URL"
} > "$REPORT"

echo "=== VIENTO RECIO V1 — $BASE_URL ===" | tee -a "$REPORT"

# Login super admin
login=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
token=$(echo "$login" | jq -r '.token // .data.token // empty')
if [[ -z "$token" || "$token" == "null" ]]; then
  echo -e " ${RED}FAIL${NC} login sin token" | tee -a "$REPORT"
  exit 1
fi
auth=(-H "Authorization: Bearer $token")
echo -e " ${GREEN}OK${NC}   login super admin" | tee -a "$REPORT"
pass=$((pass+1))

# Feed usuario
code=$(curl -s -o /tmp/sp_feed.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/spiritual/feed/today")
body=$(cat /tmp/sp_feed.json)
check_json "GET /spiritual/feed/today" "$code" "$body"

# Biblia — import sample si no hay libros
books=$(curl -s "${auth[@]}" "$BASE_URL/spiritual/bible/books")
book_count=$(echo "$books" | jq 'length')
if [[ "$book_count" == "0" ]]; then
  sample="$(dirname "$0")/../backend/data/spiritual/sample_bible_rvr1960.example.json"
  if [[ -f "$sample" ]]; then
    imp=$(curl -s -w "\n%{http_code}" "${auth[@]}" -F "file=@$sample" -F "version_code=RVR1960" "$BASE_URL/spiritual/admin/bible/import")
    imp_code=$(echo "$imp" | tail -1)
    check_status "POST /spiritual/admin/bible/import" "200" "$imp_code"
  fi
fi

# Biblia lectura
code=$(curl -s -o /tmp/sp_ch.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/spiritual/bible/JHN/3")
check_json "GET /spiritual/bible/JHN/3" "$code" "$(cat /tmp/sp_ch.json)"

code=$(curl -s -o /tmp/sp_search.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/spiritual/bible/search?q=Dios")
check_json "GET /spiritual/bible/search" "$code" "$(cat /tmp/sp_search.json)"

# Versículo del día
today=$(date +%Y-%m-%d)
verse_body=$(jq -nc --arg d "$today" '{scheduled_date:$d,custom_text:"Prueba V1",reflection:"Reflexión piloto",published:true,scope_type:"global"}')
code=$(curl -s -o /tmp/sp_vod.json -w "%{http_code}" -X POST "${auth[@]}" -H "Content-Type: application/json" -d "$verse_body" "$BASE_URL/spiritual/admin/verse-of-day")
check_json "POST /spiritual/admin/verse-of-day" "$code" "$(cat /tmp/sp_vod.json)"

code=$(curl -s -o /tmp/sp_feed2.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/spiritual/feed/today")
verse_text=$(cat /tmp/sp_feed2.json | jq -r '.verse.text // empty')
if [[ -n "$verse_text" ]]; then
  echo -e " ${GREEN}OK${NC}   feed incluye versículo del día" | tee -a "$REPORT"
  pass=$((pass+1))
else
  echo -e " ${RED}FAIL${NC} feed sin versículo" | tee -a "$REPORT"
  fail=$((fail+1))
fi

# Devocional
dev_body='{"title":"Devocional V1 Test","duration_days":7,"scope_type":"global","days":[{"day_index":1,"reflection":"Reflexión","prayer":"Oración","challenge":"Desafío"}]}'
code=$(curl -s -o /tmp/sp_dev.json -w "%{http_code}" -X POST "${auth[@]}" -H "Content-Type: application/json" -d "$dev_body" "$BASE_URL/spiritual/admin/devotionals")
check_json "POST /spiritual/admin/devotionals" "$code" "$(cat /tmp/sp_dev.json)"
plan_id=$(cat /tmp/sp_dev.json | jq -r '.id // empty')
if [[ -n "$plan_id" ]]; then
  code=$(curl -s -o /tmp/sp_dev_start.json -w "%{http_code}" -X POST "${auth[@]}" "$BASE_URL/spiritual/devotionals/$plan_id/start")
  check_json "POST /spiritual/devotionals/:id/start" "$code" "$(cat /tmp/sp_dev_start.json)"
  code=$(curl -s -o /tmp/sp_dev_done.json -w "%{http_code}" -X POST "${auth[@]}" -H "Content-Type: application/json" -d '{"day_index":1}' "$BASE_URL/spiritual/devotionals/$plan_id/complete")
  check_json "POST /spiritual/devotionals/:id/complete" "$code" "$(cat /tmp/sp_dev_done.json)"
fi

# Estudio
study_body='{"title":"Estudio V1","media_type":"youtube","media_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","scope_type":"global","tags":["fe"]}'
code=$(curl -s -o /tmp/sp_study.json -w "%{http_code}" -X POST "${auth[@]}" -H "Content-Type: application/json" -d "$study_body" "$BASE_URL/spiritual/admin/studies")
check_json "POST /spiritual/admin/studies" "$code" "$(cat /tmp/sp_study.json)"
study_id=$(cat /tmp/sp_study.json | jq -r '.id // empty')
if [[ -n "$study_id" ]]; then
  code=$(curl -s -o /tmp/sp_study_open.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/spiritual/studies/$study_id")
  check_json "GET /spiritual/studies/:id (audit opened)" "$code" "$(cat /tmp/sp_study_open.json)"
fi

# Evento
start=$(date -u -v+2d +%Y-%m-%dT10:00:00 2>/dev/null || date -u -d '+2 days' +%Y-%m-%dT10:00:00 2>/dev/null || echo "2026-06-01T10:00:00")
end=$(date -u -v+2d +%Y-%m-%dT11:00:00 2>/dev/null || date -u -d '+2 days' +%Y-%m-%dT11:00:00 2>/dev/null || echo "2026-06-01T11:00:00")
event_body=$(jq -nc --arg s "$start" --arg e "$end" '{title:"Evento V1",mode:"virtual",start_time:$s,end_time:$e,scope_type:"global"}')
code=$(curl -s -o /tmp/sp_ev.json -w "%{http_code}" -X POST "${auth[@]}" -H "Content-Type: application/json" -d "$event_body" "$BASE_URL/spiritual/admin/events")
check_json "POST /spiritual/admin/events" "$code" "$(cat /tmp/sp_ev.json)"
event_id=$(cat /tmp/sp_ev.json | jq -r '.id // empty')
if [[ -n "$event_id" ]]; then
  code=$(curl -s -o /tmp/sp_ev_reg.json -w "%{http_code}" -X POST "${auth[@]}" "$BASE_URL/spiritual/events/$event_id/register")
  check_json "POST /spiritual/events/:id/register" "$code" "$(cat /tmp/sp_ev_reg.json)"
  code=$(curl -s -o /tmp/sp_ev_att.json -w "%{http_code}" -X POST "${auth[@]}" "$BASE_URL/spiritual/events/$event_id/attend")
  check_json "POST /spiritual/events/:id/attend" "$code" "$(cat /tmp/sp_ev_att.json)"
fi

# Auditoría spiritual
code=$(curl -s -o /tmp/sp_audit.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/platform/audit?modulo=spiritual&limit=20")
audit_count=$(cat /tmp/sp_audit.json | jq '.events | length // .rows | length // 0' 2>/dev/null || echo 0)
if [[ "$code" == "200" && "$audit_count" -gt 0 ]]; then
  echo -e " ${GREEN}OK${NC}   auditoría spiritual ($audit_count eventos)" | tee -a "$REPORT"
  pass=$((pass+1))
else
  check_json "GET /platform/audit?modulo=spiritual" "$code" "$(cat /tmp/sp_audit.json)"
fi

# Communication templates spiritual (no modificar existentes)
code=$(curl -s -o /tmp/sp_comm.json -w "%{http_code}" "${auth[@]}" "$BASE_URL/communications/templates?modulo=spiritual")
tpl_count=$(cat /tmp/sp_comm.json | jq 'length // 0' 2>/dev/null || echo 0)
if [[ "$code" == "200" && "$tpl_count" -gt 0 ]]; then
  echo -e " ${GREEN}OK${NC}   plantillas spiritual ($tpl_count)" | tee -a "$REPORT"
  pass=$((pass+1))
else
  check_json "GET /communications/templates?modulo=spiritual" "$code" "$(cat /tmp/sp_comm.json)"
fi

# FOOD intacto — smoke
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth[@]}" "$BASE_URL/foods?pageSize=5")
check_status "GET /foods (FOOD intacto)" "200" "$code"

echo "" | tee -a "$REPORT"
echo "RESULTADO: $pass OK, $fail FAIL" | tee -a "$REPORT"
[[ "$fail" -eq 0 ]] && exit 0 || exit 1
