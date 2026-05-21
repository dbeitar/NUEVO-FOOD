# Documento Técnico para Programadores — D28D GYM Virtual (Food Plan)

Este documento describe la arquitectura, herramientas, funcionalidades, decisiones de diseño, configuración/despliegue y flujos principales de la plataforma D28D GYM Virtual. Incluye los módulos de Food Plan, Entrenamiento, Clases en Vivo, Programas D28D (Vital, Pancitas, Virtual D28D) y Maestro Gym (Marca Blanca). Actualizado: Mayo 2026.

## 1. Estructura del Proyecto

Árbol simplificado con carpetas/archivos clave y su propósito.

```
proyectofood-plan/
├── backend/                         # API Express (modo DEV con JSON y modo DB opcional)
│   ├── data/                        # Persistencia local en JSON (modo dev)
│   │   ├── users.json               # Usuarios (persistencia JsonStore)
│   │   ├── foods.json               # Catálogo de alimentos
│   │   ├── recipes.json             # Biblioteca de recetas
│   │   ├── daily_food_logs.json     # Registros diarios
│   │   ├── accounts.json, plans.json, gyms.json, trainers.json, user_plans.json, payments.json
│   │   ├── live_classes.json          # Clases en vivo (horarios, inscripciones, asistencia)
│   │   └── program_settings.json      # Configuración de programas D28D (Zoom, ciclos)
│   ├── scripts/
│   │   └── cleanupFoods.js          # Utilidad de limpieza del catálogo (usa JsonStore)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # Config alterna de DB (pg) con SSL opcional
│   │   │   └── dbClient.js          # Abstracción de cliente (pg o mysql) vía Pool
│   │   ├── controllers/             # Lógica de negocio por dominio
│   │   │   ├── authController.js    # Registro/Login/Perfil (modo DB)
│   │   │   ├── foodController.js    # CRUD alimentos + búsqueda + stats + backup
│   │   │   ├── recipeController.js  # CRUD/Import recetas
│   │   │   ├── foodLogController.js # Totales diarios, etc.
│   │   │   ├── aiController.js      # Sugerencias/recetas IA (Ollama local o fallback)
│   │   │   ├── programController.js   # CRUD programas D28D + configuración Zoom
│   │   │   ├── gymController.js, trainersController.js, accountsController.js, planController.js, paymentsController.js
│   │   ├── middleware/
│   │   │   └── auth.js              # Verificación JWT (Authorization: Bearer ...)
│   │   ├── models/                  # Modelos con persistencia JsonStore
│   │   │   ├── UserDatabase.js      # Usuarios (JSON), hashing bcrypt
│   │   │   ├── FoodDatabase.js      # Catálogo de alimentos (semillas y CRUD)
│   │   │   ├── RecipeDatabase.js    # Recetas (get/search/create/update/delete/replaceAll)
│   │   │   ├── LiveClassDatabase.js   # Clases en vivo (enroll, join, attendance por gym)
│   │   │   ├── ProgramSettingsDatabase.js # Programas D28D (Vital, Pancitas, Virtual)
│   │   │   ├── DailyFoodLog.js, AccountsDatabase.js, TrainersDatabase.js, GymDatabase.js, PaymentsDatabase.js, UserPlanStore.js, CalculatorConcepts.js
│   │   └── routes/                  # Rutas API (montadas en server.js)
│   │       ├── authRoutes.js        # Modo DB: /api/auth/*
│   │       ├── foodRoutes.js        # /api/foods (auth)
│   │       ├── recipeRoutes.js      # /api/recipes
│   │       ├── programRoutes.js       # /api/programs (CRUD programas D28D)
│   │       ├── foodLogRoutes.js, aiRoutes.js, gymRoutes.js, trainersRoutes.js, accountsRoutes.js, planRoutes.js, paymentsRoutes.js
│   │   └── utils/
│   │       └── JsonStore.js         # Persistencia JSON con backups timestamp
│   ├── server.js                    # Arranque Express, CORS, rutas y modo DEV/DB
│   ├── database.sql                 # Esquema SQL inicial (modo DB)
│   ├── Dockerfile                   # Imagen de backend (prod)
│   ├── nodemon.json                 # Watcher en dev
│   ├── package.json                 # Scripts y deps del backend
│   └── README.md                    # Guía de backend (DB local)
│
├── src/                             # Frontend React + Vite
│   ├── components/                  # Vistas y UI (admin y usuario)
│   │   ├── Dashboard.jsx            # Home/app shell + navegación modular por servicios
│   │   ├── ModernLogin.jsx, Register.jsx, ProtectedRoute.jsx
│   │   ├── FoodLog.jsx, AdminFoodsManager.jsx, Recipes.jsx
│   │   ├── AdminUsers.jsx, AdminPlans.jsx, AdminGyms.jsx, AdminTrainers.jsx, AdminCompanies.jsx
│   │   ├── Calculator.jsx, AdminCalculator.jsx
│   │   ├── LiveClasses.jsx           # Vista calendario/horario de clases en vivo
│   │   ├── LiveClassSchedule.jsx     # Horario gráfico semanal con inscripción y cupos
│   │   ├── AdminLiveClasses.jsx      # Admin: crear/editar clases y plantillas Zoom
│   │   ├── AdminProgramsManager.jsx  # Admin: gestión de programas D28D + 13 ciclos
│   │   ├── TrainingModule.jsx, AdminTrainingManager.jsx, AdminTrainingGallery.jsx
│   │   ├── MyAccount.jsx, Progress.jsx, Equivalentes.jsx
│   │   └── NutritionChat.jsx, AuditDashboard.jsx, etc.
│   ├── context/                     # Contextos (Auth, I18n, Toast) y hooks
│   │   ├── AuthContext.jsx, useAuth.js
│   │   ├── I18nContext.jsx, useI18n.js, i18n/
│   │   └── ToastContext.jsx (...)
│   ├── services/
│   │   └── api.js                   # Axios baseURL dinámico + interceptores
│   ├── utils/                       # Utilidades
│   │   ├── nutrition.js             # Cálculos nutricionales (TMB, TDEE, macros)
│   │   └── cycleUtils.js            # 13 ciclos anuales de 28 días con fechas fijas
│   ├── App.jsx, main.jsx, index.css # App root y estilos (Tailwind 4)
│   └── documents/                   # Documentos legales (MD)
│
├── vite.config.js                   # Config Vite + Tailwind plugin
├── vercel.json                      # Rewrites SPA (frontend)
├── package.json                     # Scripts raíz: dev:all, build, preview, lint, test
├── .vercel/, .vercelignore          # Metadatos despliegue frontend
├── backups/                         # Snapshots zip del proyecto
└── DOCUMENTO TÉCNICO...docx         # Documento Word existente (previo)
```

