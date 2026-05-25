# Módulo Entrenadores (`training_version_final`)

Aplicación **independiente** (NestJS + React), integrable con el shell D28D vía SSO (`TRAINING_MODULE_URL` + `shell-provision` + `shell-exchange`).

## Puertos (Docker)

| Servicio   | Puerto |
|-----------|--------|
| PostgreSQL | 5435 |
| API NestJS | 3003 (`/api/v1`) |
| Web Vite   | 3004 |

## Arranque local

```bash
cd modules/training_version_final
cp backend/.env.example backend/.env
# Alinear TRAINING_SHELL_API_KEY y TRAINING_SHELL_SSO_SECRET con el shell D28D
docker compose up --build
```

Web: http://localhost:3004 — SSO: http://localhost:3004/shell-sso?token=…

## Variables shell D28D (`backend/.env`)

```env
TRAINING_MODULE_URL=http://localhost:3003/api/v1
TRAINING_MODULE_PUBLIC_URL=http://localhost:3004
TRAINING_SHELL_API_KEY=misma_clave_que_en_el_modulo
TRAINING_SSO_SECRET=mismo_secreto_que_TRAINING_SHELL_SSO_SECRET_o_JWT_SECRET
TRAINING_EXTERNAL_MODE=true
VITE_TRAINING_LEGACY=false
```

Con `TRAINING_EXTERNAL_MODE=true`, el panel Entrenadores abre la app en `:3004` (no el bundle embebido del shell).

## API shell (server-to-server)

- `POST /api/v1/training/shell-provision` — header `X-Shell-Key`
- `PUT /api/v1/branding/shell` — sincronizar marca blanca

## SSO usuario

1. Shell genera handoff `typ: training_shell_sso`
2. Redirect a `{TRAINING_MODULE_PUBLIC_URL}/shell-sso?token=…`
3. Frontend llama `POST /api/v1/auth/shell-exchange`

Provision automático desde shell al licenciar módulo `training` (paridad Food Plan).
