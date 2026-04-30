#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3001}"
OUT_DIR="${OUT_DIR:-docs/test-runs}"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$OUT_DIR/smoke-roles-$TS.log"

mkdir -p "$OUT_DIR"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT"
}

request() {
  local label="$1"; shift
  log "--- $label"
  # shellcheck disable=SC2068
  curl -sS -D - "$@" | tee -a "$OUT"
  echo "" | tee -a "$OUT"
}

token_for() {
  local email="$1"
  local password="$2"
  local codigo="${3:-D28D-OK}"
  curl -sS -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"codigo_empleado\":\"$codigo\"}" \
    | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.token||"");}catch(e){process.stdout.write("");}})'
}

log "Smoke tests roles -> $OUT"

request "health" "$BASE/api/health"

ADMIN_TOKEN="$(token_for "admin@foodplan.local" "Admin!234")"
GYMADMIN_TOKEN="$(token_for "admin.gym@test.foodplan.local" "GymAdmin!234")"
TRAINER_TOKEN="$(token_for "trainer@test.foodplan.local" "Trainer!234")"
USER_TOKEN="$(token_for "cliente@foodplan.local" "Admin!234")"

log "tokens acquired:"
log " - super_admin token length: ${#ADMIN_TOKEN}"
log " - admin_gimnasio token length: ${#GYMADMIN_TOKEN}"
log " - entrenador token length: ${#TRAINER_TOKEN}"
log " - usuario_final token length: ${#USER_TOKEN}"

if [[ "${#ADMIN_TOKEN}" -lt 20 || "${#GYMADMIN_TOKEN}" -lt 20 || "${#TRAINER_TOKEN}" -lt 20 || "${#USER_TOKEN}" -lt 20 ]]; then
  log "ERROR: one or more tokens missing; check credentials or server logs."
  exit 2
fi

# Profiles
request "profile super_admin" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/api/auth/profile"
request "profile admin_gimnasio" -H "Authorization: Bearer $GYMADMIN_TOKEN" "$BASE/api/auth/profile"
request "profile entrenador" -H "Authorization: Bearer $TRAINER_TOKEN" "$BASE/api/auth/profile"
request "profile usuario_final" -H "Authorization: Bearer $USER_TOKEN" "$BASE/api/auth/profile"

# Admin overview (should be allowed for super_admin and admin_gimnasio)
request "admin/overview as super_admin (expect 200)" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/api/admin/overview"
request "admin/overview as admin_gimnasio (expect 200)" -H "Authorization: Bearer $GYMADMIN_TOKEN" "$BASE/api/admin/overview"
request "admin/overview as entrenador (expect 403)" -H "Authorization: Bearer $TRAINER_TOKEN" "$BASE/api/admin/overview"
request "admin/overview as usuario_final (expect 403)" -H "Authorization: Bearer $USER_TOKEN" "$BASE/api/admin/overview"

# Trainers create: allowed for super_admin/admin_gimnasio, forbidden for entrenador/usuario_final
CREATE_TRAINER_PAYLOAD="$(node -e 'const ts=Date.now();console.log(JSON.stringify({nombre:`Smoke Trainer ${ts}`,email:`smoke.trainer.${ts}@foodplan.local`,telefono:"+57 300-1230000",especialidad:"Smoke",certificaciones:["Smoke"],experiencia_años:1,gym_id:1,horario_disponible:"L-V 6AM",tarifa_sesion:50000,capacidad_usuarios:10}));')"
request "create trainer as admin_gimnasio (expect 201)" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $GYMADMIN_TOKEN" \
  -d "$CREATE_TRAINER_PAYLOAD" "$BASE/api/trainers"
request "create trainer as entrenador (expect 403)" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TRAINER_TOKEN" \
  -d "$CREATE_TRAINER_PAYLOAD" "$BASE/api/trainers"

# Gyms create: allowed for super_admin/admin_gimnasio, forbidden for entrenador/usuario_final
CREATE_GYM_PAYLOAD="$(node -e 'const ts=Date.now();console.log(JSON.stringify({nombre:`Smoke Gym ${ts}`,email:`smoke.gym.${ts}@foodplan.local`,ciudad:"Bogotá",direccion:"Calle 1",telefono:"+57 300-5550000",pais:"Colombia"}));')"
request "create gym as admin_gimnasio (expect 201)" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $GYMADMIN_TOKEN" \
  -d "$CREATE_GYM_PAYLOAD" "$BASE/api/gyms"
request "create gym as usuario_final (expect 403)" -X POST \
  -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" \
  -d "$CREATE_GYM_PAYLOAD" "$BASE/api/gyms"

log "DONE. Review $OUT"

