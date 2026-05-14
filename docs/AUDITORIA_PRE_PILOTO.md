# AUDITORÍA PRE-PILOTO — D28D Gimnasio Virtual

> Fecha: 2026-05-14
> Alcance: ecosistema completo (frontend, backend, datos, UX por rol, dominio nutricional y de entrenamiento).
> Objetivo: dejar la plataforma **estable, profesional, humana, sin hype y lista para piloto real controlado**.
> No se agregan features. Solo se consolida, limpia, profesionaliza, archiva y endurece.

Referencias documentales obligatorias respetadas:
`ARQUITECTURA_VISIBLE_EXPERIENCIA.md`, `CONSOLIDACION_ESTRATEGICA_ENTREGABLE.md`,
`ECOSISTEMA_MODULAR_MARCA_BLANCA.md`, `GTM_LATAM_COACHES_Y_GYMS.md`,
`MANUAL_PLATAFORMA_D28D.md`, `PILOTO_ECOSISTEMA_FITNESS.md`,
`AUDITORIA_PROFESIONALIZACION_ECOSISTEMA.md`.

---

## 0. Resumen ejecutivo

- El sistema base (auth, JWT, multi-tenant, modularidad por rol, branding por gym) **es sólido**.
- Hay **deuda visible al usuario final** (hype IA, jerga técnica, "biomecánica", "coach virtual", roles técnicos, "Maestro X") que rompe la promesa narrativa "mi plan, mi progreso, mis clases, mi coach".
- Existen **datos fake en producción de demo** (Rick Roll en galería de ejercicios, prefijo "JDQR - " en catálogo de alimentos, recetas vacías y planes idénticos para 5 usuarios) que descalifican el piloto.
- Hay **huecos de seguridad multi-tenant** (creación de cuentas y usuarios que no fuerzan `gym_id` desde el JWT, endpoints sin validación de rol, secreto `.env.bak` en disco).
- Hay **código muerto significativo**: 10+ componentes frontend huérfanos y 3 módulos backend no montados.
- La narrativa del **gym marca blanca** está casi lograda; el último bloqueante es que la home universal sigue rotulada D28D y no deja respirar la marca del gym.

Con los fixes P0 incluidos en este documento, el ecosistema queda **apto para piloto operativo controlado**. P1 son los cierres profesionales pre-comercial. P2 son pulidos pre-escala.

---

## 1. Hallazgos priorizados

### P0 — Bloqueantes para piloto

#### P0-A · Hype IA, biomecánica fake y "coach virtual" visibles al usuario

| # | Archivo:línea | Hallazgo |
|---|---|---|
| A1 | `src/components/AISuggestions.jsx:175,181` | Título "🤖 Asistente Nutricional IA" + toggle "🔴 IA Activada / ⚪ Modo Rápido" visible al usuario final dentro de `FoodLog` y `Progress`. |
| A2 | `src/components/Register.jsx:204-222` | Bloque "Biomecánica Inteligente (Opcional pero Recomendado)" + 3 inputs (`longitud_tronco`, `longitud_femur`, `envergadura_brazos`) + narrativa "teoría de palancas / fémur largo = mejor Hack Squat vs Libre". No es consumido por ninguna lógica. |
| A3 | `src/components/TrainingModule.jsx:228,437,445,510` | "Coach Virtual en pantalla dividida (video y cámara)", botón "Ver coach", h4 "Coach Virtual - Video Referencia". No implementado. |
| A4 | `src/components/TrainingModule.jsx:84` | Toast "No se pudo contactar con la IA…" hace explícita una dependencia IA. |
| A5 | `src/components/TrainingModule.jsx:526` | Mensaje al usuario: "Cárgala en admin para habilitar el split-screen completo". Filtra jerga interna. |
| A6 | `src/components/AdminTrainingGallery.jsx:49,51` | "Training Video Gallery" + "Esta base alimenta el Coach Virtual en pantalla dividida". |
| A7 | `src/components/AdminTrainingManager.jsx:199` | Botón "+ Asignar Nuevo Plan (IA)". |
| A8 | `backend/src/controllers/trainingController.js:535` | API devuelve `reason: 'Adaptación biomecánica ideal.'` visible al usuario. |
| A9 | `backend/src/controllers/trainingController.js:151-344, 417` | `buildCvTrackingLogic` genera `primary_landmarks:[11,12,…32]`, `validation_rules`, `real_time_audio_feedback` en cada plan diario. No hay UI que lo consuma (archivada). Sigue ocupando payload y filtra MediaPipe en API. |

