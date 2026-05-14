#!/usr/bin/env bash
# ============================================================================
# Smoke test rápido de endpoints clave del backend D28D.
# Uso:
#   ./scripts/smoke_test_api.sh [BASE_URL] [EMAIL] [PASSWORD]
# Por defecto:
#   BASE_URL = http://localhost:3001/api
#   EMAIL    = admin@foodplan.local
#   PASSWORD = Demo!2026
# Requiere: curl, jq.
# ============================================================================
set -u
BASE_URL="${1:-http://localhost:3001/api}"
EMAIL="${2:-admin@foodplan.local}"
PASSWORD="${3:-Demo!2026}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
pass=0; fail=0

check() {
  local name="$1"; local expected="$2"; local got="$3"
  if [[ "$got" == "$expected" ]]; then
    echo -e " ${GREEN}OK${NC}   $name (HTTP $got)"
    pass=$((pass+1))
  else
    echo -e " ${RED}FAIL${NC} $name (esperado $expected, obtenido $got)"
    fail=$((fail+1))
  fi
}

echo "=== Smoke test contra $BASE_URL ==="

# 1. Health
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
check "GET /api/health" 200 "$code"

# 2. Login
login=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"clave\":\"$PASSWORD\"}")
token=$(echo "$login" | jq -r '.token // .data.token // empty')
if [[ -z "$token" || "$token" == "null" ]]; then
  echo -e " ${RED}FAIL${NC} POST /api/auth/login (sin token en respuesta)"
  echo "$login" | head -c 300; echo
  fail=$((fail+1))
else
  echo -e " ${GREEN}OK${NC}   POST /api/auth/login (token recibido)"
  pass=$((pass+1))
fi

auth_h=(-H "Authorization: Bearer $token")

# 3. Perfil
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_h[@]}" "$BASE_URL/auth/profile")
check "GET /api/auth/profile" 200 "$code"

# 4. Listado admin de usuarios (espera 200 para super_admin; 403 para gym)
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_h[@]}" "$BASE_URL/admin/users")
if [[ "$code" == "200" || "$code" == "403" ]]; then
  echo -e " ${GREEN}OK${NC}   GET /api/admin/users (HTTP $code)"; pass=$((pass+1))
else
  echo -e " ${RED}FAIL${NC} GET /api/admin/users (HTTP $code)"; fail=$((fail+1))
fi

# 5. Catálogo de alimentos
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_h[@]}" "$BASE_URL/foods?pageSize=10")
check "GET /api/foods" 200 "$code"

# 6. generateRecipe deshabilitado por defecto
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${auth_h[@]}" \
  -H "Content-Type: application/json" -d '{}' \
  "$BASE_URL/ai/generate-recipe")
check "POST /api/ai/generate-recipe (debe estar OFF)" 404 "$code"

# 7. Validación 400 de analyzeDayBalance
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${auth_h[@]}" \
  -H "Content-Type: application/json" -d '{}' \
  "$BASE_URL/ai/analyze-day-balance")
check "POST /api/ai/analyze-day-balance (faltan body)" 400 "$code"

# 8. Programs (debe responder array)
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_h[@]}" "$BASE_URL/programs")
check "GET /api/programs" 200 "$code"

# 9. Live classes
code=$(curl -s -o /dev/null -w "%{http_code}" "${auth_h[@]}" "$BASE_URL/live-classes")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo -e " ${GREEN}OK${NC}   GET /api/live-classes (HTTP $code)"; pass=$((pass+1))
else
  echo -e " ${YELLOW}WARN${NC} GET /api/live-classes (HTTP $code)"; fail=$((fail+1))
fi

echo
echo "=== Resultado: $pass OK, $fail FAIL ==="
[[ $fail -eq 0 ]] && exit 0 || exit 1
