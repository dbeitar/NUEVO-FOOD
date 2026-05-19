# PostgreSQL en producción (con Prisma, sin romper la app)

## Cómo funciona

- **Prisma** es el ORM recomendado (`USE_PRISMA=true`). Guía: [`PRISMA_PRODUCCION.md`](PRISMA_PRODUCCION.md).
- Alternativa: `USE_PRISMA=false` usa solo el cliente `pg`.
- **No se reescribieron rutas ni controladores.** Los modelos siguen usando `JsonStore`; en producción ese store guarda en la tabla `json_collections` de PostgreSQL (un documento JSON por colección: `users.json`, `gyms.json`, etc.).
- **Una sola fuente de verdad:** usuarios, gimnasios, ciclos, food, training… todo en Postgres.
- **`USE_DB_AUTH` debe quedar en `false`** (el login usa la misma colección `users` en Postgres).

## Variables en el servidor

```env
NODE_ENV=production
USE_PG_STORAGE=true
USE_DB_AUTH=false

# Opción A — URL completa (Render, Railway, Supabase…)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Opción B — variables sueltas
DB_HOST=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_SSL=true
```

Si `NODE_ENV=production` y hay `DATABASE_URL` o `DB_HOST`, **Postgres se activa solo** aunque no pongas `USE_PG_STORAGE=true`.

## Despliegue (orden)

1. Crear base PostgreSQL en tu proveedor.
2. Copiar `backend/.env.production.example` → `backend/.env` y completar JWT, CORS, DB.
3. **Migrar datos del piloto** (si tienes `backend/data/*.json` en el servidor):

   ```bash
   node scripts/migrate_json_to_postgres.cjs
   ```

4. **Semilla de verificación** (admins + usuarios de prueba):

   ```bash
   node scripts/seed_production_verify.cjs 'Demo!2026'
   ```

5. Arrancar backend: `npm start` (en carpeta `backend`).
6. En logs debe aparecer: `Persistencia: PostgreSQL (json_collections)`.

## Comprobar

```bash
curl -s https://TU-API/api/health

curl -s -X POST https://TU-API/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"final.d28d@d28d.local","password":"Demo!2026"}'
```

Ver también: `docs/VERIFICACION_PRODUCCION.md`.

## Desarrollo local (seguir con archivos JSON)

```env
USE_PG_STORAGE=false
```

O no definir `DATABASE_URL` en local.

## SQL de la tabla

`backend/database/json_collections.sql`