#### P0-B · Jerga técnica / ERP filtrada al usuario final

| # | Archivo:línea | Hallazgo |
|---|---|---|
| B1 | `src/components/LiveClasses.jsx:143,213` | Badge "D28D bloqueado" / "Calendario D28D bloqueado para consumo de marcas blancas" expuesto al usuario. |
| B2 | `src/components/LiveClassSchedule.jsx:95,99-100` | "Programación Modular", "D28D GLOBAL", "METODO D28D" en header. Tapa la marca del gym. |
| B3 | `src/components/MyAccount.jsx:203-209` | Sección "Roles Asignados" mostrando badges `usuario_final`, `admin_gimnasio`, etc. en uppercase al usuario. |
| B4 | `src/components/LiveClassesPanel.jsx:196` | "Hablá con tu coach…" (voseo) inconsistente con el resto en español neutro LATAM. |
| B5 | `src/components/TrainingModule.jsx:301,459` | "💾 Guardar Diario Oficial" y "REGISTRO DE EJECUCIÓN" en mayúsculas estilo formulario burocrático. |
| B6 | `src/components/Calculator.jsx:290-291` | Usuario final lee "TMB" y "TDEE" sin explicación. |

#### P0-C · Bug React real

| # | Archivo:línea | Hallazgo |
|---|---|---|
| C1 | `src/components/NutritionChat.jsx:88-96` | `useEffect` re-inicializa la conversación cada vez que cambia `bienvenida`, `plan.calorias`, `plan.macros.*` o `user?.objetivo`. Se borra el historial del usuario al recalcular su plan. |

#### P0-D · Branding incorrecto restante

| # | Archivo:línea | Hallazgo |
|---|---|---|
| D1 | `src/components/NutritionChat.jsx:148,192` | PDFs descargan como `plan-semanal-foodplan.pdf` / `plan-diario-recetas.pdf`. Branding viejo. |
| D2 | `src/components/AdminDashboard.jsx:139,221` | "FoodPlan." / "FoodPlan Admin" hardcodeados. (Mitigado porque el componente es huérfano → archivar.) |

#### P0-E · Datos fake en producción de demo

| # | Archivo:línea | Hallazgo |
|---|---|---|
| E1 | `backend/data/exercises_gallery.json:14-189` (+ `TrainingPlansStore.js:41-42`) | 20/21 ejercicios apuntan al **Rick Roll** (`dQw4w9WgXcQ`). Default del store igual. |
| E2 | `backend/data/foods.json:142-799` | 47 ítems con prefijo proveedor `"JDQR - …"` filtrado al buscador del usuario final. |
| E3 | `backend/data/foods.json:730-743` (id 53) | "Claras de huevo 100g" con `carbohidratos: 7` y `grasas: 2`. Valores reales ≈ 0.7 / 0.2. |
| E4 | `backend/data/foods.json:478-491` (id 35) | Leche entera 240ml: 110 kcal pero 7p+11c+7g = 135 kcal. Inconsistente. |
| E5 | `backend/data/user_plans.json:1-52` | 5 usuarios distintos con **plan idéntico** `2000 / 150p / 250c / 65g · Mantenimiento · Moderado`. |
| E6 | `backend/data/recipes.json` | Ids 1–19 y 20–38 son los mismos 19 platos duplicados. Todos con `cantidad:"al gusto"`, `instrucciones:[]`, `descripcion:""`, `tiempo_preparacion:"15 min"`, `imagen:null`. |