Referencias de código útiles:
- Arranque backend: `backend/server.js`
- Rutas de alimentos: `backend/src/routes/foodRoutes.js`
- Controlador alimentos: `backend/src/controllers/foodController.js`
- Persistencia JSON: `backend/src/utils/JsonStore.js`
- Axios baseURL dinámico: `src/services/api.js`

## 2. Herramientas y Tecnologías

Backend
- Node.js 20 (Docker base: node:20-alpine).
- Express 5.2.1, CORS, Morgan, JSON Web Token (jsonwebtoken 9.x), bcryptjs 3.x.
- Persistencia en dev: archivos JSON mediante JsonStore.
- Modo DB opcional: PostgreSQL (pg 8.x) o MySQL (mysql2 3.x) según variables; cliente abstraído en `backend/src/config/dbClient.js`.
- Integraciones IA opcionales: IA local (Ollama) por HTTP (axios 1.x).

Frontend
- React 19, React Router 7.
- Vite 7, Tailwind CSS 4 (vía @tailwindcss/vite).
- Axios 1.x para API.

Dev/Build
- Concurrency dev: `concurrently` para correr front+back: ver `package.json`.
- Lint con ESLint 9; Vitest presente (sin tests aún).

Despliegue
- Frontend: configuración SPA con `vercel.json`.
- Backend: `backend/Dockerfile`. En producción pública se ha apuntado a Koyeb mediante `prodBase` en `src/services/api.js`.

