# Auditoría Profunda y Plan de Profesionalización del Ecosistema

**Fecha:** 13 de mayo de 2026
**Alcance:** todo el repositorio `MVPFOOD` (frontend React, backend Express, datos JSON, documentación).
**Restricción de la fase:** **NO ejecutar cambios masivos**. Este documento es **diagnóstico + recomendaciones priorizadas**, no implementación.
**Audiencia:** equipo fundador y técnico que decidirá el plan de remediación.

> Toda observación cita archivo y, cuando aplica, líneas concretas. Cero invento.

---

## Resumen ejecutivo (TL;DR)

El ecosistema tiene **buena visión estratégica** (consolidada en la documentación previa) pero el **código aún no acompaña esa madurez**. Hay tres bloques de problemas:

1. **Seguridad operativa con riesgos críticos** (uno catalogado como **bloqueante para piloto real**).
2. **Sobre-promesa visible de IA y biomecánica** en el copy y en el código activo.
3. **Producto disperso** (1 dispatcher monolítico, 4 dashboards por módulo, 5 roles administrativos casi sinónimos, navegación inconsistente).

Lo positivo: la persistencia ya está en `JsonStore`, los modelos están separados, hay plan para multi-tenant y la estrategia de marca blanca está bien pensada.

**Recomendación general:** antes del piloto real, ejecutar `P0 + P1` (mitigar bloqueantes y limpiar narrativa). El resto se prioriza después del primer ciclo de piloto, no antes.

---

## 1. Hallazgos por nivel de criticidad

### P0 — BLOQUEANTE (no se puede salir a piloto real con esto)

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| P0-1 | **Contraseñas reales de cuentas Zoom de D28D versionadas en texto plano en el repo.** | `backend/data/program_settings.json` líneas 5–7, 13–15, 23–32 (4 cuentas Gmail con sus passwords). |
| P0-2 | **`JWT_SECRET` con fallback hardcodeado `'secret_key_dev'`** en 4 lugares. Si `process.env.JWT_SECRET` no está definido, la app firma tokens con un secreto público. | `backend/server.js` líneas 299, 338, 368, 405; `backend/src/middleware/auth.js` línea 11. |
| P0-3 | **CORS abierto al mundo + credenciales habilitadas.** El middleware ad-hoc setea `Access-Control-Allow-Origin: origin \|\| '*'` y `Access-Control-Allow-Credentials: true`. Combinación rechazada por la spec y, en la práctica, expone los tokens a cualquier origen. | `backend/server.js` líneas 41–54. La librería `cors` está importada (línea 3) pero **nunca se usa**. |
| P0-4 | **Endpoints `/api/dev/*` que resetean contraseñas y devuelven listas de usuarios.** Solo están gated por `NODE_ENV !== 'production'`. Si por error se despliega sin esa variable, queda un endpoint público que **resetea contraseñas a `'admin123'`** por defecto. | `backend/server.js` líneas 126–161. |
| P0-5 | **Rutas de lectura públicas sin auth en datos de marca/coach.** `GET /api/gyms`, `GET /api/gyms/:id`, `GET /api/trainers` y todas las búsquedas exponen emails, teléfonos, WhatsApp y configuración de marcas a cualquier internauta. | `backend/src/routes/gymRoutes.js` líneas 8–11; `backend/src/routes/trainersRoutes.js` líneas 8–12. |
| P0-6 | **`POST /api/training/plan-json` es público sin auth.** Está montado **antes** del `router.use(authMiddleware)`. La doc (`docs/TRAINING_MODULE.md`) afirma que requiere `Authorization: Bearer`. Contradicción. | `backend/src/routes/trainingRoutes.js` línea 8 vs línea 12. |
| P0-7 | **`window.apiConfig` global expuesto en frontend** permite a cualquier script en la página redirigir todas las llamadas autenticadas (con su JWT en `Authorization`) a un host arbitrario via `window.apiConfig.setBase(...)`. Es un *open token relay*. | `src/services/api.js` líneas 105–138. |
| P0-8 | **Logs de contraseñas temporales en stdout** del backend (`console.log('Contraseña temporal generada para …')`). | `backend/server.js` líneas 191 y 244. |
| P0-9 | **Multi-tenant declarativo, no real.** `getAllGyms` devuelve **todos** los gyms a cualquier admin (incluido `admin_gimnasio`, sin filtrar por su gym). `update`/`delete` no validan ownership. | `backend/src/controllers/gymController.js` líneas 11–20, 132–151, 173–191. |