#### P0-F · Seguridad y multi-tenant

| # | Archivo:línea | Hallazgo |
|---|---|---|
| F1 | `backend/src/controllers/accountsController.js:119-158` | `createAccount` acepta `gym_id` / `trainer_id` desde `req.body` sin forzarlos al JWT. Cualquier `usuario_final` puede atribuir su cuenta a otro gym. |
| F2 | `backend/src/controllers/accountsController.js:173-193` | `updateAccount` no usa `canAccessEntity` → admin_gimnasio puede modificar cuentas de otros gyms. |
| F3 | `backend/src/controllers/accountsController.js:290-315` | `useSession` sin owner check → cualquier autenticado decrementa sesiones de cualquier id. |
| F4 | `backend/server.js:418-454` | `POST /api/admin/users` permite a `admin_gimnasio` crear usuarios con `rol` arbitrario y `gym_id` libre → **privilege escalation directa**. |
| F5 | `backend/server.js:456-480` | `PUT /api/admin/users/:id/role` no valida que el target sea del mismo gym del admin. |
| F6 | `backend/src/controllers/programController.js:22-30` + `backend/src/routes/programRoutes.js:8` | `updateProgram` solo exige token, no rol → cualquier autenticado sobreescribe la config global de programas. |
| F7 | `backend/src/controllers/liveClassController.js:102-135` | `createClass` no fuerza `gym_id` al gym del admin. |
| F8 | `backend/src/controllers/liveClassController.js:17-19` | `canAccessClass` compara con `===` (string vs number) → falsos negativos. |
| F9 | `backend/.env.bak` | Secreto JWT débil legacy (`foodplan_dev_secret_2026`) en disco. No está en `.gitignore`. |
| F10 | `backend/.env:3` | JWT_SECRET real expuesto (rotar antes de cualquier validación con usuarios reales). |

#### P0-G · Código muerto que ensucia el ecosistema

Frontend huérfano (sin import desde grafo activo):

- `src/components/AdminDashboard.jsx` (panel "FoodPlan Admin" con claves Stripe/PayPal fake).
- `src/components/AdminTrainers.jsx` (solo lo usaba `AdminDashboard`).
- `src/components/AdminVideoGallery.jsx` (sustituido por `AdminTrainingGallery.jsx`).
- `src/components/Login.jsx` (App usa `ModernLogin`).
- `src/components/RouterBoundary.jsx`, `ProtectedRoute.jsx`, `Forbidden.jsx`, `Unauthorized.jsx` (App no usa router).
- `src/components/dashboard/CoachView.jsx`, `dashboard/GymAdminView.jsx`, `dashboard/SuperAdminHome.jsx` (exportados, nunca importados).
- `src/components/Sidebar.jsx`, `src/components/Navbar.jsx` (huérfanos por ausencia de layout/router).

Backend huérfano (no montado en `server.js`):

- `backend/src/routes/paymentsRoutes.js`, `backend/src/controllers/paymentsController.js`, `backend/src/models/PaymentsDatabase.js`.
- `backend/src/models/FoodItems.js` (sin consumidores).
- `backend/src/config/database.js` (duplicado de `dbClient.js`).

---

### P1 — Alta (cerrar antes de comercializar)

