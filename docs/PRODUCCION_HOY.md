# Producción hoy — estado real del stack y checklist

**Fecha de referencia:** 2026-05-15  
**Objetivo:** salir a producción **sin romper** backend ni frontend.

---

## 1. Veredicto honesto (léelo antes de desplegar)

| Tecnología | ¿Está en el repo? | ¿Listo para prod hoy? |
|------------|-------------------|------------------------|
| **PostgreSQL (`pg`)** | Sí — modo `USE_PG_STORAGE` (tabla `json_collections`) | **Sí** — recomendado en producción (sin Prisma) |
| **Prisma** | Sí (`backend/prisma/schema.prisma`) | **Sí** — `USE_PRISMA=true` con `json_collections` |
| **JsonStore (JSON en disco)** | Sí — desarrollo local / fallback | **Sí** — si no hay Postgres configurado |
| **Knex** | Config en `knexfile.js` | **No** — carpeta `migrations/` vacía |
| **MySQL (`mysql2`)** | Sí en `dbClient.js` | Evitar en prod — mezcla tecnologías |

### Conclusión

**Producción recomendada:** `USE_PG_STORAGE=true` + `DATABASE_URL` (o `DB_*`).  
Todo el dominio se guarda en PostgreSQL (`json_collections`), **sin cambiar** endpoints ni pantallas.

**No usar** `USE_DB_AUTH=true` junto con `USE_PG_STORAGE` (queda obsoleto).

Guías: [`docs/PRISMA_PRODUCCION.md`](PRISMA_PRODUCCION.md), [`docs/POSTGRES_PRODUCCION.md`](POSTGRES_PRODUCCION.md).

**Fallback:** sin Postgres, el backend sigue usando archivos en `backend/data/` (volumen persistente).

---

## 2. Qué usa cada módulo (mapa de persistencia)

| Módulo | Persistencia actual | Controller / modelo |
|--------|---------------------|------------------------|
| Auth login (modo dev) | JSON | `server.js` + `UserDatabase` |
| Auth login (`USE_DB_AUTH=true`) | PostgreSQL `users` | `authController.js` |
| Admin usuarios CRUD | JSON | `server.js` + `UserDatabase` |
| Gimnasios | JSON | `GymDatabase` |
| Entrenadores | JSON | `TrainersDatabase` |
| Programas D28D | JSON | `ProgramSettingsDatabase` |
| Ciclos D28D | JSON | `CyclesDatabase` |
| Alimentos / recetas | JSON | `FoodDatabase`, `RecipeDatabase` |
| Planes / cuentas | JSON | `AccountsDatabase`, `UserPlanStore` |
| Training / rutinas | JSON | `TrainingPlansStore`, `TrainingLogStore` |
| Clases en vivo | JSON | `LiveClassDatabase` |
| Food log | JSON (default) o PG parcial | `foodLogController` |
| Auditoría (API) | PostgreSQL `audit_logs` | `adminController` + `logger.js` |

---

## 3. Configuración recomendada para producción HOY

### 3.1 Backend (`backend/.env`)

```env
NODE_ENV=production
PORT=3001

# Auth — OBLIGATORIO
JWT_SECRET=<generar 48+ bytes aleatorios>
JWT_EXPIRES_IN=7d

# Persistencia — PostgreSQL + Prisma
USE_PG_STORAGE=true
USE_PRISMA=true
USE_DB_AUTH=false
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# CORS — dominio real del frontend (Vercel)
CORS_ORIGIN=https://tu-app.vercel.app

# Seed demo — NUNCA en producción real
SEED_DEMO=false

# Dev routes — NUNCA
ENABLE_DEV_ROUTES=false
ENABLE_RECIPE_MOCK=false

# PostgreSQL — OPCIONAL solo para audit_logs (recomendado si usas Auditoría)
DB_CLIENT=pg
DB_HOST=<host>
DB_PORT=5432
DB_NAME=<db>
DB_USER=<user>
DB_PASSWORD=<password>
DB_SSL=true
```

Si usas auditoría: ejecutar en PostgreSQL el bloque `audit_logs` de `backend/database.sql`.

### 3.2 Frontend (`.env` o variables Vercel)

```env
VITE_API_BASE_URL=https://tu-api.ejemplo.com/api
VITE_BRAND_NAME=D28D Gimnasio Virtual
```

### 3.3 Volumen persistente (crítico)

El backend **debe** tener disco persistente en:

```
backend/data/
```

Sin volumen, cada redeploy **borra usuarios, gimnasios y programas**.

