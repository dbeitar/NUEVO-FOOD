# Manual de la Plataforma — D28D Gimnasio Virtual

**Versión:** 1.4 — Mayo 2026
**Repositorio:** `MVPFOOD` (rama `main`)

> Documento maestro operativo. Refleja **lo que hay implementado y se puede usar hoy**. La estrategia comercial está en `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md`, la hoja de ruta en `ROADMAP_REALISTA_ECOSISTEMA.md` y la experiencia visual por rol en `ARQUITECTURA_VISIBLE_EXPERIENCIA.md`.

---

## 0. Estado actual (Mayo 2026)

### Sprints completados

| Sprint | Foco | Estado |
|---|---|---|
| 0 | Seguridad y bloqueantes (JWT obligatorio, CORS whitelist, secretos fuera de código, multi-tenant) | ✅ |
| 1 | Profesionalización (sin hype IA/CV, branding white-label real, copy humano, archivado experimental) | ✅ |
| 3 | UX y experiencia (Dashboard modular, hero como Inicio, navegación por rol) | ✅ |

### Ajustes recientes (esta semana)

- ✅ Branding por defecto **"D28D Gimnasio Virtual"** (white-label solo si el gym define `brand_name` explícito).
- ✅ Servicios en orden fijo: **D28D → Plan de Alimentación → Entrenadores → Clases en Vivo**.
- ✅ Gimnasios marca blanca **bajo D28D** (no es servicio aparte; consumen contenido D28D y agendan en sus plantillas).
- ✅ Clases en Vivo con **dos tabs**: Programar (admin) y Calendario (con inscripción y join a Zoom).
- ✅ Filtro por programa: usuario final ve solo su programa asignado; admin tiene dropdown (Vital / Pancitas / Virtual D28D / Todos).
- ✅ Roles nuevos: `admin_d28d`, `admin_food` (alias `admin_food_plan`), `admin_entrenador` (alias `admin_training`).
- ✅ Auditoría visible **solo para super_admin** (frontend + backend).
- ✅ Filtrado estricto: cada admin específico ve solo SU servicio. Solo el super_admin ve todos.

### Lo que sigue (próximos ajustes)

| Prioridad | Tema | Detalle |
|---|---|---|
| 🟠 Media | Asignación de `program_id` a usuarios desde UI | Hoy se setea solo por seed; falta UI en AdminUsers o "Configurar planes" |
| 🟠 Media | Endpoint `/admin/audit-logs` en modo JSON | Hoy retorna error porque solo lee Postgres; servir desde `backend/logs/*.json` |
| 🟡 Baja | Asignar plan/programa al usuario desde el panel del coach | Workflow completo coach → usuario |
| 🟡 Baja | Reducir warning de bundle > 500 kB (code-splitting) | Performance |

---

## 1. Acceso y arranque local

| Entorno | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5175 |
| Backend (Express) | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

```bash
npm run dev:all
```

Levanta frontend y backend juntos. Variables clave (`backend/.env`):

```env
JWT_SECRET=<mín. 32 chars>
CORS_ORIGIN=http://localhost:5175
USE_DB_AUTH=false           # modo JSON (dev)
ENABLE_DEV_ROUTES=false     # /api/dev/* gated
OLLAMA_BASE_URL=http://localhost:11434   # opcional
```

---

## 2. Credenciales de prueba

> **Clave única para todos los demos:** `Demo!2026`
> Usuarios sembrados en `backend/data/users.json`. Validados con login real (HTTP 200).