### P1 — ALTO (impacta narrativa, percepción de profesionalismo o seguridad media)

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| P1-1 | **Sobre-promesa de IA visible al usuario final.** La tarjeta del módulo Training muestra: *"🏋️ Módulo Entrenamiento IA — Genera rutinas con lógica biomecánica y configuración CV en JSON"*. Es exactamente la narrativa que la consolidación documental dijo eliminar. | `src/components/Dashboard.jsx` líneas 277–280. |
| P1-2 | **Prompt de Ollama exige al modelo "citar PubMed / ISSN / ACSM / WHO"**, generar "Análisis Biomecánico" y recomendar ejercicio según ACSM. Cualquier LLM local cumplirá esto inventando citas. | `backend/src/controllers/aiController.js` líneas 219–258 (sección "INSTRUCCIONES DE ACTUACIÓN PROFESIONAL"). |
| P1-3 | **`aiController.isEnabled` siempre devuelve `true`.** El check es `Boolean(ollamaBaseUrl)` y `ollamaBaseUrl` tiene default `'http://localhost:11434'`. El frontend no puede distinguir si Ollama responde realmente. | `backend/src/controllers/aiController.js` líneas 12, 120–127. |
| P1-4 | **Branding hardcodeado en el shell**: `🍽️ D28D GYM virtual` en la navbar. White-label no se aplica al título principal. | `src/components/Dashboard.jsx` línea 425. |
| P1-5 | **Plan nutricional hardcodeado e idéntico para todos los usuarios** (`{ calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 }`). Las barras de progreso del Dashboard se calculan contra ese plan, no contra el plan real del usuario. | `src/components/Dashboard.jsx` línea 38; uso en líneas 348–372. |
| P1-6 | **Coach Realtime suspendido por flag pero el componente sigue en el bundle**, importa `poseCv.js` y depende de `window.PoseDetector`, una API que **no existe nativamente en ningún navegador estándar**. Si alguien activa el flag, falla. | `src/components/TrainingRealtimeCoach.jsx` líneas 1–8, 185–188; importado por `src/components/TrainingModule.jsx`. |
| P1-7 | **`syncDemoAndCoreAccounts()` se ejecuta en cada arranque del backend, también en producción**, y reemplaza/crea contraseñas con `process.env.CORE_PASSWORD || 'Admin!234'`. Si la env var no está, se sobreescriben hashes con `Admin!234`. | `backend/server.js` líneas 63–99 y 673. |
| P1-8 | **Duplicación masiva del montaje de rutas**: cada router se monta en `/api/*` y también sin prefijo (`/calculator`, `/foods`, `/admin`, etc.). Idem para auth (`/api/auth/login`, `/auth/login` con copia íntegra del handler inline). Cualquier cambio se debe duplicar. | `backend/server.js` líneas 168–434, 622–665. |
| P1-9 | **Caos de naming de roles administrativos**: `admin`, `super_admin`, `admin_marca`, `admin_gimnasio`, `admin_gym`, `admin_d28d`, `admin_food_plan`, `admin_training`, `entrenador`, `nutricionista`, `usuario_final`. El frontend usa `admin_gym` y `admin_marca` para Maestro Gym; el backend (`gymController.checkAdminRole`) sólo acepta `admin_gimnasio`. → Permisos rotos en silencio. | `src/components/Dashboard.jsx` líneas 88, 214, 231–233, 282, 290, 321, 405, 450; `backend/src/controllers/gymController.js` línea 5; `backend/src/utils/accessControl.js` líneas 19–61. |
| P1-10 | **Adminhandler INLINE en `server.js` que duplica `adminRoutes`**. Hay rutas `/api/admin/users*` definidas con código inline (líneas 467–614) y otras vía `adminRoutes`. Difícil rastrear quién hace qué. | `backend/server.js` líneas 467–614 vs `backend/src/routes/adminRoutes.js`. |
| P1-11 | **`paymentsRoutes` existe pero NUNCA se monta en `server.js`.** Toda `paymentsController.js` y `PaymentsDatabase.js` es código muerto colgando del repo. | `backend/server.js` (no aparece `paymentsRoutes`); archivo `backend/src/routes/paymentsRoutes.js` existe. |
| P1-12 | **77 backups de `users.json` versionados en `backend/data/backups/2026-02-21_*`** tomados a 1 segundo de distancia. Hashes bcrypt y emails reales en el repo. | `backend/data/backups/` (>77 directorios con `users.json`). |
| P1-13 | **`api.js` "auto-repair" salta a `http://localhost:5175/api`** (puerto del **frontend**, no del backend que es 3001). Si CORS falla, intenta apuntar al frontend → bucle de errores. | `src/services/api.js` líneas 76–84 y 119. |
| P1-14 | **URL de producción hardcodeada en frontend**: `https://reluctant-blair-foodplan-8ceace9e.koyeb.app`. Difícil de cambiar y revela infraestructura. | `src/services/api.js` línea 2. |

