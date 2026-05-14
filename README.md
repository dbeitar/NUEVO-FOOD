# D28D Gimnasio Virtual — Plataforma de Plan + Entrenamiento + Clases en vivo

Plataforma SaaS modular para gimnasios marca blanca. Tres servicios sobre
un solo stack: **D28D** (programas y clases en vivo), **Plan de
Alimentación** (calculadora, catálogo, recetas, registro), **Entrenadores**
(rutinas, asignación, galería de videos). Multi-tenant por `gym_id`,
con white-label opcional por gym.

> Estado: **piloto controlado**. P0 y P1 aplicados. Ver
> [`docs/AUDITORIA_PRE_PILOTO.md`](docs/AUDITORIA_PRE_PILOTO.md) para el
> detalle de hallazgos, fixes y validación.

---

## 1. Arquitectura

```
proyectofoodplan/
├── src/                         # Frontend (React 19 + Vite 7)
│   ├── components/              # Dashboard, FoodLog, TrainingModule, LiveClasses…
│   ├── components/dashboard/    # ServicesHero + paneles por rol (Food/D28D/Trainers)
│   ├── context/                 # Auth + i18n
│   ├── services/api.js          # Cliente axios con JWT
│   ├── utils/                   # branding, accessControl helpers
│   └── i18n/                    # es.js, en.js
├── backend/                     # Node 20 + Express 5
│   ├── src/controllers/         # auth, food, ai, accounts, training, liveClass…
│   ├── src/routes/              # endpoints REST montados en /api/*
│   ├── src/middleware/          # JWT, multi-tenant scope
│   ├── src/models/              # JsonStore (dev) / Postgres (prod)
│   ├── data/                    # JSON store local (users, gyms, foods, …)
│   └── server.js                # entry-point
├── docs/                        # Auditoría, documentación maestra, manuales
├── scripts/                     # Seeds, migraciones, helpers
└── .env / backend/.env          # Variables de entorno (NO versionar)
```

Persistencia:
- **Desarrollo / piloto**: JSON local en `backend/data/*.json` (atómico,
  con respaldos opcionales).
- **Producción**: PostgreSQL, activable con `USE_DB_AUTH=true` y
  variables `DB_*`.

Autenticación:
- JWT firmado con `JWT_SECRET` (obligatorio). El servidor se niega a
  arrancar sin él. Tokens expiran en `JWT_EXPIRES_IN` (default 7d).
- Hash de contraseñas con `bcryptjs`.
- Rate limit en `/api/auth/*` (20 req / 15 min / IP) en cualquier entorno.

Multi-tenant:
- `gym_id` viaja en el JWT y se aplica como filtro en todos los listados
  administrativos (`/api/admin/users`, cuentas, clases…).
- `super_admin` ve todo; `admin_gimnasio/admin_marca` solo su gym;
  coaches/usuarios finales solo lo propio.

---

## 2. Instalación y arranque

### 2.1. Requisitos

- Node 20.x (o superior)
- npm 10.x
- (Opcional para prod) PostgreSQL 14+

### 2.2. Instalar dependencias

```bash
npm install
cd backend && npm install && cd ..
```

### 2.3. Variables de entorno

```bash
cp .env.example .env                  # Frontend
cp backend/.env.example backend/.env  # Backend
```

Mínimo a completar en `backend/.env`:

- `JWT_SECRET`: cadena aleatoria larga (≥ 32 chars). Generar con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `CORS_ORIGIN`: orígenes permitidos para el frontend
  (ej. `http://localhost:5174,https://gym.tu-marca.com`).
- `SEED_DEMO=true` solo si quieres data de demostración cargada.

### 2.4. Levantar todo en local

```bash
npm run dev:all
```

Por defecto:
- Frontend: <http://localhost:5174>
- Backend:  <http://localhost:3001>
- Healthcheck: <http://localhost:3001/api/health>

