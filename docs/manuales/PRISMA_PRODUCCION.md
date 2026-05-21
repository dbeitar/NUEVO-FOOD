# Prisma en producción — MVPFOOD

## Qué hace Prisma aquí

- **ORM oficial** para PostgreSQL (`@prisma/client`).
- **No reescribe** rutas ni modelos de negocio: `UserDatabase`, `GymDatabase`, etc. siguen igual.
- Persiste el dominio en la tabla `json_collections` (un documento JSON por colección: `users.json`, `gyms.json`, …).
- Tabla `audit_logs` definida en el schema (compatible con el logger actual vía SQL `pg`).

## Variables (.env backend)

```env
NODE_ENV=production
USE_PG_STORAGE=true
USE_PRISMA=true
USE_DB_AUTH=false

DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

Si no tienes `DATABASE_URL`, usa `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (el backend construye la URL).

Desarrollo local sin Postgres:

```env
USE_PG_STORAGE=false
```

## Despliegue (orden)

```bash
cd backend
npm install                    # ejecuta prisma generate (postinstall)

# 1) Crear tablas en Postgres
npx prisma migrate deploy
# o desde la raíz del repo:
node scripts/prisma_deploy.cjs

# 2) Importar JSON del piloto (si aplica)
node scripts/migrate_json_to_postgres.cjs

# 3) Semilla de verificación
node scripts/seed_production_verify.cjs 'Demo!2026'

# 4) Arrancar
npm start
```

En logs:

```text
[storage] Persistencia: postgres+prisma (json_collections)
[server] Persistencia: PostgreSQL + Prisma (json_collections) — dominio completo
```

## Scripts npm (carpeta backend)

| Script | Uso |
|--------|-----|
| `npm run prisma:generate` | Regenerar cliente |
| `npm run prisma:migrate` | `migrate deploy` en prod |
| `npm run prisma:migrate:dev` | Desarrollo local con DB |

## Desactivar Prisma (solo SQL crudo)

```env
USE_PRISMA=false
```

Sigue usando PostgreSQL vía `pg`, no archivos JSON.

## Archivos clave

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/lib/prisma.js`
- `backend/src/utils/pgCollectionCache.js`

Ver también: [POSTGRES_PRODUCCION.md](./POSTGRES_PRODUCCION.md), [VERIFICACION_PRODUCCION.md](./VERIFICACION_PRODUCCION.md).
