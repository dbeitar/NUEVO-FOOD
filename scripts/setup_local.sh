#!/usr/bin/env bash
# Setup idempotente: clonar repo → mismo entorno que el equipo (código + DB + espiritual).
# Uso: npm run setup:local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== MVPFOOD — setup local ==="

# --- .env ---
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[setup] Creado .env desde .env.example"
fi

if [[ ! -f backend/.env ]]; then
  if [[ -f backend/.env.docker.example ]]; then
    cp backend/.env.docker.example backend/.env
  else
    cp backend/.env.example backend/.env
  fi
  echo "[setup] Creado backend/.env (revisa JWT_SECRET y DATABASE_URL)"
fi

# JWT mínimo si está vacío
if grep -q '^JWT_SECRET=$' backend/.env 2>/dev/null || ! grep -q '^JWT_SECRET=' backend/.env 2>/dev/null; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if grep -q '^JWT_SECRET=' backend/.env; then
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${SECRET}|" backend/.env && rm -f backend/.env.bak
  else
    echo "JWT_SECRET=${SECRET}" >> backend/.env
  fi
  echo "[setup] JWT_SECRET generado en backend/.env"
fi

# Alinear puertos documentados (frontend 5175, API 3002 en dev:all)
grep -q '^VITE_API_BASE_URL=' .env || echo 'VITE_API_BASE_URL=http://localhost:3002/api' >> .env
grep -q '^VITE_SPIRITUAL_WIDGETS=' .env || echo 'VITE_SPIRITUAL_WIDGETS=true' >> .env

echo "[setup] Instalando dependencias…"
npm install
npm install --prefix backend

echo "[setup] PostgreSQL (Docker)…"
if ! command -v docker >/dev/null 2>&1; then
  echo "[setup] ERROR: Docker no instalado. Instala Docker Desktop y vuelve a ejecutar npm run setup:local"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[setup] Iniciando Docker Desktop…"
  open -a Docker 2>/dev/null || true
  for _ in $(seq 1 20); do
    docker info >/dev/null 2>&1 && break
    sleep 3
  done
fi

docker compose up -d postgres
echo "[setup] Esperando Postgres…"
for _ in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U mvpfood -d mvpfood >/dev/null 2>&1 && break
  sleep 1
done

echo "[setup] Migraciones Prisma…"
npm run db:prisma-deploy

echo "[setup] Cuentas piloto (Demo!2026)…"
npm run seed:dev

echo "[setup] Entrenador Nicolas del Rio…"
npm run seed:coach-nicolas || echo "[setup] seed:coach-nicolas omitido (ya existe o error menor)"

echo "[setup] Centro espiritual (Biblia RVR1960 + contenido)…"
npm run spiritual:deploy-prod

echo ""
echo "=== Listo ==="
echo "  Arrancar:  npm run dev:all"
echo "  App:       http://localhost:5175"
echo "  API:       http://localhost:3002/api"
echo "  Login:     admin@foodplan.local / Demo!2026"
echo ""
echo "  Ver Biblia: curl -s http://localhost:3002/api/health"
echo "  (Tras login) GET /api/spiritual/admin/bible/stats → 66 libros, ~31104 versículos"
echo ""
echo "Documentación: docs/SETUP_REPOSITORIO.md"