También se puede levantar cada lado por separado:

```bash
npm run dev          # Frontend (Vite)
cd backend && npm run dev   # Backend (Node con nodemon)
```

### 2.5. Build de producción

```bash
npm run build        # Frontend → dist/
cd backend && NODE_ENV=production node server.js
```

Servir `dist/` con cualquier servidor estático y apuntar `VITE_API_BASE_URL`
del build al backend público.

---

## 3. Cuentas demo

Si `SEED_DEMO=true` (o `NODE_ENV=development` por defecto), el backend
sincroniza al arrancar:

| Email | Rol | Contraseña | Notas |
|---|---|---|---|
| `admin@foodplan.local` | super_admin | `Demo!2026` | Acceso total |
| `admin.d28d@foodplan.local` | admin_d28d | `Demo!2026` | Solo módulo D28D |
| `admin.food@foodplan.local` | admin_food_plan | `Demo!2026` | Solo Plan de Alimentación |
| `admin.entrenador@foodplan.local` | admin_training | `Demo!2026` | Solo Entrenadores |
| `gym.demo@foodplan.local` | admin_gimnasio | `Demo!2026` | Admin de gym (marca blanca) |
| `coach.demo@foodplan.local` | entrenador | `Demo!2026` | Coach asignado |
| `usuario.demo@foodplan.local` | usuario_final | `Demo!2026` | Cliente final |
| `demo+20260302@foodplan.local` | usuario_final | `Demo!2026` | Demo público |

Las cuentas demo se hashean en el primer arranque con la contraseña
que indiques en `DEMO_PASSWORD` / `CORE_PASSWORD` (default fallback:
`Demo!2026`).

---

## 4. Endpoints principales

> Todos los endpoints viven bajo `/api/*`. Salvo los marcados como
> públicos requieren `Authorization: Bearer <JWT>`.

### Públicos
- `GET /api/health` — healthcheck.
- `POST /api/auth/register` — alta de usuario (gateada por `authLimiter`).
- `POST /api/auth/login` — login (gateado por `authLimiter`).

### Auth
- `GET /api/auth/profile` — perfil propio.
- `POST /api/auth/admin/reset-password` — reset por admin (gym scoped).

### Admin / usuarios
- `GET/POST/PUT/DELETE /api/admin/users[...]` — gestión multi-tenant.

### Plan de Alimentación
- `GET/POST/PUT/DELETE /api/foods` — catálogo (escritura: admins de food).
- `GET /api/foods/barcode/:code` — búsqueda por código de barras.
- `GET/POST /api/food-log` — registro diario.
- `GET /api/food-log/totals?fecha=YYYY-MM-DD` — totales por día.
- `GET/POST /api/recipes` — biblioteca (oculta recetas marcadas como
  `incompleta` para usuarios no admin).
- `POST /api/ai/analyze-day-balance` — análisis determinístico.
- `POST /api/ai/quick-suggestions` — sugerencias determinísticas.
- `POST /api/ai/generate-recipe` — **deshabilitado por defecto (404)**.
  Activar con `ENABLE_RECIPE_MOCK=true`.

### Entrenamiento
- `GET/POST /api/training/plans/:userId` — plan asignado.
- `POST /api/training/substitute` — sustitución de ejercicio.
- `GET/POST /api/training/log` — diario de entrenamiento.
- `GET /api/training/gallery` — galería de videos.

### D28D / Programas / Clases
- `GET /api/programs` — listado de programas.
- `PUT /api/programs/:id` — solo `super_admin` o `admin_d28d`.
- `GET/POST /api/live-classes` — agenda. `admin_gimnasio` solo puede
  crear para su gym; `super_admin`/`admin_d28d` pueden marcar globales.

### Cuentas (suscripciones)
- `GET /api/accounts` — solo `super_admin`. Gym admins usan
  `/api/accounts/by-gym/:gymId` (forzado a su gym).