### P2 — MEDIO (deuda relevante, no urgente)

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| P2-1 | **`Dashboard.jsx` es un monolito de 614 líneas** que combina shell + dispatcher de 18 vistas + 4 sub-dashboards + barra rápida super_admin + chat. Ninguna pantalla puede explicarse a sí misma. | `src/components/Dashboard.jsx` íntegro. |
| P2-2 | **12 archivos de contexto** en `src/context/`: `AuthContext.jsx` + `authContext.js` + `authCtx.js` + `useAuth.js` + `authContext.js` (zombie). Mismo patrón en i18n y toast. Hay 4 variantes para algo que debería ser 1 provider + 1 hook. | `src/context/AuthContext.jsx`, `authContext.js`, `authCtx.js`, `useAuth.js`, `I18nContext.jsx`, `i18nCtx.js`, `i18nContext.js`, `useI18n.js`, `ToastContext.jsx`, `toastContext.js`, `toastCtx.js`, `toast.js`. |
| P2-3 | **`AdminVideoGallery.jsx` vs `AdminTrainingGallery.jsx`**: dos componentes con responsabilidad solapada. El Dashboard usa `AdminTrainingGallery` y `AdminVideoGallery` aparece huérfano. | `src/components/AdminVideoGallery.jsx`; no aparece importado en `Dashboard.jsx`. |
| P2-4 | **`Login.jsx` legacy junto a `ModernLogin.jsx`**. `App.jsx` solo usa `ModernLogin`; `Login.jsx` es código zombie. | `src/App.jsx` línea 3 (importa `ModernLogin`); `src/components/Login.jsx` no se importa en ningún lado activo. |
| P2-5 | **Botón "Health-Bot"** en el FAB del Dashboard cuando los docs y la consolidación dicen llamarlo "Asistente Nutricional". | `src/components/Dashboard.jsx` línea 603. |
| P2-6 | **Naming de campos inconsistente** en backend: `teléfono` con tilde y `telefono` sin tilde **en el mismo body**. El gymController acepta ambos y guarda los dos. | `backend/src/controllers/gymController.js` líneas 75–76 y 103–104. |
| P2-7 | **`seedD28DData()` se ejecuta automáticamente en cada arranque** sin verificación de idempotencia documentada. Posible inflado del `live_classes.json` (258 KB). | `backend/server.js` líneas 674–679; `backend/data/live_classes.json` (258 KB). |
| P2-8 | **`localStorage_backup.json` en `backend/data/`**: archivo sospechoso (¿por qué un dump de localStorage en backend?), con datos no documentados. | `backend/data/localStorage_backup.json`. |
| P2-9 | **`sanitizeKey` y `INVALID_KEYS`** son código zombie de la migración de OpenAI/Google nunca limpiado. Confunde al lector. | `backend/src/controllers/aiController.js` líneas 5–10. |
| P2-10 | **Inconsistencia entre el modelo Ollama default**: docs dicen `llama3`, código dice `llama3.1:8b`. | `docs/MANUAL_PLATAFORMA_D28D.md` línea 365 vs `backend/src/controllers/aiController.js` línea 13. |
| P2-11 | **`adminRoutes` no chequea rol explícitamente**, solo `authMiddleware`. La autorización está implícita en el controller. Frágil. | `backend/src/routes/adminRoutes.js` líneas 7–8. |
| P2-12 | **Sin logger estructurado consistente**. `winston` está en dependencies pero conviven `console.log`, `console.warn`, `console.info` en server, controllers y frontend. | `backend/server.js` (>20 `console.*`); `src/services/api.js`, `src/components/Dashboard.jsx`, etc. |
| P2-13 | **`Dashboard.jsx` dispara `Promise.all` a 3 endpoints admin (`/live-classes/admin`, `/training/admin/gallery`, `/programs`) cuando el usuario entra al módulo D28D**, sin importar el rol. Usuario final genera 403/401 silenciosos en cada visita. | `src/components/Dashboard.jsx` líneas 66–84. |
| P2-14 | **Componentes `Forbidden.jsx`, `Unauthorized.jsx`, `RouterBoundary.jsx`** existen pero `App.jsx` no usa router (renderiza `ModernLogin` o `Dashboard` directo). Componentes huérfanos. | `src/App.jsx`; archivos en `src/components/`. |
| P2-15 | **Internationalización a medias**: `src/i18n/es.js` y `src/i18n/en.js` están cableados via `useI18n`, pero el Dashboard tiene strings hardcodeados en español sin pasar por `t(...)` en muchas tarjetas (líneas 277, 284, 292, 304, 310, 316, 323, 331). | `src/components/Dashboard.jsx`. |

