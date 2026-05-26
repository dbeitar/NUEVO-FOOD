# Técnico y despliegue — MVPFOOD / D28D

**Documento maestro 4/5**

---

## 1. Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 7, Tailwind 4, React Router 7, Axios |
| Backend | Node 20, Express 5, JWT, bcrypt |
| Persistencia recomendada | **PostgreSQL 16 + Prisma** (`USE_RELATIONAL_STORAGE=true`) |
| Persistencia dev legacy | JSON vía `JsonStore` (sin Docker) |
| Contenedores | `docker-compose.yml` → Postgres puerto **5434** |
| IA opcional | Ollama HTTP |

---

## 2. Estructura del repositorio

```
MVPFOOD/
├── src/                    # React (components, services, utils)
├── backend/
│   ├── server.js           # Entrada
│   ├── serverApp.js        # Express + rutas
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/         # UserDatabase, Gym, Trainer, Cycle…
│   │   ├── repositories/ # Capa Prisma
│   │   └── storage/      # initStorage, storageMode
│   └── data/               # JSON seed (migración a SQL)
├── docker-compose.yml
├── docs/manuales/          # Estos 5 documentos
└── scripts/                # seed_production_verify.cjs, tests
```

---

## 3. Persistencia relacional (estado actual)

### Activar

```env
USE_RELATIONAL_STORAGE=true
DATABASE_URL=postgresql://mvpfood:mvpfood@localhost:5434/mvpfood?schema=public
```

### Arranque

```bash
docker compose up -d postgres
cd backend && npx prisma migrate deploy
node scripts/seedRelationalFromJson.js   # primera vez
node scripts/seed_production_verify.cjs 'Demo!2026'
```

### Tablas principales (Prisma)

`users`, `gyms`, `trainers`, `accounts`, `programs`, `live_classes`, `cycles`, `foods`, `food_logs`, `recipes`, `training_*`, `audit_logs`, etc.

### Modo JSON (solo desarrollo sin DB)

- `USE_RELATIONAL_STORAGE` ausente o `false`
- Datos en `backend/data/*.json`
- **No usar en producción** para nuevos despliegues

---

## 4. API y puertos

| Servicio | Puerto típico |
|----------|----------------|
| Frontend Vite | 5175 (o 5174) |
| Backend API | **3002** (evitar 3001 si otro proyecto lo usa) |
| Postgres Docker | **5434** → 5432 interno |

**Frontend** debe apuntar al backend correcto:

```env
VITE_API_BASE_URL=http://localhost:3002/api
```

**Backend:**

```env
PORT=3002
JWT_SECRET=<mínimo 32 caracteres>
```

Health: `GET /api/health` → `{ "status": "ok" }`

---

## 5. Autenticación y multi-tenant

- JWT en `Authorization: Bearer`
- `req.user` incluye `id`, `rol`, `roles[]`, `gym_id`, `module_access`
- Registro: `POST /api/auth/register` + validación async de invite en Postgres
- Rate limit en `/api/auth` (más permisivo en `NODE_ENV=development`)

Archivos clave:

- `backend/src/controllers/authController.js`
- `backend/src/models/UserDatabase.js` (create async, ID alineado con SQL)
- `backend/src/utils/inviteResolver.js`
- `src/components/Register.jsx`

---

## 6. Mapa de módulos (código)

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Auth | `authController`, `server.js` | `Register.jsx`, `Login.jsx` |
| Food | `foodController`, `foodLogController` | `AdminFoodsManager`, `Dashboard`, `NutritionChat` |
| Training | rutas training | `TrainingModule`, `AdminTrainingManager` |
| Live / D28D | programas, live classes | `AdminProgramsManager`, `LiveClassSchedule` |
| Admin | `adminRoutes` | `AdminUsers`, `AdminGyms`, `InviteCodeCell` |
| Ciclos | — | `src/utils/cycleUtils.js` |

---

## 7. Despliegue producción (checklist)

1. Postgres gestionado + `DATABASE_URL` segura  
2. `npx prisma migrate deploy` en CI o release  
3. `JWT_SECRET` fuerte, nunca en git  
4. `USE_RELATIONAL_STORAGE=true`  
5. Build frontend: `npm run build` → Vercel/static  
6. Backend: `backend/Dockerfile` o Koyeb; CORS con dominio real  
7. Variables Zoom por programa en entorno del servidor  
8. Semilla **solo** en staging; producción con datos reales  

### Verificación post-deploy

```bash
curl -s https://<api>/api/health
node scripts/seed_production_verify.cjs '<password>'  # solo staging
```

---

## 8. Scripts útiles

| Script | Uso |
|--------|-----|
| `npm run dev` | Frontend |
| `cd backend && PORT=3002 npm run dev` | API |
| `npm run dev:all` | Ambos (concurrency) |
| `scripts/seed_production_verify.cjs` | Usuarios demo + contraseña |
| `scripts/test_invite_codes_api.sh` | API códigos invite |

---

## 9. Documentación obsoleta (eliminada)

Los archivos separados `PRODUCCION_HOY`, `PRISMA_PRODUCCION`, `POSTGRES_PRODUCCION` y `DOCUMENTO_TECNICO_FOOD_PLAN` duplicaban contenido y mezclaban modo JSON antiguo con el estado relacional actual. **Este documento es la fuente única técnica.**