- `POST /api/accounts/:id/use-session` — solo dueño o `super_admin`.

---

## 5. Roles

```
super_admin       Acceso total. Único que ve "Auditoría".
admin_marca       Variante de admin_gym multi-gimnasio.
admin_gimnasio    Admin del gym (white-label). Solo su tenant.
admin_d28d        Solo módulo D28D (programas, clases, galería).
admin_food_plan   Solo Plan de Alimentación (= alias admin_food).
admin_training    Solo Entrenadores (= alias admin_entrenador).
entrenador        Coach asignado a usuarios.
usuario_final     Cliente final. Ve "Mi plan / Mi entrenamiento /
                  Mis clases / Mi cuenta".
```

La matriz fina vive en `src/utils/accessControl.js` (backend espejo en
`backend/src/utils/accessControl.js`).

---

## 6. Scripts útiles

```bash
npm run dev:all                 # Frontend + backend juntos
npm run build                   # Build de producción
npm run lint                    # ESLint
node scripts/seed_base_routines.cjs   # Seed rutinas base
node scripts/md-to-docx-custom.mjs    # Exporta docs/* a .docx
```

---

## 7. Branding (white-label)

- Un gym puede definir `brand_name` (string) y `logo_url` para tomar
  control completo del header y los PDFs. Se aplica solo cuando
  `brand_name` está explícitamente seteado.
- Fallback global: `VITE_BRAND_NAME` (default "D28D Gimnasio Virtual").
- D28D no rotula las cards: nunca aparece como sello dentro de la
  experiencia del usuario final del gym.

---

## 8. Seguridad — checklist mínimo

- [x] `JWT_SECRET` cargado de `.env`. Servidor se niega a arrancar sin él.
- [x] `bcryptjs` para hash de contraseñas.
- [x] Rate limit en `/api/auth/*` (20 req / 15 min / IP).
- [x] CORS allowlist explícito (`CORS_ORIGIN`).
- [x] Endpoints `/api/dev/*` solo si `NODE_ENV != production` Y
      `ENABLE_DEV_ROUTES=true`.
- [x] Seguridad multi-tenant: `gym_id` desde JWT, no desde body.
- [x] `hasRole(...)` en cada endpoint admin (no comparación directa de
      `req.user.rol`).
- [x] `.env.bak` ignorado en `.gitignore`.
- [ ] Rotación periódica de `JWT_SECRET` (manual entre releases).

---

## 9. Troubleshooting rápido

- **El backend no arranca y dice `JWT_SECRET requerido`** → completar
  `JWT_SECRET` en `backend/.env`.
- **CORS bloqueado** → agregar el origen del frontend a `CORS_ORIGIN`
  (separado por comas).
- **No veo cuentas demo** → `SEED_DEMO=true` y reiniciar. En desarrollo
  corre por defecto.
- **El bundle se queja de chunks grandes** → ya está code-splitting con
  `vendor-pdf` lazy. Si el warning vuelve a salir, revisa
  `vite.config.js → manualChunks`.

---

## 10. Documentación complementaria

- `docs/AUDITORIA_PRE_PILOTO.md` — auditoría y plan P0/P1/P2.
- `docs/MANUAL_PLATAFORMA_D28D.md` — manual operativo.
- `docs/ARQUITECTURA_VISIBLE_EXPERIENCIA.md` — narrativa de UX.
- `docs/ECOSISTEMA_MODULAR_MARCA_BLANCA.md` — modelo multi-tenant.
- `docs/GTM_LATAM_COACHES_Y_GYMS.md` — go-to-market.
- `docs/PILOTO_ECOSISTEMA_FITNESS.md` — guion de piloto.
- `docs/SMOKE_TESTS_PILOTO.md` — checklist manual de validación.

---

## 11. Licencia / autoría

Proyecto interno D28D Gimnasio Virtual. Uso restringido a las marcas
contratantes y al piloto controlado autorizado.