### P3 — BAJO (mejoras de calidad o estética)

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| P3-1 | Imágenes de tarjetas hero del Dashboard son URLs de **Unsplash** (asset externo, dependencia de red). | `src/components/Dashboard.jsx` líneas 167, 175, 183, 191. |
| P3-2 | Health check duplicado: `/health` y `/api/health`. | `backend/server.js` líneas 115–119, 617–619. |
| P3-3 | Endpoint de test público `POST /api/test` echo de body. Útil en dev, peligroso en prod si alguien lo usa para bypass. | `backend/server.js` líneas 121–123. |
| P3-4 | `morgan('dev')` usado en producción si `NODE_ENV` no es `production`. Logs verbose. | `backend/server.js` línea 59. |
| P3-5 | `React.StrictMode` activo + `useEffect` que no validan rol antes de hacer fetch → llamadas dobles + 403 dobles en consola. | `src/main.jsx` línea 11; `src/components/Dashboard.jsx` `useEffect`. |
| P3-6 | Lenguaje técnico en pantalla: "Endpoint", "JSON", "tracking_logic" pueden colarse via copy o en el card descrito en P1-1. | `src/components/Dashboard.jsx` línea 278. |
| P3-7 | Faltan estados vacíos consistentes en tablas administrativas. | inferido del tamaño de archivos `Admin*.jsx`. |

---

## 2. Lista consolidada de **módulos problemáticos**

| Módulo | Síntomas | Riesgo |
| --- | --- | --- |
| **Auth (`server.js` inline + `authRoutes`)** | Endpoints duplicados `/api/auth/*` y `/auth/*`, dos handlers inline idénticos, secret con fallback público. | Alto (seguridad + mantenimiento). |
| **Gyms** | Rutas públicas sin auth, sin multi-tenant, naming roles inconsistente. | Alto (privacidad/multi-tenant). |
| **Trainers** | Rutas públicas sin auth. | Alto. |
| **Training (plan-json)** | Endpoint público sin auth pese a doc que dice lo contrario. | Alto. |
| **Realtime Coach** | Componente fantasma, depende de API inexistente, sigue en el bundle. | Medio (riesgo de activación accidental). |
| **AI Controller** | Prompt sobre-promesa pseudocientífica, `isEnabled` mentiroso, código zombie. | Alto (narrativa). |
| **Payments** | Controller + rutas + DB pero NO montado en server.js. | Bajo (es código muerto, pero confunde). |
| **Dashboard.jsx** | Monolito 614 líneas, plan hardcodeado, white-label no aplicado, navegación múltiple. | Alto (UX + percepción). |
| **Contextos** | 12 archivos para 3 conceptos (Auth, i18n, Toast). | Medio (mantenibilidad). |
| **`backend/data/`** | Backups masivos versionados, `localStorage_backup.json`, `program_settings.json` con passwords. | **Crítico** (seguridad). |