| Rol | Email | Verifica |
|---|---|---|
| **super_admin** | `admin@d28d.local` | Ve los 4 servicios + Auditoría + barra global |
| **admin_d28d** | `d28d.admin@d28d.local` | Solo ve D28D + Clases en Vivo |
| **admin_food** | `food.admin@d28d.local` | Solo ve Plan de Alimentación |
| **admin_entrenador** | `coach.admin@d28d.local` | Solo ve Entrenadores |
| **admin_gimnasio** | `gym.admin@d28d.local` | Ve D28D + Clases en Vivo (su gym = id 4) |
| **entrenador** (coach) | `entrenador@d28d.local` | Ve Entrenadores + Plan + Clases |
| **nutricionista** | `nutricionista@d28d.local` | Solo Plan de Alimentación |
| **usuario_final** Vital | `vital.user@d28d.local` | Calendario filtrado a Vital (48 clases) |
| **usuario_final** Pancitas | `pancitas.user@d28d.local` | Calendario filtrado a Pancitas (48 clases) |
| **usuario_final** Virtual | `virtual.user@d28d.local` | Calendario filtrado a Virtual D28D (24 clases) |
| **usuario_final** sin programa | `cliente@d28d.local` | Calendario muestra aviso "Hablá con tu coach" |

> Para validar el filtro de visibilidad de servicios:
> - `admin_d28d` no debe ver Plan de Alimentación ni Entrenadores.
> - `admin_food` no debe ver D28D ni Entrenadores.
> - `admin_entrenador` no debe ver D28D ni Plan.
> - Solo `super_admin` ve **Auditoría** en la navegación.

---

## 3. Pantalla de Inicio — Servicios

D28D Gimnasio Virtual es una **plataforma modular con un único registro**. El usuario hace una sola cuenta y puede tener uno o varios servicios activos.

La pantalla de **Inicio** muestra siempre el saludo + las **tarjetas visuales** de los servicios habilitados, con la marca del gimnasio arriba (white-label si el gym la configuró).

### 3.1 Catálogo de servicios (orden fijo)

| # | Servicio | Usuario final | Admin / Coach |
|---|---|---|---|
| 1 | **D28D** | Acceso a programas Vital / Pancitas / Virtual + clases en vivo | Programas (con ciclos), gimnasios marca blanca, galería de videos, clases en vivo |
| 2 | **Plan de Alimentación** | Mi plan, registro diario, equivalentes, recetas | Calculadora, configurar planes, maestro de alimentos, recetas, equivalentes |
| 3 | **Entrenadores** | Mi rutina del día, sustituciones asistidas | Maestro de rutinas, galería de videos, usuarios asignados |
| 4 | **Clases en Vivo** | Calendario filtrado por mi programa, inscripción y entrar al Zoom | Programar plantillas (Zoom + horarios) + calendario con filtro por programa |

> **Mi gimnasio** **no es un servicio aparte**. Vive dentro de D28D porque los gimnasios consumen el contenido D28D y agendan sobre sus plantillas. El admin del gym entra por la card D28D y allí ve la sección "Gimnasios marca blanca".

### 3.2 Reglas de visibilidad de tarjetas (matriz validada)

| Rol | Servicios visibles |
|---|---|
| `super_admin` | D28D · Plan · Entrenadores · Clases en Vivo |
| `admin_d28d` puro | D28D · Clases en Vivo |
| `admin_food` puro | Plan |
| `admin_entrenador` puro | Entrenadores |
| `admin_gimnasio` / `admin_marca` / `admin_gym` | D28D · Clases en Vivo (operan dentro de D28D) |
| `entrenador` (coach) | Plan · Entrenadores · Clases |
| `nutricionista` | Plan |
| `usuario_final` con `module_access` explícito | lo declarado |
| `usuario_final` sin acceso definido | Plan · Entrenadores · Clases |

### 3.3 Comportamiento al hacer clic

- **Usuario final** → entra a su experiencia de consumo (Plan → Mi Plan, Entrenadores → Mi Rutina, Clases / D28D → Calendario, etc.).
- **Admin / Coach** → entra al **maestro independiente** del servicio. Botón "← Volver" para regresar al hero.

---

## 4. Navegación por rol

La barra principal queda corta (≤ 6 entradas) y se adapta:

| Rol | Barra principal |
|---|---|
| `super_admin` | Inicio · Auditoría · Mi cuenta |
| `admin_d28d` | Inicio · Programas D28D · Clases en Vivo · Galería · Mi cuenta |
| `admin_food` | Inicio · Maestro alimentos · Conceptos calculadora · Recetas · Mi cuenta |
| `admin_entrenador` | Inicio · Rutinas · Galería · Mis usuarios · Mi cuenta |
| `admin_gimnasio` / `admin_gym` / `admin_marca` | Inicio · Mi marca · Usuarios · Clases en Vivo · Galería · Mi cuenta |
| `entrenador` (coach) | Inicio · Mis usuarios · Rutinas · Planes nutricionales · Seguimiento · Mi cuenta |
| `usuario_final` | Inicio · Mi Plan · Entrenamiento · Progreso · Clases · Mi cuenta |

> La barra rápida secundaria (que aparecía siempre con todos los maestros) **fue eliminada**. Los maestros viven dentro del panel de cada servicio.

---

## 5. Módulo D28D

### 5.1 Tres programas activos

| Programa | Color | Cuenta Zoom |
|---|---|---|
| 🌸 Vital D28D | Rosa | `D28dvital@gmail.com` |
| 🤰 Pancitas Fit | Indigo | `Pancitasfitbyd28d@gmail.com` |
| 🔥 Virtual D28D | Verde | `D28Dzoom1@gmail.com` / `d28dzoom2@gmail.com` |

> Las contraseñas Zoom NO están hardcoded. Se leen de `D28D_ZOOM_PASSWORD_VITAL`, `D28D_ZOOM_PASSWORD_PANCITAS`, `D28D_ZOOM_PASSWORD_VIRTUAL` en `backend/.env`.

### 5.2 Estructura anual: 13 ciclos de 28 días

364 días exactos. Cada ciclo arranca en una fecha definida (Ciclo 7 = 1 Junio = inicio fechas asignadas).

### 5.3 Plantillas de clases en vivo

**144 clases sembradas y validadas**:

| Programa | Clases |
|---|---|
| Vital | 48 |
| Pancitas | 48 |
| Virtual D28D | 24 |
| Plantillas base (sin programa) | 24 |

Tipos: `METODO D28D`, `FUERZA`, `CARDIO HIT`, `FUERZA TOTAL`, `FUNCIONAL`, `STRETCHING`.

### 5.4 Gimnasios marca blanca (dentro de D28D)

Tarjetas dentro del panel D28D, visibles solo para `super_admin`, `admin_marca`, `admin_gimnasio`, `admin_gym`:

- **Mi gimnasio** → branding, equipo y configuración.
- **Usuarios del gimnasio** → personas afiliadas.
- **Empresas y convenios** → solo super_admin / admin_gym.

---

## 6. Módulo Plan de Alimentación

| Función | Descripción |
|---|---|
| Calculadora nutricional | TMB + TDEE + macros personalizados |
| Configurar planes | Define o ajusta el plan del usuario (coaches, nutricionistas, admins) |
| Maestro de alimentos | Catálogo + macros + porciones (super_admin, admin_food) |
| Registro diario | Comidas del usuario por fecha + totales |
| Equivalentes | Sustituciones manteniendo macros (determinístico, IA opcional) |
| Recetas | Biblioteca + escalado por porciones |
| Asistente nutricional (chat) | Conversacional simple, **no reemplaza prescripción profesional** |

**Importante:** si el usuario no tiene plan asignado, el sistema muestra **empty state real** (no genera datos falsos).

---

## 7. Módulo Entrenadores

| Función | Componente |
|---|---|
| Mi entrenamiento | `TrainingModule` (rutina del día + sustituciones) |
| Maestro de rutinas | `AdminTrainingManager` |
| Galería de videos | `AdminTrainingGallery` |
| Usuarios asignados | `AdminUsers` filtrado por trainer |