- **Ruta duplicada** `/api/auth/admin/reset-password`: `authRoutes.js:16` + handler inline `server.js:368`, con listas de roles incompatibles.
- **`aiController.generateRecipe` siempre mock** (`aiController.js:410-438`); el frontend ofrece "Generar receta" que nunca cambia. Esconder el botón o eliminar el endpoint.
- **Stubs silenciosos en food-log** (`foodLogController.js:106-119`): seis endpoints (`getMealCombos`, `bulkAddFoods`, `getUserHistory`, `aggregateByGym`, `aggregateByTrainer`, `updateLogEntry`, `removeFromLog`) responden `success:true` sin tocar datos → riesgo de UX engañosa.
- **`seedD28DData()` corre siempre** al arrancar (`server.js:585-590`) en lugar de gated por `SEED_DEMO=true`.
- **Endpoints públicos no documentados**: `GET /api/calculator/concepts*`, `GET /api/accounts/plans`, `GET /api/recipes*`. O agregar `auth` o declararlos públicos por contrato.
- **Validación débil**: varios controladores devuelven 500 en lugar de 400 cuando falta payload (`aiController.analyzeDayBalance`, `getQuickSuggestions`, `accountsController.getExpiringAccounts`).
- **`hasRole`** sin usar en `accountsController` (9 puntos), `foodController` (5 puntos), `recipeController:84` que incluso menciona un rol inexistente `'admin'`. Rompe usuarios multi-rol.
- **AdminController.getAuditLogs** interpola `LIMIT ${parseInt(limit)}` sin guarda → `LIMIT NaN` → 500.
- **Copy ERP**: "Maestro de Administración de Entrenamientos" (`AdminTrainingManager.jsx:161`), "Maestro alimentos", "Maestro D28D", "Maestro Entrenadores", "Maestro Gym". Reemplazar por verbos humanos.
- **Cards con verbos genéricos** (`Abrir`/`Administrar`/`Gestionar`/`Ver`) en 5 paneles distintos. Estandarizar.
- **FAB "Asistente" duplicado** (`Dashboard.jsx:344-360` y `NutritionChat.jsx:291-301`).
- **`AISuggestions` toma `slice(0,15)` del catálogo** (`aiController.js:230`) → sugerencias siempre del mismo subset.
- **Sustitución determinística trivial** (`trainingController.js:519-525`): solo 3 mapeos hardcodeados; el resto devuelve "EMPUJE PLANO EN MÁQUINA".
- **`AdminTrainingManager` densidad**: 4 tabs + 8 columnas + sub-paneles warmup/stretching/cardio. Excesivo para piloto.
- **`AdminTrainingManager.jsx:184`** declara tab "📈 Evolución & Stats" sin contenido en switch.
- **`Dashboard.jsx:280-284`** doble entrada al panel de clases (`adminliveclasses` y `liveclasses` montan ambos `LiveClassesPanel`, además del wrapper en `renderServicePanel`).
- **`liveClassController.canAccessClass`** y otros checks por `req.user.rol` directo (no `hasRole`).
- **Naming**: `gym_id` vs `gymId`, `teléfono` vs `telefono`, `país` vs `pais`, `metodoPago` vs `metodo_pago` — escoger uno y migrar.

---

### P2 — Media (pre-escala)

- `key={idx}` en `.map` (12 archivos).
- "Cargando…" sin spinner visual en `Dashboard.jsx:12`, `MyPlanView.jsx:12`, etc.
- `AdminTrainingGallery.jsx:141` `colSpan="4"` para tabla de 5 columnas.
- Touch targets <44 px en `TrainingModule.jsx:434,445,451`, `NutritionChat.jsx:426,427`.
- Typo "Proximas" sin tilde en `LiveClasses.jsx:9,40`.
- Tabs no estilizados como activos en `Progress.jsx:418-421`.
- `TermsOfService` y `PrivacyPolicy` aún mencionan "IA" de forma promocional. Reescribir.
- `nutrition.js:29` función `macrosHarvard` — renombrar a `macrosBalanceados25_50_25`.
- Dirección física hardcoded en `PrivacyPolicyModal.jsx`.
- `Progress.jsx` 4 KPIs + Rango + Filtros + Avance + Tendencia + Resumen Rápido = misma data 4 veces (densidad ERP para el usuario final).
- Bloque "Plan + Avance Semanal" duplicado idéntico en `MyPlanView.jsx:53-89`, `FoodLog.jsx:361-440`, `Progress.jsx:241-335`. Consolidar en componente único.
- Logger SQL síncrono en cada `logger.info` (riesgo en piloto si DB cae).
- `.env.example` no documenta `LOG_LEVEL`, `DB_CA_PATH`, `INITIAL_USERS_PASSWORD`.