---

## 3. Features sobreprometidas (qué decimos vs qué hace)

| Promesa visible | Realidad en el código | Veredicto |
| --- | --- | --- |
| "Módulo Entrenamiento IA — Genera rutinas con lógica biomecánica y configuración CV en JSON" | El generador es plantillas determinísticas; CV no se ejecuta. | Eliminar la frase del card. |
| "Análisis Biomecánico" en respuesta IA | El backend pide al LLM citar PubMed/ACSM y "Análisis Biomecánico" sin validación; el modelo lo inventa. | Reescribir el prompt o eliminar la sección biomecánica del prompt. |
| "Coach Biomecánico en Tiempo Real" | Componente que depende de `window.PoseDetector` (no existe). | Mover a roadmap, sacar del bundle. |
| "Real-time audio feedback" en JSON de planes | No hay ejecución real; solo datos. | Documentar como "estructura preparada" (ya está en `TRAINING_MODULE.md`), evitar mostrarlo en UI. |
| "Health-Bot" como copy del FAB | Asistente nutricional simple sobre catálogo + Ollama opcional. | Renombrar a "Asistente". |
| "Marca blanca real" | El shell del Dashboard hardcodea "D28D GYM virtual" y el plan del usuario. | Implementar branding y plan reales antes de vender white-label. |
| "Multi-tenant" | Listado de gyms y trainers totalmente público; no hay filtro por tenant. | Bloqueante para piloto multi-marca. |

---

## 4. Componentes redundantes / código muerto

- `src/components/AdminVideoGallery.jsx` (no se importa en Dashboard).
- `src/components/Login.jsx` (legacy de `ModernLogin.jsx`).
- `src/components/Forbidden.jsx`, `Unauthorized.jsx`, `RouterBoundary.jsx` (no hay router en `App.jsx`).
- `src/components/TrainingRealtimeCoach.jsx` y `src/utils/poseCv.js` (suspendido por flag, depende de API inexistente).
- `src/context/authContext.js`, `src/context/authCtx.js`, `src/context/i18nCtx.js`, `src/context/i18nContext.js`, `src/context/toastContext.js`, `src/context/toastCtx.js`, `src/context/toast.js` (variantes zombie).
- `backend/src/controllers/paymentsController.js`, `backend/src/routes/paymentsRoutes.js`, `backend/src/models/PaymentsDatabase.js` (no montado).
- `backend/src/controllers/aiController.js` líneas 5–10 (`sanitizeKey`, `INVALID_KEYS`).
- `backend/data/backups/2026-02-21_*` (77 directorios).
- `backend/data/localStorage_backup.json`.
- Handlers inline en `server.js` líneas 171–433 que duplican `authRoutes`.
- Handlers inline en `server.js` líneas 467–614 que solapan `adminRoutes`.
- Cada router montado dos veces (`/api/*` y `/*`).

---

## 5. Riesgos consolidados

### 5.1 Riesgos UX
- Producto sentido como "ERP fitness" por la barra rápida super_admin de 8 botones (Dashboard líneas 437–446).
- Usuario final ve módulos antes de ver "qué hago hoy" (la UI es un selector de servicios, no un plan).
- Roles mezclados con módulos: el usuario final nunca debería ver tarjetas con "Admin", "Maestro", "Galería" deshabilitadas o no.
- Naming inconsistente: "Health-Bot", "Entrenamiento IA", "Maestro de Programas" — mezcla técnica + comercial + interna.
- Branding del cliente NO visible en navbar; siempre dice "D28D GYM virtual".
- Plan nutricional fake (mismo para todos) impacta confianza.