> El "Coach Virtual" con MediaPipe / CV en tiempo real está **archivado** en `src/_archive/experimental/`. No está en bundle ni accesible desde UI.

---

## 8. Módulo Clases en Vivo

Componente: `dashboard/LiveClassesPanel.jsx`

### 8.1 Dos tabs

- **Programar** (solo admins con `super_admin`, `admin_marca`, `admin_gimnasio`, `admin_d28d`): formulario para crear/editar plantillas, asignar Zoom y configurar horarios.
- **Calendario** (todos): vistas Mensual / Semanal / Diaria / Próximas / Horario Gráfico. Inscripción a clase + botón "Entrar a Zoom" que registra asistencia.

### 8.2 Filtro por programa

- **Admin** → dropdown "Programa: Todos / Vital / Pancitas / Virtual D28D" arriba del calendario.
- **Usuario final** con programa asignado → badge "Tu programa: <nombre>" y solo ve ese calendario.
- **Usuario final sin programa** → aviso amarillo "Hablá con tu coach".

Campo leído por orden de prioridad: `user.program_id` → `user.programa_d28d` → `user.module_access.d28d_program`.

---

## 9. Roles y permisos (matriz)

| Rol | Crear gyms | Crear coaches | Programar clases | Editar maestros | Auditoría | Ver clases |
|---|---|---|---|---|---|---|
| `super_admin` | ✅ | ✅ | ✅ | ✅ todos | ✅ | ✅ |
| `admin_marca` | ✅ | ✅ | ✅ | gym / coach | ❌ | ✅ |
| `admin_gimnasio` | su gym | ✅ su gym | ✅ su gym | su gym | ❌ | ✅ |
| `admin_gym` | ✅ | ✅ | ✅ | gym | ❌ | ✅ |
| `admin_d28d` | ❌ | ❌ | ✅ D28D | programas D28D | ❌ | ✅ |
| `admin_food` / `admin_food_plan` | ❌ | ❌ | ❌ | alimentos / planes | ❌ | ❌ |
| `admin_entrenador` / `admin_training` | ❌ | ❌ | ❌ | rutinas / galería | ❌ | ❌ |
| `entrenador` | ❌ | ❌ | ❌ | propias rutinas | ❌ | ✅ |
| `nutricionista` | ❌ | ❌ | ❌ | planes asignados | ❌ | ❌ |
| `usuario_final` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ propio programa |

> `admin_food` ≡ `admin_food_plan`. `admin_entrenador` ≡ `admin_training`. Son alias para que el seed y la UI puedan usar el nombre corto en español.

---

## PARTE II — Infraestructura

## 10. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 19 |
| Bundler | Vite | 7 |
| CSS | Tailwind CSS | 4 |
| HTTP | Axios | 1.x |
| Backend | Express | 5 |
| Auth | JWT (`jsonwebtoken`) | 9.x |
| Hashing | bcryptjs | 3.x |
| Persistencia DEV | JSON (`JsonStore` propio) | — |
| Persistencia PROD | PostgreSQL / MySQL | pg 8 / mysql2 |
| IA local (opcional) | Ollama | — |
| Runtime | Node.js | 20 |

---

## 11. Estructura de carpetas (resumen)

```
MVPFOOD/
├── backend/
│   ├── data/                       # JSON (dev). users, gyms, live_classes, etc.
│   ├── src/
│   │   ├── controllers/            # Lógica
│   │   ├── middleware/auth.js      # JWT obligatorio
│   │   ├── models/                 # JsonStore
│   │   ├── routes/                 # /api/*
│   │   └── utils/
│   │       ├── accessControl.js    # Matriz de roles y permisos
│   │       └── tenantScope.js      # Multi-tenant por gym_id
│   └── server.js
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx           # Shell modular
│   │   ├── AdminLiveClasses.jsx    # Programar (tab 1)
│   │   ├── LiveClasses.jsx         # Calendario (tab 2)
│   │   └── dashboard/              # Vistas extraídas
│   │       ├── ServicesHero.jsx
│   │       ├── D28DAdminView.jsx
│   │       ├── FoodPlanAdminView.jsx
│   │       ├── TrainersAdminView.jsx
│   │       ├── LiveClassesPanel.jsx
│   │       ├── MyPlanView.jsx
│   │       ├── userServices.js
│   │       └── roles.js
│   ├── _archive/experimental/      # Coach Virtual / poseCv (no usado)
│   ├── utils/branding.js           # PUBLIC_BRAND_NAME = "D28D Gimnasio Virtual"
│   └── services/api.js             # Axios + interceptor logout 401
└── docs/manuales/                   # Manuales de revisión (esta carpeta)
```