---

## 2. Plan de remediación

### Sprint corto plazo (este push) — fixes P0 atómicos

1. **Frontend hype IA**: AISuggestions sin toggle ni "🤖 IA", TrainingModule sin "Coach Virtual / cámara / pantalla dividida", Register sin "Biomecánica Inteligente", AdminTrainingGallery sin "alimenta al Coach Virtual", AdminTrainingManager sin "(IA)".
2. **Frontend jerga**: LiveClasses sin "D28D bloqueado", LiveClassSchedule sin "Programación Modular / D28D GLOBAL", MyAccount esconde roles a usuario final, TrainingModule sin "Cárgala en admin", LiveClassesPanel español neutro.
3. **Frontend bug**: NutritionChat `useEffect` deps sólo `[bienvenida]` y solo se ejecuta si la conversación está vacía.
4. **Branding**: NutritionChat PDF usa `slugify(PUBLIC_BRAND_NAME)`.
5. **Archivar huérfanos**: mover los 10+ componentes huérfanos del frontend y los 5 del backend a `_archive/legacy/`.
6. **Datos**: limpiar Rick Roll, prefijo "JDQR - ", macros absurdos, recetas vacías y planes hardcoded.
7. **Backend payload**: `buildCvTrackingLogic`/`validation_rules`/`real_time_audio_feedback` fuera del response; mensaje `"Adaptación biomecánica ideal."` → `"Variante equivalente recomendada"`.
8. **Seguridad multi-tenant**: forzar `gym_id` desde JWT en `createAccount`, `updateAccount`, `useSession`, `POST /admin/users`, `PUT /admin/users/:id/role`, `createClass`. `canAccessClass` compara con `String(...)`.
9. **Programas**: `updateProgram` exige `super_admin`.
10. **Secretos**: borrar `.env.bak`, añadir `.env*.bak`, `*.env.bak` al `.gitignore`. Documentar rotación de JWT.

### Sprint piloto (1–2 semanas) — fixes P1 ✅ aplicados (2026-05-14)

- ✅ Unificar handler de reset-password (eliminar duplicado en `server.js`).
- ✅ `generateRecipe` mock deshabilitado por defecto (404 salvo flag
  `ENABLE_RECIPE_MOCK=true`) y botón "Chef IA" en frontend oculto detrás
  de `VITE_ENABLE_RECIPE_MOCK`.
- ✅ Cards de admin consolidadas con un único verbo "Abrir".
- ✅ Headers admin: "Maestro X" → "Plan de Alimentación",
  "D28D · Programas", "Entrenadores", "Alimentos (catálogo)",
  "Calculadora".
- ✅ `req.user.rol` directo reemplazado por `hasRole` en
  `accountsController`, `foodController` (5 puntos) y `recipeController`.
- ✅ `seedD28DData()` gated por `SEED_DEMO=true` (con fallback en dev).
- ✅ Validaciones 400 explícitas en `aiController.analyzeDayBalance` y
  `getQuickSuggestions` + foodId en `foodController`. `accountsController`
  ya las tenía desde el P0.
- ✅ `AdminTrainingManager` con 2 tabs (Planes, Editor); Stats diferido.
- ✅ FAB "Asistente" restringido al usuario final con módulo food-plan
  activo (antes lo veían coach/admins).
- 🟡 Bloque "Plan + Avance" como componente compartido → diferido al
  sprint preproducción (no bloquea piloto; `MyPlanView` ya factoriza la
  vista del usuario final).
- 🟡 Endpoints públicos (`/api/health`, login/register/reset si
  `USE_DB_AUTH=false`): documentados aquí. Decisión: se mantienen como
  están, solo health checks son anónimos. Auth está gateada por
  `authLimiter` (20 req/15 min/IP) en cualquier entorno.