### 5.2 Riesgos técnicos visibles
- Seguridad (P0-1 a P0-9 arriba).
- Mantenibilidad: server.js de 689 líneas con código duplicado en `/api/*` y `/*`.
- Polución del bundle frontend con CV/Realtime Coach inactivo.
- Bundle aún acepta `window.apiConfig` para reapuntar URL del API.
- 12 contextos creando ambigüedad de imports.
- `Dashboard.jsx` sin separación de responsabilidades.

### 5.3 Riesgos comerciales/narrativos
- Cualquier comercial que muestre el card "Genera rutinas con lógica biomecánica y configuración CV en JSON" pierde credibilidad o crea expectativa imposible de cumplir.
- Si un cliente piloto descubre las contraseñas Zoom en el repo, es un evento de pérdida de confianza inmediato.
- White-label vendido pero **no implementado en el shell**; un piloto se da cuenta el día 1.
- Roles `admin_marca` / `admin_gimnasio` / `admin_gym` casi sinónimos confunden al onboarding del cliente.

---

## 6. Recomendaciones priorizadas

### Sprint 0 — "Tapar el techo" (1–2 días, **bloqueante para piloto**)
Trabajo puramente de remediación, no de feature.

1. **Sacar del repo `program_settings.json` con credenciales Zoom** (P0-1):
   - mover los emails/passwords a variables de entorno o a un secret store,
   - **rotar las 4 contraseñas Zoom** asumiendo compromiso,
   - dejar en JSON solo `id`, `name`, `color`, `active`, `active_cycle_id`,
   - agregar `program_settings.json` a `.gitignore` y dejar `program_settings.example.json` con placeholders.

2. **Eliminar `JWT_SECRET` con fallback** (P0-2):
   - si la env var no está, el server **debe negarse a arrancar**.

3. **Reemplazar el CORS hecho a mano por la librería `cors`** (P0-3) usando whitelist desde `CORS_ORIGIN`. Eliminar el middleware ad-hoc inseguro.

4. **Cerrar `/api/dev/*`** (P0-4): exigir `ENABLE_DEV_ROUTES=true` además de `NODE_ENV !== 'production'`. Eliminar el default de password `'admin123'`.

5. **Proteger `GET /api/gyms` y `GET /api/trainers`** (P0-5): exigir `authMiddleware` + filtrar por `gym_id` / `brand_id` del JWT.

6. **Mover `POST /api/training/plan-json` detrás de auth** (P0-6).

7. **Eliminar `window.apiConfig`** (P0-7) y los helpers expuestos. La base del API se decide al cargar y no se cambia en runtime.

8. **Quitar `console.log` que imprime contraseñas temporales** (P0-8). Reemplazar por logger estructurado sin payload.

9. **Implementar filtro multi-tenant real en gym/trainers/training** (P0-9): el JWT trae `gym_id`/`trainer_id`, las queries deben respetarlo.

10. **Borrar `backend/data/backups/2026-02-21_*` del repo y agregar `backend/data/backups/` a `.gitignore`** (P1-12).

### Sprint 1 — "Profesionalizar narrativa" (3–5 días, hace producto vendible)

1. **Eliminar/reescribir copy de IA y biomecánica visible** (P1-1, P1-4, P2-5):
   - Card de Training: *"Tu rutina del día y el seguimiento de tus sesiones."*
   - FAB "Health-Bot" → *"Asistente"*.
   - Navbar: aplicar `gym.brand_name` y `gym.logo_url` reales.

2. **Reescribir prompt de IA** (P1-2): quitar PubMed/ACSM/WHO, quitar "Análisis Biomecánico" y "Recomendación de Ejercicio". Pedir solo sugerencias prácticas con porciones y razón en lenguaje plano.

3. **`isEnabled` debe hacer un ping real a Ollama** (P1-3) con timeout corto.

4. **Eliminar plan nutricional hardcodeado** (P1-5): consumir `/plan` real del usuario o, si no hay plan, mostrar estado vacío con CTA para asignar plan.

