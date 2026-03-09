# Documento Técnico para Programadores — Food Plan

Este documento describe la arquitectura, herramientas, funcionalidades, decisiones de diseño, configuración/despliegue y flujos principales del proyecto Food Plan. Está basado exclusivamente en el código y archivos de configuración presentes en el repositorio.

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
│   │   │   ├── aiController.js      # Sugerencias/recetas IA (OpenAI/Gemini o fallback)
│   │   │   ├── gymController.js, trainersController.js, accountsController.js, planController.js, paymentsController.js
│   │   ├── middleware/
│   │   │   └── auth.js              # Verificación JWT (Authorization: Bearer ...)
│   │   ├── models/                  # Modelos con persistencia JsonStore
│   │   │   ├── UserDatabase.js      # Usuarios (JSON), hashing bcrypt
│   │   │   ├── FoodDatabase.js      # Catálogo de alimentos (semillas y CRUD)
│   │   │   ├── RecipeDatabase.js    # Recetas (get/search/create/update/delete/replaceAll)
│   │   │   ├── DailyFoodLog.js, AccountsDatabase.js, TrainersDatabase.js, GymDatabase.js, PaymentsDatabase.js, UserPlanStore.js, CalculatorConcepts.js
│   │   └── routes/                  # Rutas API (montadas en server.js)
│   │       ├── authRoutes.js        # Modo DB: /api/auth/*
│   │       ├── foodRoutes.js        # /api/foods (auth)
│   │       ├── recipeRoutes.js      # /api/recipes
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
│   │   ├── Dashboard.jsx            # Home/app shell + navegación interna
│   │   ├── ModernLogin.jsx, Register.jsx, ProtectedRoute.jsx
│   │   ├── FoodLog.jsx, AdminFoodsManager.jsx, Recipes.jsx
│   │   ├── AdminUsers.jsx, AdminPlans.jsx, AdminGyms.jsx, AdminTrainers.jsx, AdminCompanies.jsx
│   │   ├── Calculator.jsx, AdminCalculator.jsx
│   │   ├── MyAccount.jsx, Progress.jsx, Equivalentes.jsx
│   │   └── NutritionChat.jsx, PrivacyPolicyModal.jsx, TermsOfServiceModal.jsx, etc.
│   ├── context/                     # Contextos (Auth, I18n, Toast) y hooks
│   │   ├── AuthContext.jsx, useAuth.js
│   │   ├── I18nContext.jsx, useI18n.js, i18n/
│   │   └── ToastContext.jsx (...)
│   ├── services/
│   │   └── api.js                   # Axios baseURL dinámico + interceptores
│   ├── utils/                       # Utilidades de nutrición
│   │   └── nutrition.js
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
- Arranque backend: [server.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L64-L92)
- Rutas de alimentos: [foodRoutes.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/routes/foodRoutes.js#L9-L20)
- Controlador alimentos (paginación/stats): [foodController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L4-L27), [stats](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L137-L151)
- Persistencia JSON: [JsonStore.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/utils/JsonStore.js#L16-L31)
- Axios baseURL dinámico: [api.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L11-L22)

## 2. Herramientas y Tecnologías

Backend
- Node.js 20 (Docker base: node:20-alpine).
- Express 5.2.1, CORS, Morgan, JSON Web Token (jsonwebtoken 9.x), bcryptjs 3.x.
- Persistencia en dev: archivos JSON mediante JsonStore.
- Modo DB opcional: PostgreSQL (pg 8.x) o MySQL (mysql2 3.x) según variables; cliente abstraído en [dbClient.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/config/dbClient.js).
- Integraciones IA opcionales: OpenAI/Gemini por HTTP (axios 1.x).

Frontend
- React 19, React Router 7.
- Vite 7, Tailwind CSS 4 (vía @tailwindcss/vite).
- Axios 1.x para API.

Dev/Build
- Concurrency dev: `concurrently` para correr front+back: ver [package.json raíz](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/package.json#L9-L16).
- Lint con ESLint 9; Vitest presente (sin tests aún).

Despliegue
- Frontend: configuración SPA con [vercel.json](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/vercel.json#L1).
- Backend: [Dockerfile](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/Dockerfile#L1-L9). En producción pública se ha apuntado a Koyeb (ver `prodBase` en [api.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L2)).

## 3. Funcionalidades Implementadas

Autenticación (dos modos)
- Modo DEV (por defecto): usuarios persistidos en `backend/data/users.json` vía [UserDatabase.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/models/UserDatabase.js). Rutas implementadas directamente en [server.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L144-L199, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L243-L317, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L319-L354).
- Modo DB (si `USE_DB_AUTH=true`): rutas de [authRoutes.js] montadas en `/api/auth` llaman a [authController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/authController.js). JWT firmado con `JWT_SECRET`.

Catálogo de Alimentos
- Listado con paginación opcional `?page=1&pageSize=25` y búsqueda por nombre/categoría: [getAllFoods/searchFoods](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L4-L27) y [L69-L113].
- Estadísticas por categoría: [getStats](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L137-L151).
- CRUD admin (crear/actualizar/eliminar) + import masivo + respaldo manual: [foodController](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L239-L376, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L384-L404).
- Frontend de gestión con paginador y resumen: [AdminFoodsManager.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/AdminFoodsManager.jsx#L35-L66, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/AdminFoodsManager.jsx#L75-L83).

Recetas
- API pública de consulta y búsqueda + rutas protegidas para crear/editar/eliminar/importar: [recipeRoutes.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/routes/recipeRoutes.js#L6-L16), [recipeController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/recipeController.js#L4-L16).
- UI de biblioteca, búsqueda, modal de detalle con escalado por porciones, e importación por texto: [Recipes.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/Recipes.jsx#L333-L339, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/Recipes.jsx#L346-L435).

Registro Diario (Food Log) y Totales
- Cálculo de totales por fecha expuesto en `/api/food-log/totals?fecha=YYYY-MM-DD` (ver rutas/controlador en backend). Panel de resumen del día en [Dashboard.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/Dashboard.jsx#L148-L179).

Sugerencias con IA y Equivalentes
- Endpoints `/api/ai/*` autenticados: [aiRoutes.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/routes/aiRoutes.js#L6-L20).
- Generación de sugerencias usando OpenAI/Gemini o fallback determinístico con equivalentes: [aiController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/aiController.js#L112-L176, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/aiController.js#L350-L369).

Módulos de Administración
- Usuarios/Roles, Planes, Gimnasios, Entrenadores, Cuentas: rutas en `/api/*` (ver carpeta routes) y vistas en `src/components/*` (AdminUsers, AdminPlans, AdminGyms, AdminTrainers, AdminCompanies).

## 4. Características Específicas y Decisiones

- Modo dual de autenticación:
  - DEV: JSON persistente para rapidez y menor fricción.
  - DB: PostgreSQL/MySQL vía `dbClient` configurable por variables. La lógica de auth cambia a `authController` y rutas `/api/auth` (JWT emitido con expiración configurable).
- CORS estricto por lista blanca:
  - Orígenes permitidos por defecto + `CORS_ORIGIN` (CSV). Ver [server.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L68-L89).
- Sincronización de cuentas demo/core en arranque (dev/DB):
  - Creación/actualización de usuarios demo y cuentas núcleo. Ver `syncDemoAndCoreAccounts()` en [server.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L26-L63).
- Persistencia JSON con backups timestamp:
  - `JsonStore.backup()` crea archivos `*.backup.YYYY...json`. Ver [JsonStore.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/utils/JsonStore.js#L16-L31).
- Frontend selecciona base de API automáticamente:
  - Si está en `localhost`, fuerza `http://localhost:3001/api`; en producción, usa `VITE_API_BASE_URL` o `prodBase`. Ver [api.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L11-L22).
- Interceptores Axios:
  - Inyecta `Authorization: Bearer <token>` y repara base ante CORS/red en dev. Ver [api.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L46-L55, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L55-L92).
- UI y estilos:
  - Tailwind CSS 4 con utilidades componibles (botones, modales). Clases de modal global: [index.css](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/index.css#L85-L99).

## 5. Configuración y Despliegue

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
  - `OPENAI_API_KEY`, `GOOGLE_API_KEY`.
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

## 6. Flujos Principales (Código y Datos)

Registro y Login
1) Frontend
   - `AuthContext.jsx` expone `register` y `login` vía `authService`: [AuthContext.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/context/AuthContext.jsx#L28-L40).
   - `authService` en [api.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/services/api.js#L130-L135).
2) Backend
   - Modo DEV (JSON): rutas en [server.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L144-L199, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/server.js#L243-L317) con hashing bcrypt y emisión JWT.
   - Modo DB: [authController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/authController.js#L5-L23, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/authController.js#L68-L99).
3) Perfil
   - Front: `getProfile` en montaje de `AuthContext` si existe token (localStorage).
   - Back: `/api/auth/profile` valida JWT y devuelve datos del usuario (DEV y DB).

Gestión de Alimentos (Admin)
1) Listado con filtros y paginación desde [AdminFoodsManager.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/AdminFoodsManager.jsx#L42-L66).
2) API:
   - GET `/api/foods` y `/api/foods/search` con `page`/`pageSize`. Ver [foodController](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L4-L27, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/foodController.js#L69-L113).
   - GET `/api/foods/stats` para resumen por categoría.
3) Altas/Bajas/Cambios requieren rol admin. Verificación por middleware JWT: [auth.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/middleware/auth.js#L3-L18).

Recetas
1) Front: listado/búsqueda y modal “Ver Detalles” con escalado por porciones: [Recipes.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/Recipes.jsx#L346-L435).
2) Back: CRUD y `import` (admin) en [recipeController.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/recipeController.js#L43-L79, file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/recipeController.js#L81-L142).

Food Log y Resumen Diario
1) API totales día: `/api/food-log/totals?fecha=YYYY-MM-DD` (ver rutas/controlador).
2) Front: panel resumen en `Dashboard.jsx`, sección “Resumen del Día”: [Dashboard.jsx](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/src/components/Dashboard.jsx#L148-L179).

IA: Sugerencias y Equivalentes
1) Endpoints autenticados (ver [aiRoutes.js](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/routes/aiRoutes.js)).
2) Fallback sin IA: cálculos determinísticos en [aiController.getSuggestedFoods](file:///Users/cesargomez/Desktop/PROYECTOFOOD%20PLAN/backend/src/controllers/aiController.js#L124-L176) y `getQuickSuggestions`.

## 7. Consideraciones de Seguridad y Buenas Prácticas

- Mantener `JWT_SECRET` fuera del repositorio (variables de entorno/secret manager).
- En producción, habilitar CORS solo para el dominio del frontend; revisar `CORS_ORIGIN`.
- En modo DB, usar SSL y red privada hacia la BD (variables `DB_SSL` y CA si aplica).
- No loguear secretos; revisar mensajes de consola en dev antes de producción.
- Rate limiting y cabeceras seguras (pendiente de refuerzo si se despliega públicamente).

## 8. Arranque Rápido (Desarrollo)

Frontend + Backend (desde raíz):

```bash
npm run dev:all
```

URLs locales:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001/api/health

## 9. Glosario de Variables Clave

- `USE_DB_AUTH`: Activa modo autenticación con Base de Datos.
- `JWT_SECRET`, `JWT_EXPIRES_IN`: Firma/expiración de tokens.
- `DB_CLIENT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_CA_PATH`: Conexión a BD.
- `CORS_ORIGIN`: Lista de orígenes permitidos (CSV).
- `VITE_API_BASE_URL`: Base de API en frontend (prod).
- `OPENAI_API_KEY`, `GOOGLE_API_KEY`: Claves IA (opcional).

---

Esta documentación refleja el estado actual del repositorio y enlaza a las secciones de código relevantes para facilitar la incorporación de nuevos desarrolladores.