### Sprint preproducción (3–4 semanas)

- Migración naming (`gym_id`, `telefono`, `pais`) — un solo schema.
- Logger SQL → batch / async.
- Empty / loading states consistentes (spinner + mensaje).
- Touch targets ≥ 44 px; key={item.id} en maps.
- `Progress.jsx` simplificación a 4 KPIs únicos.
- TermsOfService / PrivacyPolicy reescritos.
- README + `.env.example` completos.

### Sprint post-piloto

- Migración real a Postgres con `USE_DB_AUTH=true` por defecto.
- Audit logs con paginación + filtros + retención.
- Code-splitting frontend (warning bundle > 500 kB).
- Pruebas automatizadas E2E mínimas (login, asignar plan, registrar comida, agendar clase, abrir Zoom).

---

## 3. Recomendaciones específicas por área

### UX
- Home universal `ServicesHero` con marca del **gym** dominante; D28D queda como sello discreto en footer/sidebar cuando el usuario pertenece a un gym.
- Usuario final: home = "Mi día" (plan + clase de hoy + último registro). 1 clic a coach.
- Coach: home = "Mis usuarios" con tag "X días sin registrar / completó hoy". Asignación de plan/rutina en ≤ 3 clics, sin entrar a `Maestro X`.
- Admin gym: home = "Mi marca" + "Equipo" + "Calendario D28D" + "Métricas básicas" (alta, activos, adherencia 7d). Sin badges D28D rotulados en cards.

### Nutrición
- Eliminar planes hardcoded; default = sin plan → CTA "Crear plan con tu coach" / "Usar calculadora".
- Reducir catálogo público a alimentos profesionales (sin prefijo proveedor).
- Verificar macros de claras, leche y leguminosas; corregir antes de piloto.
- Recetas: dejar solo las que tengan ingredientes + macros + porciones; marcar el resto como `borrador` (oculto para usuario final).
- Mantener `aiController.getSuggestedFoods` (fallback determinístico), eliminar `generateRecipe` mock.

### Entrenamiento
- Cero biomecánica / CV en payload ni en copy.
- Galería de ejercicios: dejar solo entradas con `youtube_url` real (≈1); el resto `youtube_url: null` y UI muestra "Video pronto".
- `substituteExercise`: si no hay sustitución conocida, devolver `null` y la UI esconde el botón.
- `TrainingModule` para usuario final: vista lectura ("Tu rutina de hoy"). El formulario de auto-generación queda solo para coach.

### Coaches
- Lista de usuarios con búsqueda y filtros simples (activos / sin registro / nuevo).
- Click → ficha con plan + última semana + acción "Asignar rutina", "Asignar plan", "Mensaje".
- Templates reutilizables (etiquetadas por objetivo) en lugar de generar desde cero cada vez.

### Gimnasios marca blanca
- Branding (logo, color, mensaje WhatsApp) configurable y aplicado en navbar, footer, login, PDFs y emails.
- Calendario D28D consumido como producto, no como propietario visual.
- Onboarding gym: 1 pantalla = nombre, logo, color, link WhatsApp.

### Onboarding / Adherencia
- Registro reducido: nombre, email, teléfono, género, objetivo, gym/coach (si aplica). Resto opcional.
- Default "Mi día" tras login: muestra el plan y CTA al primer registro.
- Recordatorio simple WhatsApp/email a 24 h sin registro (post-piloto).

### LATAM
- Idioma neutro (sin voseo).
- Mostrar peso siempre en kg, altura en cm. Moneda dependiente del gym.
- Considerar formato de fecha `DD/MM/YYYY` consistente.

---

## 4. Validación de readiness