5. **Sacar `TrainingRealtimeCoach` y `poseCv` del bundle** (P1-6): mover a `_archive/` o controlarlo con import dinámico solo cuando el flag se reactive.

6. **Limpiar `syncDemoAndCoreAccounts` para producción** (P1-7): solo correr cuando `SEED_DEMO=true` y nunca con default de password.

### Sprint 2 — "Limpieza de código" (3–5 días, deuda técnica)

1. **`server.js` debe quedar < 100 líneas**:
   - mover handlers inline de auth y admin a sus rutas.
   - eliminar el doble montaje `/api/*` y `/*`.
   - migrar `console.*` a `winston`.

2. **Unificar contextos** (P2-2): un solo `AuthContext.jsx` + `useAuth.js`, idem i18n y toast. Borrar las 7 variantes zombie.

3. **Eliminar componentes huérfanos** (P2-3, P2-4, P2-14): `AdminVideoGallery`, `Login`, `Forbidden`, `Unauthorized`, `RouterBoundary` (o cablearlos si se va a introducir router).

4. **Borrar código muerto en backend**: `paymentsController/Routes/Database` si no se usa, `sanitizeKey` en `aiController`.

5. **Decidir matriz oficial de roles** (P1-9): elegir 6 roles máximo y eliminar `admin_gym` o `admin_marca` (son redundantes con `admin_gimnasio`/`admin_marca`). Reflejarlo en backend, frontend y docs.

6. **Estandarizar naming de campos backend** (P2-6): solo `telefono` sin tilde.

### Sprint 3 — "Consolidar experiencia" (5–10 días, alinea con consolidación documental)

1. **Refactorizar `Dashboard.jsx`** según `ARQUITECTURA_VISIBLE_EXPERIENCIA.md`:
   - separar shell (navbar + brand) del dispatcher de vistas,
   - introducir router real (React Router ya está en `package.json`),
   - usuario final entra a "Mi Plan" / "Mi Progreso" como vista por defecto, no a un selector de servicios,
   - barra rápida super_admin movida a un layout admin separado (no superpuesta al usuario final).

2. **Consolidar dashboards admin densos** (P2-1): cada `Admin*` debe tener filtros, paginación visible y estado vacío con CTA.

3. **Aplicar branding del gym en todas las pantallas** del usuario final.

4. **i18n al 100%** en pantallas que se ven al usuario final.

### Sprint 4 — "Hardening operacional" (continuo)

1. Logger estructurado (`winston`) único (P2-12).
2. Rate limit también en dev para endpoints de auth.
3. Idempotencia explícita en `seedD28DData()` (P2-7).
4. Auditoría real de acciones admin (hoy `audit-logs` existe pero no está poblado/protegido).
5. Limpiar `backend/data/localStorage_backup.json` (P2-8).
6. Borrar/reducir `live_classes.json` si vino inflado por seed acumulado (P2-7).

---

## 7. Qué consolidar / qué ocultar / qué a roadmap / qué mantener

### 7.1 Consolidar (mantener pero mejorar)
- Auth + RBAC base (con secret obligatorio).
- Persistencia JSON con `JsonStore`.
- Modelos de Training, Food, Recipes, FoodLog, Live Classes.
- Marca blanca conceptual (terminar de aplicarla en UI).
- Gobernanza descrita en `ECOSISTEMA_MODULAR_MARCA_BLANCA.md`.
- Programas D28D (clases, ciclos, asistencia auditable).
- Ollama opcional con fallback determinístico.

### 7.2 Ocultar / suspender en UI hasta que existan de verdad
- Toda mención a "biomecánica", "CV", "Análisis Postural", "Coach Biomecánico".
- Card "Módulo Entrenamiento IA" (renombrar a "Mi Entrenamiento").
- "Health-Bot" como nombre de marca del chat.
- Métricas que muestran `--` (Asistencia Promedio, Rutinas Asignadas, Sesiones Completadas, Alertas Pendientes) → o se calculan o se ocultan.

