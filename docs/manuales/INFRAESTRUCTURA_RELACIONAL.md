# Infraestructura relacional — MVPFOOD

## Resumen

- **PostgreSQL** con tablas relacionales (`users`, `gyms`, `trainers`, `cycles`, …).
- **Prisma** como ORM.
- **Docker Compose** para desarrollo local.
- **Misma API de negocio**: roles, `module_access`, registro por código, módulos en dashboard.

## Desarrollo local (Docker)

```bash
docker compose up -d postgres
cp backend/.env.docker.example backend/.env
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

Frontend: `npm run dev` en la raíz (puerto 5175).

Adminer (opcional): http://localhost:8080 — servidor `postgres`, usuario `mvpfood`, BD `mvpfood`.

## Producción

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
USE_RELATIONAL_STORAGE=true
USE_JSON_FILES=false
USE_PRISMA=true
USE_DB_AUTH=false
JWT_SECRET=...
CORS_ORIGIN=https://tu-frontend...
```

```bash
cd backend && npm install
node ../scripts/prisma_deploy.cjs
node ../scripts/seed_production_verify.cjs 'TuPassword'
npm start
```

Si migras desde el piloto JSON:

```bash
node scripts/migrate_json_to_postgres.cjs   # import legacy
# o automático al arrancar si la BD está vacía (seedRelationalFromJson)
```

## Seguridad y escalabilidad

| Aspecto | Implementación |
|---------|----------------|
| Contraseñas | bcrypt en `users.clave_hash` |
| Auth | JWT, rate limit `/api/auth` |
| Roles / permisos | `users.roles`, `users.permissions` (hydrateAccess) |
| Módulos usuario final | `users.module_access` JSONB |
| Persistencia | Postgres con índices en email, gym, trainer |
| Escalabilidad | Pool Prisma; stateless API; BD gestionada |

## Tablas principales

- `users` — login, roles, module_access, gym_id, trainer_id
- `gyms` / `trainers` — invite_code
- `cycles`, `program_settings`
- `subscription_plans`, `user_accounts`
- `live_classes`, `food_items`
- `domain_documents` — training_plans, logs, gallery (payload JSON por colección)
- `user_plans` — plan nutricional por usuario
- `audit_logs`

## Sin archivos JSON en producción

Con `USE_RELATIONAL_STORAGE=true` y `DATABASE_URL`, **no** se escribe en `backend/data/`.  
Solo usar `USE_JSON_FILES=true` en dev sin Docker.