---

## 12. Seguridad

| Tema | Implementación |
|---|---|
| JWT | `JWT_SECRET` obligatorio (mín. 32 chars). Server no arranca sin él. |
| CORS | Whitelist (`CORS_ORIGIN`) con `cors` lib oficial. Sin wildcard. |
| Rutas dev | `/api/dev/*` gated por `ENABLE_DEV_ROUTES=true`. |
| Rutas críticas | `/api/gyms`, `/api/trainers`, `/api/live-classes`, `/api/programs` → todas protegidas con `authenticateToken`. |
| Auditoría | `/admin/audit-logs` → solo `super_admin` (validado: usuario_final = 403). |
| Multi-tenant | `tenantScope.js` filtra por `gym_id` del JWT. |
| Secretos Zoom | Fuera del repo, vía env. `program_settings.json` no expone passwords al frontend. |
| Rate limit | `express-rate-limit` en `/api/auth`. |
| Branding | Sin auto-detección de URL ni `window.apiConfig`. `API_BASE` resuelto al cargar. |

---

## 13. API — endpoints clave

| Método | Ruta | Notas |
|---|---|---|
| POST | `/api/auth/login` | Devuelve JWT |
| GET | `/api/auth/profile` | Usuario autenticado |
| GET | `/api/live-classes?program_id=<id>` | Filtra por programa |
| POST | `/api/live-classes/:id/enroll` | Inscripción a clase |
| POST | `/api/live-classes/:id/join` | Registra asistencia + retorna Zoom |
| GET | `/api/live-classes/admin?program_id=<id>` | Admin: filtra por programa |
| GET | `/api/programs` | Catálogo: Vital, Pancitas, Virtual D28D |
| GET | `/api/gyms` / `/api/gyms/:id` | Multi-tenant (filtra por gym del usuario) |
| GET | `/api/trainers` | Multi-tenant |
| GET | `/api/plan/mine` | Plan del usuario logueado (null si no tiene) |
| GET | `/api/admin/audit-logs` | Solo super_admin |

---

## 14. Cómo validar el sistema (smoke manual)

1. `npm run dev:all`
2. Abrir http://localhost:5175 → debe decir **"D28D Gimnasio Virtual"** arriba a la izquierda.
3. Login con cada usuario de la tabla de credenciales (sección 2) y verificar:
   - Tarjetas del hero que ve.
   - Que la barra de navegación coincida con la matriz de la sección 4.
   - En usuarios con programa asignado (vital / pancitas / virtual): entrar a "Clases en Vivo" → calendario debe mostrar solo SU programa.
   - En admins: el dropdown de programa debe permitir cambiar.
   - Solo `super_admin` debe ver "Auditoría" en la nav.

---

## 15. Próximos pasos sugeridos (orden recomendado)

1. **UI para asignar `program_id` a usuarios** desde `AdminUsers` o desde el panel del coach (en lugar de seed).
2. **Endpoint de audit-logs en modo JSON** (hoy intenta Postgres y falla). Leer de `backend/logs/*.json`.
3. **Validación E2E por rol** automatizada con script de pruebas.
4. **Asignar plan + programa al usuario desde el panel del coach** (workflow completo).
5. **Code-splitting del bundle** (>500 kB warning de Vite).