## 3. Mapa de Funciones, Código y Descripción

Tabla principal para programadores. Resume los módulos críticos, el archivo donde vive cada responsabilidad y la descripción técnica que conviene revisar antes de tocar producción.

| Módulo | Archivo principal | Descripción técnica |
| --- | --- | --- |
| Arranque API | `backend/server.js` | Configura Express, CORS, JSON parsing, healthcheck, sincronización de cuentas demo/core y montaje de rutas `/api/*`. En modo desarrollo también mantiene endpoints de auth sobre JSON. |
| Autenticación | `backend/src/controllers/authController.js` | Registro, login, perfil y reseteo admin cuando se usa modo DB. Hashea contraseñas con bcrypt, emite JWT y normaliza datos de usuario. |
| Middleware JWT | `backend/src/middleware/auth.js` | Lee `Authorization: Bearer <token>`, valida el token y adjunta `req.user` para rutas protegidas. |
| Cliente API frontend | `src/services/api.js` | Configura Axios, resuelve la URL base local/producción, agrega token JWT y maneja errores de red/CORS en desarrollo. |
| Catálogo alimentos | `backend/src/controllers/foodController.js` | Expone búsqueda, paginación, estadísticas, CRUD admin, importación masiva y backup manual del catálogo. |
| Persistencia JSON | `backend/src/utils/JsonStore.js` | Abstracción de lectura/escritura de archivos JSON con creación de directorios y backups timestamp. |
| Recetas | `backend/src/controllers/recipeController.js` | Gestiona biblioteca de recetas, búsqueda, CRUD e importación desde texto/tablas. |
| Registro diario | `backend/src/controllers/foodLogController.js` | Calcula ingestas por fecha, totales nutricionales y operaciones sobre el diario alimentario del usuario. |
| Health-Bot nutricional | `src/components/NutritionChat.jsx` | Genera recomendaciones, planes diarios/semanales, lista de compras y exportaciones PDF desde el plan nutricional del usuario. |
| Cálculos nutricionales | `src/utils/nutrition.js` | Contiene TMB/TDEE, macros objetivo, sustituciones por restricciones, armado de comidas y planes semanales. |
| Administración usuarios | `src/components/AdminUsers.jsx` | UI para crear, editar, asignar roles/gimnasios/entrenadores y resetear contraseñas desde administración. |
| Gimnasios y ecosistema | `src/components/AdminGyms.jsx` | Gestión de gimnasios y visibilidad del modelo multi-gimnasio/marca blanca. |
| Clases en Vivo (Admin) | `src/components/AdminLiveClasses.jsx` | Creación y gestión de clases en vivo, links de Zoom y plantillas por programa. |
| Horario Gráfico | `src/components/LiveClassSchedule.jsx` | Vista semanal tipo grilla con colores por franja horaria, inscripción, cupos enmascarados (regla del 19) y asistencia automática al entrar a Zoom. |
| Clases en Vivo (Usuario) | `src/components/LiveClasses.jsx` | Calendario multi-vista (mes/semana/día/gráfico) de clases con filtro por `programId`. |
| Programas D28D | `src/components/AdminProgramsManager.jsx` | Gestión de los 3 programas (Vital, Pancitas, Virtual D28D), credenciales Zoom por programa y selección del ciclo activo de los 13 anuales. |
| Ciclos de 28 días | `src/utils/cycleUtils.js` | Definición de 13 ciclos anuales exactos (364 días). Fechas fijas del Ciclo 7 al 13 según calendario proporcionado. |
| Entrenamiento IA | `src/components/TrainingModule.jsx` | Módulo de rutinas con lógica biomecánica y configuración CV. |
| Maestro Rutinas | `src/components/AdminTrainingManager.jsx` | Plantillas de entrenamiento, gestión de rutinas y diario de ejercicio. |
| Galería Videos | `src/components/AdminTrainingGallery.jsx` | Administración de videos de YouTube por ejercicio para rutinas y clases. |
| Auditoría | `src/components/AuditDashboard.jsx` | Panel de auditoría del sistema (solo super_admin). |
| Documento técnico Word | `scripts/md-to-docx.mjs` | Convierte este Markdown a `.docx`, preservando encabezados, listas, bloques de código y tablas con columnas Word reales. |