| Dimensión | Estado actual | Tras P0 | Tras P1 |
|---|---|---|---|
| Readiness piloto | ⚠️ No (hype, datos fake, multi-tenant débil) | ✅ Sí (10–20 usuarios, 1 gym, 1 coach) | ✅ Sí (50–100 usuarios, 3 gyms) |
| Readiness operacional | ⚠️ Coach hace navegación ERP | 🟡 Asignación operable, copy humano | ✅ Templates + adherencia visible |
| Readiness técnico | ⚠️ Secretos, multi-tenant, código muerto | ✅ Endurecido, limpio, JWT rotado | ✅ Endpoints documentados, errores 4xx |
| Readiness comercial | ⚠️ Branding D28D vs gym 50/50 | 🟡 Gym aparece dominante en navbar | ✅ Gym domina UI completa, PDFs/email |

**Conclusión**: con P0 aplicados, la plataforma es apta para **piloto cerrado con 1 gym y 10–20 usuarios reales**. P1 abre el comercial.

---

## 5. Anexo — Mapa de archivos a archivar / borrar / corregir

**Mover a `src/_archive/legacy/`**:
- `src/components/AdminDashboard.jsx`
- `src/components/AdminTrainers.jsx`
- `src/components/AdminVideoGallery.jsx`
- `src/components/Login.jsx`
- `src/components/RouterBoundary.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/components/Forbidden.jsx`
- `src/components/Unauthorized.jsx`
- `src/components/Sidebar.jsx`
- `src/components/Navbar.jsx`
- `src/components/dashboard/CoachView.jsx`
- `src/components/dashboard/GymAdminView.jsx`
- `src/components/dashboard/SuperAdminHome.jsx`

**Mover a `backend/_archive/legacy/`**:
- `backend/src/routes/paymentsRoutes.js`
- `backend/src/controllers/paymentsController.js`
- `backend/src/models/PaymentsDatabase.js`
- `backend/src/models/FoodItems.js`
- `backend/src/config/database.js`

**Eliminar del disco / `.gitignore`**:
- `backend/.env.bak`

**Corregir contenido**:
- `backend/data/exercises_gallery.json`
- `backend/data/foods.json`
- `backend/data/user_plans.json`
- `backend/data/recipes.json`

**Editar (frontend / copy / lógica)**:
- `src/components/AISuggestions.jsx`
- `src/components/Register.jsx`
- `src/components/TrainingModule.jsx`
- `src/components/AdminTrainingGallery.jsx`
- `src/components/AdminTrainingManager.jsx`
- `src/components/NutritionChat.jsx`
- `src/components/LiveClasses.jsx`
- `src/components/LiveClassSchedule.jsx`
- `src/components/MyAccount.jsx`
- `src/components/dashboard/LiveClassesPanel.jsx`

**Editar (backend / seguridad / payload)**:
- `backend/src/controllers/accountsController.js`
- `backend/src/controllers/liveClassController.js`
- `backend/src/controllers/programController.js`
- `backend/src/routes/programRoutes.js`
- `backend/src/controllers/trainingController.js`
- `backend/server.js` (endpoints admin de usuarios)
- `backend/.gitignore`

---

## 6. Próximos pasos

1. ✅ Aplicar P0 en commits semánticos atómicos.
2. ✅ Aplicar P1 en commits semánticos atómicos.
3. ✅ Validar `npm run build` + `npm run lint` (0 errores, 2 warnings
   preexistentes en `AuditDashboard` y `LiveClasses`).
4. ⏭ Probar con las 11 credenciales demo (`Demo!2026`) los flujos clave
   contra el ecosistema consolidado (login → home por rol → mi plan →
   registrar comida → ver clase agendada → entrar a Zoom).
5. ⏭ Etiquetar release `pre-piloto-v1`.
6. ⏭ Activar piloto cerrado con 1 gym y 10–20 usuarios.
7. ⏭ Sprint preproducción (P2): naming, README, Terms/Privacy,
   `Progress.jsx` 4 KPIs, touch targets ≥ 44px, code-splitting bundle.
