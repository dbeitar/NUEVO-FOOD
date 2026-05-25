#!/usr/bin/env bash
# Escribe credenciales Zoom D28D en backend/.env (archivo gitignored).
# Ejecutar una vez: bash scripts/apply_d28d_zoom_env.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

touch "$ENV_FILE"

upsert() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    if [[ "$(uname)" == Darwin ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    fi
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

upsert D28D_ZOOM_TIMEZONE America/Mexico_City
upsert D28D_ZOOM_EMAIL_VITAL D28dvital@gmail.com
upsert D28D_ZOOM_PASSWORD_VITAL 'TATIANA123tatiana.456'
upsert D28D_ZOOM_EMAIL_PANCITAS Pancitasfitbyd28d@gmail.com
upsert D28D_ZOOM_PASSWORD_PANCITAS 'ALEJO123alejo.456'
upsert D28D_ZOOM_EMAIL_VIRTUAL_1 D28dzoom1@gmail.com
upsert D28D_ZOOM_PASSWORD_VIRTUAL_1 'ALEJO123alejo.456'
upsert D28D_ZOOM_EMAIL_VIRTUAL_2 d28dzoom2@gmail.com
upsert D28D_ZOOM_PASSWORD_VIRTUAL_2 'ALEJO12alejo.34'

echo "OK: variables Zoom D28D aplicadas en $ENV_FILE"
echo "Siguiente paso: configurar ZOOM_S2S_* en el mismo archivo para generar enlaces por API."