## 4. Funcionalidades Implementadas

Autenticación (dos modos)
- Modo DEV (por defecto): usuarios persistidos en `backend/data/users.json` vía `backend/src/models/UserDatabase.js`. Rutas implementadas directamente en `backend/server.js`.
- Modo DB (si `USE_DB_AUTH=true`): rutas de `backend/src/routes/authRoutes.js` montadas en `/api/auth` llaman a `backend/src/controllers/authController.js`. JWT firmado con `JWT_SECRET`.

Catálogo de Alimentos
- Listado con paginación opcional `?page=1&pageSize=25` y búsqueda por nombre/categoría en `backend/src/controllers/foodController.js`.
- Estadísticas por categoría en `getStats`.
- CRUD admin (crear/actualizar/eliminar) + import masivo + respaldo manual en `foodController`.
- Frontend de gestión con paginador y resumen en `src/components/AdminFoodsManager.jsx`.

Recetas
- API pública de consulta y búsqueda + rutas protegidas para crear/editar/eliminar/importar: `backend/src/routes/recipeRoutes.js` y `backend/src/controllers/recipeController.js`.
- UI de biblioteca, búsqueda, modal de detalle con escalado por porciones, e importación por texto en `src/components/Recipes.jsx`.

Registro Diario (Food Log) y Totales
- Cálculo de totales por fecha expuesto en `/api/food-log/totals?fecha=YYYY-MM-DD`. Panel de resumen del día en `src/components/Dashboard.jsx`.

Sugerencias con IA y Equivalentes
- Endpoints `/api/ai/*` autenticados en `backend/src/routes/aiRoutes.js`.
- Generación de sugerencias usando IA local (Ollama) o fallback determinístico con equivalentes: ver `backend/src/controllers/aiController.js`.

Módulos de Administración
- Usuarios/Roles, Planes, Gimnasios, Entrenadores, Cuentas: rutas en `/api/*` (ver carpeta routes) y vistas en `src/components/*` (AdminUsers, AdminPlans, AdminGyms, AdminTrainers, AdminCompanies).

Módulo de Entrenamiento
- Rutinas biomecánicas con IA, asignación por entrenador, diario de ejercicio y galería de videos YouTube.
- Componentes: `TrainingModule.jsx`, `AdminTrainingManager.jsx`, `AdminTrainingGallery.jsx`.

Clases en Vivo y Programas D28D
- Tres programas principales dentro del módulo D28D: **Vital**, **Pancitas Fit** y **Virtual D28D**.
- Cada programa tiene credenciales Zoom dedicadas:
  - Zoom 1: `D28Dzoom1@gmail.com` / Zoom 2: `d28dzoom2@gmail.com` (Virtual D28D)
  - Zoom P: `Pancitasfitbyd28d@gmail.com` (Pancitas)
  - Zoom V: `D28dvital@gmail.com` (Vital)
- **Horario gráfico semanal** (`LiveClassSchedule.jsx`) con 5 franjas horarias (6:20am, 8:20am, 9:00am, 6:20pm, 7:00pm), colores por franja y 6 días (Lunes a Sábado).
- **Regla de cupos enmascarados**: El sistema muestra "Cupos disponibles: 20" inicialmente. Cuando se alcanzan 19 inscripciones, el display se congela en "1 Disponible" pero permite inscripciones ilimitadas adicionales.
- **Asistencia automática**: Al hacer clic en "Entrar a Zoom", se registra la asistencia del usuario vinculada a su gimnasio antes de abrir el enlace.
- Inscripción directa desde el horario gráfico con botón "Inscribirme" / "Entrar a Zoom".