### 7.3 Mover explícitamente a roadmap futuro (`ROADMAP_REALISTA_ECOSISTEMA.md`)
- Realtime Coach + visión computacional (P1-6).
- Periodización IA avanzada.
- Marketplace.
- Analytics multi-marca con drill-down.
- Pagos integrados (`paymentsController` no está cableado).
- Marca blanca con dominio propio (subdominios) — hoy solo es slug.
- Auditoría completa con UI dedicada.

### 7.4 Mantener como Core Actual visible y vendible
- Login + perfil.
- Calculadora nutricional + food log.
- Recetas + equivalentes.
- Plan de entrenamiento (sin Realtime Coach).
- Galería de videos por ejercicio.
- Live classes con asistencia auditable.
- Programas D28D y ciclos.
- Maestro Gym con branding básico.
- Asistente nutricional simple (Ollama opcional, fallback siempre).

---

## 8. Estado conceptual del ecosistema (post-auditoría)

- **Estrategia y narrativa:** ✅ consolidadas (fase anterior).
- **Producto vendible (UX usuario final):** ⚠ medio. Necesita Sprint 1 mínimo.
- **Producto vendible (panel coach/gym):** ⚠ medio. Las tablas existen pero el shell mezcla todo.
- **Seguridad:** 🔴 con bloqueantes (Sprint 0).
- **Multi-tenant real:** 🔴 declarativo, no implementado (Sprint 0).
- **IA "invisible y útil":** ⚠ aún se vende como protagonista.
- **Marca blanca real:** ⚠ definida en docs, no aplicada en shell.
- **Listo para piloto controlado:** ❌ hasta cumplir Sprint 0 + Sprint 1.
- **Listo para escalar:** ❌ hasta Sprint 0 + 1 + 2 + 3.

---

## 9. Recomendaciones antes de tocar código (checklist)

- [ ] Confirmar prioridad: empezar por **Sprint 0** (es lo único bloqueante real).
- [ ] **Rotar las 4 cuentas Zoom** comprometidas hoy mismo, antes de tocar código.
- [ ] Decidir si el repo es público o privado, y reaccionar en consecuencia (los hashes y emails ya están versionados).
- [ ] Hacer **backup íntegro** de `backend/data/` antes de borrar backups (la información operativa real puede estar mezclada con backups).
- [ ] Definir/firmar la **matriz oficial de roles** (P1-9) antes de tocar cualquier permiso. Sin esa decisión, cualquier refactor RBAC nace torcido.
- [ ] Validar con stakeholders esta priorización antes de abrir PRs.
- [ ] Mantener este documento como **input del backlog técnico** (cada hallazgo P0/P1/P2 debería convertirse en una issue con su ID).

---

## 10. Riesgos de "no hacer nada" (orden de impacto)

1. **Compromiso real de cuentas Zoom** (passwords en repo) → afecta operación de D28D directamente.
2. **Token JWT comprometido** vía `window.apiConfig` o vía secret hardcodeado → cualquier sesión es secuestrable.
3. **Cliente piloto detecta sobre-promesa de IA o de white-label** → pérdida de confianza y churn.
4. **Multi-tenant inexistente** → un gym ve datos de otro gym el día que se sumen dos al piloto.
5. **Bundle pesado y con código muerto** → performance pobre en móvil LATAM (mercado objetivo).

---

## 11. Cierre

El ecosistema está más cerca de un **producto sólido** de lo que parece, pero hoy la **distancia está en seguridad y en alineación entre código y narrativa**, no en falta de features.

Si se ejecuta **Sprint 0 + Sprint 1**, el ecosistema queda listo para **piloto controlado** según `PILOTO_ECOSISTEMA_FITNESS.md`.
Si se ejecuta hasta **Sprint 3**, queda listo para **expandir GTM** según `GTM_LATAM_COACHES_Y_GYMS.md`.

**Cero cambios de feature requeridos para llegar ahí.** Solo limpieza, seguridad y narrativa.

---

*Auditoría READ-ONLY. Ningún archivo del sistema fue modificado en esta fase. Todos los hallazgos están respaldados por archivo + líneas verificables. Versión 1.0 — 13 de mayo de 2026.*