Opciones:

- Render / Railway / Fly: disco persistente montado en `backend/data`
- O incluir `backend/data/` en la imagen **solo para piloto** (no escalable)

---

## 4. Checklist pre-deploy

### Código

- [ ] `npm run build` (frontend) — sin errores
- [ ] `cd backend && node --check server.js` con `JWT_SECRET` exportado
- [ ] Sin cambios locales sin commitear que necesites en prod

### Seguridad

- [ ] `JWT_SECRET` único y largo (no el de dev)
- [ ] `SEED_DEMO=false`
- [ ] `ENABLE_DEV_ROUTES=false`
- [ ] Credenciales Zoom solo en env del servidor (no en JSON)
- [ ] `CORS_ORIGIN` = dominio exacto del frontend (sin `*`)

### Cuentas piloto (si aplica)

Emails documentados (`@d28d.local`), contraseña `Demo!2026`:

| Rol | Email |
|-----|-------|
| super_admin | `admin@d28d.local` |
| admin_d28d | `d28d.admin@d28d.local` |
| admin_food | `food.admin@d28d.local` |
| admin_entrenador | `coach.admin@d28d.local` |

Reset local: `node scripts/reset_pilot_passwords.cjs 'Demo!2026'`  
**Reiniciar backend** después del reset (UserDatabase cachea en RAM).

### Semilla de verificación (obligatorio en servidor nuevo)

```bash
cd backend && npm install
node ../scripts/prisma_deploy.cjs
node ../scripts/migrate_json_to_postgres.cjs   # si tienes backend/data/*.json
node ../scripts/seed_production_verify.cjs 'Demo!2026'
cd backend && npm start
```

Manifiesto: `scripts/seeds/production-verify.manifest.json`  
Guía completa: **`docs/VERIFICACION_PRODUCCION.md`**

### Smoke post-deploy

```bash
curl -s https://TU-API/api/health
curl -s -X POST https://TU-API/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@d28d.local","password":"Demo!2026"}'

# Registro — validar códigos
curl -s -X POST https://TU-API/api/auth/resolve-invite \
  -H 'Content-Type: application/json' \
  -d '{"code":"D28D-PILOTO"}'

# Usuario final semilla (módulos D28D completos)
curl -s -X POST https://TU-API/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"final.d28d@d28d.local","password":"Demo!2026"}'
```

---

## 5. Roadmap PostgreSQL + Prisma (no es “hoy”)

Para cumplir **“todo en PostgreSQL + Prisma sin mezclar”**:

1. **Inicializar Prisma** (`schema.prisma` desde `backend/database.sql` + tablas JSON faltantes: cycles, program_settings, etc.).
2. **Migrar modelos** uno a uno (users → gyms → trainers → foods → training → live_classes).
3. **Eliminar JsonStore** de controllers o usar capa repository única.
4. **Un solo flag** `DATABASE_URL` + Prisma Client; retirar `USE_DB_AUTH`, `mysql2`, rutas duplicadas en `server.js`.
5. **Script de importación** JSON → PG para datos del piloto.
6. **Tests de regresión** con el checklist de `docs/SMOKE_TESTS_PILOTO.md`.

Estimación realista: **varios días de desarrollo** antes de apagar JSON con seguridad.

---

## 6. Qué NO hacer hoy

| Acción | Riesgo |
|--------|--------|
| `USE_DB_AUTH=true` sin migrar todo | Login en PG, resto en JSON → inconsistencia |
| Asumir que README “PostgreSQL en prod” ya está completo | Solo auth parcial |
| Desplegar sin volumen en `backend/data/` | Pérdida de datos en cada deploy |
| `SEED_DEMO=true` en prod | Sobrescribe usuarios |
| Mezclar MySQL (`DB_CLIENT=mysql`) con PG | Dos motores SQL |

---

## 7. Frontend (Vercel)

- Build: `npm run build`
- Output: `dist/`
- Variable: `VITE_API_BASE_URL` apuntando al backend en HTTPS
- Rewrites SPA: `vercel.json` (ya en repo)

---

## 8. Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Podemos salir hoy sin romper? | **Sí**, con **JSON + volumen persistente** |
| ¿Todo en PostgreSQL hoy? | **No** sin migración mayor |
| ¿Prisma hoy? | **No está instalado** |
| ¿Qué activar en prod? | `USE_DB_AUTH=false`, `SEED_DEMO=false`, CORS correcto, JWT fuerte |
| ¿PostgreSQL para qué hoy? | Opcional: solo `audit_logs` |