Estructura de 13 Ciclos Anuales
- Cada año se divide en **13 ciclos de 28 días** (364 días exactos). Definidos en `src/utils/cycleUtils.js`.
- Fechas asignadas del Ciclo 7 al 13:
  - Ciclo 7: 1 Junio | Ciclo 8: 29 Junio | Ciclo 9: 27 Julio | Ciclo 10: 24 Agosto
  - Ciclo 11: 21 Septiembre | Ciclo 12: 19 Octubre | Ciclo 13: 16 Noviembre
  - Ciclo 1 (Vacacional): 14 Diciembre
- El administrador puede seleccionar el ciclo activo por programa desde `AdminProgramsManager`.

Navegación Modular del Dashboard
- El Dashboard organiza la plataforma en **4 servicios principales** (cards hero): Food Plan, D28D, Entrenadores y Maestro Gym.
- Al entrar a D28D se muestran las cards de Vital, Pancitas y Virtual D28D, más las herramientas administrativas (solo para super_admin/admin_d28d).
- El Super Admin tiene acceso directo a todos los módulos desde la barra de navegación superior.

## 5. Características Específicas y Decisiones

- Modo dual de autenticación:
  - DEV: JSON persistente para rapidez y menor fricción.
  - DB: PostgreSQL/MySQL vía `dbClient` configurable por variables. La lógica de auth cambia a `authController` y rutas `/api/auth` (JWT emitido con expiración configurable).
- CORS estricto por lista blanca:
  - Orígenes permitidos por defecto + `CORS_ORIGIN` (CSV). Ver `backend/server.js`.
- Sincronización de cuentas demo/core en arranque (dev/DB):
  - Creación/actualización de usuarios demo y cuentas núcleo. Ver `syncDemoAndCoreAccounts()` en `backend/server.js`.
- Persistencia JSON con backups timestamp:
  - `JsonStore.backup()` crea archivos `*.backup.YYYY...json`. Ver `backend/src/utils/JsonStore.js`.
- Frontend selecciona base de API automáticamente:
  - Si está en `localhost`, fuerza `http://localhost:3001/api`; en producción, usa `VITE_API_BASE_URL` o `prodBase`. Ver `src/services/api.js`.
- Interceptores Axios:
  - Inyecta `Authorization: Bearer <token>` y repara base ante CORS/red en dev. Ver `src/services/api.js`.
- UI y estilos:
  - Tailwind CSS 4 con utilidades componibles (botones, modales). Clases globales en `src/index.css`.

## 6. Configuración y Despliegue

Variables de Entorno (backend)
- Puerto y CORS:
  - `PORT` (por defecto 3001).
  - `CORS_ORIGIN` (CSV de orígenes adicionales).
- Autenticación:
  - `USE_DB_AUTH` (`true|false`): activa modo DB.
  - `JWT_SECRET` (requerido en modo DB; en dev usa fallback `'secret_key_dev'` en algunos paths).
  - `JWT_EXPIRES_IN` (ej. `7d`).
- Base de datos (modo DB):
  - `DB_CLIENT` (`pg`|`mysql`), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
  - `DB_SSL` (`true|false`), `DB_CA_PATH` (ruta del CA si se usa SSL).
- IA (opcional):
  - `OLLAMA_BASE_URL`, `OLLAMA_MODEL` (IA local).
- DEMO/Seed:
  - `DEMO_USER_EMAIL`, `DEMO_PASSWORD`, `CORE_ACCOUNT_EMAILS` (CSV), `CORE_PASSWORD`.
- Persistencia JSON:
  - `JSON_DATA_DIR` (directorio alterno para archivos .json).

Variables (frontend)
- `VITE_API_BASE_URL`: base de la API para producción; el código añade `/api` si falta. En local siempre usa `http://localhost:3001/api`.

Scripts
- Raíz:
  - `npm run dev:all` — corre frontend (Vite) y backend (nodemon) en paralelo.
  - `npm run build` — build Vite.
  - `npm run preview` — previsualización estática en puerto 10000.
- Backend:
  - `npm run dev` — arranque con nodemon.
  - `npm start` — producción.
  - `npm run cleanup:foods` — limpieza de catálogo (script utilitario).

Despliegue
- Frontend (Vercel): SPA con rewrites a `index.html` (vercel.json). Permitir dominio en CORS del backend.
- Backend (Docker/Koyeb u otro PaaS):
  - Construcción con `backend/Dockerfile` (Node 20-alpine). Exponer `PORT=3001` y definir variables anteriores.
  - Asegurar `JWT_SECRET` robusto, CORS, y red privada hacia la base de datos si aplica.

## 7. Flujos Principales (Código y Datos)

Registro y Login
1) Frontend
   - `AuthContext.jsx` expone `register` y `login` vía `authService`.
   - `authService` vive en `src/services/api.js`.
2) Backend
   - Modo DEV (JSON): rutas en `backend/server.js` con hashing bcrypt y emisión JWT.
   - Modo DB: `backend/src/controllers/authController.js`.
3) Perfil
   - Front: `getProfile` en montaje de `AuthContext` si existe token (localStorage).
   - Back: `/api/auth/profile` valida JWT y devuelve datos del usuario (DEV y DB).

Gestión de Alimentos (Admin)
1) Listado con filtros y paginación desde `src/components/AdminFoodsManager.jsx`.
2) API:
   - GET `/api/foods` y `/api/foods/search` con `page`/`pageSize`. Ver `backend/src/controllers/foodController.js`.
   - GET `/api/foods/stats` para resumen por categoría.
3) Altas/Bajas/Cambios requieren rol admin. Verificación por middleware JWT en `backend/src/middleware/auth.js`.

Recetas
1) Front: listado/búsqueda y modal “Ver Detalles” con escalado por porciones en `src/components/Recipes.jsx`.
2) Back: CRUD y `import` admin en `backend/src/controllers/recipeController.js`.

Food Log y Resumen Diario
1) API totales día: `/api/food-log/totals?fecha=YYYY-MM-DD` (ver rutas/controlador).
2) Front: panel resumen en `src/components/Dashboard.jsx`, sección “Resumen del Día”.

IA: Sugerencias y Equivalentes
1) Endpoints autenticados en `backend/src/routes/aiRoutes.js`.
2) Fallback sin IA: cálculos determinísticos en `backend/src/controllers/aiController.js` y `src/utils/nutrition.js`.

## 8. Consideraciones de Seguridad y Buenas Prácticas

- Mantener `JWT_SECRET` fuera del repositorio (variables de entorno/secret manager).
- En producción, habilitar CORS solo para el dominio del frontend; revisar `CORS_ORIGIN`.
- En modo DB, usar SSL y red privada hacia la BD (variables `DB_SSL` y CA si aplica).
- No loguear secretos; revisar mensajes de consola en dev antes de producción.
- Rate limiting y cabeceras seguras (pendiente de refuerzo si se despliega públicamente).

## 9. Arranque Rápido (Desarrollo)

Frontend + Backend (desde raíz):

```bash
npm run dev:all
```

URLs locales:
- Frontend: http://localhost:5175
- Backend: http://localhost:3001/api/health

## 10. Glosario de Variables Clave

- `USE_DB_AUTH`: Activa modo autenticación con Base de Datos.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: Firma/expiración de tokens.
- `DB_CLIENT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_CA_PATH`: Conexión a BD.
- `CORS_ORIGIN`: Lista de orígenes permitidos (CSV).
- `VITE_API_BASE_URL`: Base de API en frontend (prod).
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`: Configuración de IA local (opcional).

---

## 11. Roles del Sistema

| Rol | Acceso |
| --- | --- |
| `super_admin` | Acceso total a todos los módulos, barra rápida de navegación global |
| `admin_d28d` | Programas D28D, clases en vivo, maestro de programas |
| `admin_gym` | Maestro Gym, empresas, usuarios, planes |
| `admin_marca` | Marca blanca, gimnasios, usuarios |
| `admin_gimnasio` | Gestión del gimnasio asignado |
| `entrenador` | Módulo de entrenamiento, galería de videos |
| `nutricionista` | Food Plan, calculadora admin |
| `usuario_final` | Calculadora, food log, recetas, clases públicas, mi cuenta |

---

Esta documentación refleja el estado actual del repositorio (Mayo 2026) y enlaza a las secciones de código relevantes para facilitar la incorporación de nuevos desarrolladores.
