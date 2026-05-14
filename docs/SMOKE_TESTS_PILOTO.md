# Smoke tests del piloto controlado

> Versión: 1.0 — 14 de mayo de 2026.
> Objetivo: validar manualmente los flujos críticos antes de exponer el
> piloto a un gym real. Tiempo estimado: 30–45 minutos en una corrida.

## 0. Pre-vuelo

- [ ] `npm install` y `cd backend && npm install` ejecutados.
- [ ] `.env` y `backend/.env` completos. `JWT_SECRET` definido.
- [ ] `npm run build` termina sin errores ni warnings de chunk size.
- [ ] `npm run lint` reporta 0 errores (warnings preexistentes documentados OK).
- [ ] `npm run dev:all` levanta frontend en :5174 y backend en :3001.
- [ ] `curl -s http://localhost:3001/api/health` responde `{ "status": "ok" }`.

Si `SEED_DEMO=true` (o `NODE_ENV=development`), confirmar que la consola
del backend imprime `[D28D] Datos demo listos` y que existen las cuentas
demo (`admin@foodplan.local`, etc.) con contraseña `Demo!2026`.

## 1. Autenticación

| # | Acción | Resultado esperado |
|---|---|---|
| 1.1 | Login con `admin@foodplan.local` / `Demo!2026` | Acceso, navbar muestra "D28D Gimnasio Virtual" (o brand del gym), navItems: Inicio, Auditoría, Mi cuenta. |
| 1.2 | Login con `gym.demo@foodplan.local` / `Demo!2026` | Acceso, navItems: Inicio, Mi marca, Usuarios, Clases en Vivo, Galería, Mi cuenta. Sin acceso a Auditoría. |
| 1.3 | Login con `coach.demo@foodplan.local` / `Demo!2026` | Acceso, navItems: Inicio, Mis usuarios, Rutinas, Planes nutricionales, Seguimiento, Mi cuenta. FAB Asistente NO visible. |
| 1.4 | Login con `usuario.demo@foodplan.local` / `Demo!2026` | Acceso, navItems: Inicio, Mi Plan, Entrenamiento, Progreso, Clases, Mi cuenta. FAB Asistente visible (esquina inferior derecha). |
| 1.5 | Login con contraseña incorrecta 4 veces seguidas | Rate limit del `authLimiter` empieza a responder 429 cerca del 5–10 intento. |
| 1.6 | Token caducado / borrado de `localStorage` | App redirige a login al primer 401. |

## 2. Multi-tenant y permisos

| # | Acción | Resultado esperado |
|---|---|---|
| 2.1 | Como `admin_gimnasio`, `GET /api/admin/users` | Solo devuelve usuarios cuyo `gym_id` coincide con el del admin. |
| 2.2 | Como `admin_gimnasio`, crear usuario con `gym_id` distinto | Backend ignora el `gym_id` enviado y fuerza el del JWT. |
| 2.3 | Como `admin_gimnasio`, intentar asignar rol `super_admin` | 403 + mensaje. |
| 2.4 | Como `entrenador`, `POST /api/accounts` | 403 (no es admin de cuentas). |
| 2.5 | Como `usuario_final`, `GET /api/accounts/:idDeOtraCuenta/use-session` | 403. |
| 2.6 | Como `super_admin`, `PUT /api/programs/:id` | OK. |
| 2.7 | Como `admin_d28d`, `PUT /api/programs/:id` | OK. |
| 2.8 | Como `admin_gimnasio`, `PUT /api/programs/:id` | 403. |

## 3. Plan de Alimentación (usuario final)

| # | Acción | Resultado esperado |
|---|---|---|
| 3.1 | Login como usuario final → "Mi Plan" | Ver bloque "Mi plan" con calorías/macros del plan asignado. |
| 3.2 | "Mi Plan" → registrar comida desde el catálogo | El registro se guarda y los totales del día se actualizan. |
| 3.3 | "Mi Plan" → escanear un código de barras inexistente | Mensaje "Avisa a tu coach". **NO** aparece formulario "Crear alimento". |
| 3.4 | "Progreso" → ver KPIs | 4 KPIs principales visibles (cumplimiento, calorías, proteína, días registrados). Sin tabla de gimnasios/coaches. |
| 3.5 | "Progreso" → tendencia semanal | Barras de los últimos 7 días con kcal. |
| 3.6 | Abrir FAB "Asistente" | Conversación arranca, el reset al recalcular plan **no** borra historial. |
| 3.7 | Asistente → "plan diario" | Genera PDF `plan-diario-<brand>.pdf` (carga lazy de jspdf). |

## 4. Plan de Alimentación (admin / coach)

| # | Acción | Resultado esperado |
|---|---|---|
| 4.1 | Login como `admin_food_plan` → "Alimentos" | Vista del catálogo, sin "Maestro" en el título. |
| 4.2 | Crear alimento | Se guarda. Validación 400 si faltan nombre/cantidad. |
| 4.3 | Editar alimento con `foodId` no numérico (curl) | 400 con `foodId no es válido`. |
| 4.4 | Eliminar alimento | Se elimina (soft delete). |
| 4.5 | Como coach, asignar plan a usuario final desde "Configurar planes" | El usuario ve el plan actualizado al refrescar "Mi Plan". |

## 5. Entrenamiento

| # | Acción | Resultado esperado |
|---|---|---|
| 5.1 | Como usuario final → "Entrenamiento" | Header "Mi entrenamiento". Sin mención a "coach virtual", "biomecánica", "split-screen", "cámara". |
| 5.2 | Abrir un ejercicio sin video en galería | Mensaje "Video disponible próximamente". |
| 5.3 | Pedir sustitución | Reason="Variante equivalente recomendada." (sin "biomecánica"). |
| 5.4 | Guardar registro del día | Mensaje "Guardar registro" (no "Guardar Diario Oficial"). |
| 5.5 | Como `admin_training` → "Rutinas" | 2 tabs: Planes y Editor. Sin tab "Stats". |

## 6. Clases en vivo

| # | Acción | Resultado esperado |
|---|---|---|
| 6.1 | Como usuario final → "Clases" | Calendario semanal de su programa. Sin mención "D28D bloqueado". |
| 6.2 | Reservar clase y entrar a Zoom | Botón Zoom funciona. Asistencia se marca al entrar. |
| 6.3 | Como `admin_gimnasio` → "Clases en Vivo" | 2 tabs: Programar / Calendario. Solo puede programar para su gym (gym_id forzado). |
| 6.4 | Como `super_admin` o `admin_d28d` → crear clase con `gym_id=null` | Se crea como clase global D28D. |
| 6.5 | Como `admin_gimnasio` → intentar crear clase con `gym_id` de otro gym (curl) | Backend lo ignora y asigna el del admin. |

## 7. Auditoría (solo super_admin)

| # | Acción | Resultado esperado |
|---|---|---|
| 7.1 | Login como `admin_gimnasio` o usuario final | El navItem "Auditoría" **no** aparece. |
| 7.2 | Login como `super_admin` → "Auditoría" | Tabla con últimos 50 registros, paginador, total visible. |
| 7.3 | Cambiar "Por página" a 25 → recarga | Página 1 con 25 registros y `totalPages` recalculado. |
| 7.4 | Filtrar por Trace ID | Solo registros con ese `trace_id`. |
| 7.5 | Generar acción (login fallido) → refresh | Aparece nuevo registro (con latencia ≤ 2s por el batching). |

## 8. Branding (white-label)

| # | Acción | Resultado esperado |
|---|---|---|
| 8.1 | Como `super_admin`, en "Mi marca" definir `brand_name="Acme Fit"` + logo | Al cerrar/abrir sesión, navbar muestra "Acme Fit" + logo. |
| 8.2 | PDF semanal del asistente | Filename `plan-semanal-acme-fit.pdf`. |
| 8.3 | Limpiar `brand_name` | Navbar vuelve a "D28D Gimnasio Virtual". |

## 9. Mocks / endpoints deshabilitados

| # | Acción | Resultado esperado |
|---|---|---|
| 9.1 | `POST /api/ai/generate-recipe` sin flag | 404 + mensaje "Endpoint no disponible. Usa el catálogo de recetas." |
| 9.2 | Con `ENABLE_RECIPE_MOCK=true` + `VITE_ENABLE_RECIPE_MOCK=true` | Botón "Chef IA" visible en Recetas; endpoint responde 200 con mock. |
| 9.3 | `GET /api/dev/users` con `ENABLE_DEV_ROUTES=false` | 404 (ruta no montada). |

## 10. Performance básica

| # | Acción | Resultado esperado |
|---|---|---|
| 10.1 | Cargar `/` en una red 3G simulada | Bundle inicial < 250 KB gzip (vendor-pdf no se descarga). |
| 10.2 | Click en "Asistente" → "plan diario" | Descarga de vendor-pdf en ese momento. |
| 10.3 | Touch en botones desde móvil | Todos ≥ 44 px de alto. |

## 11. Limpieza post-piloto

- [ ] Exportar audit logs del periodo.
- [ ] Eliminar cuentas demo si el gym lo solicita (`SEED_DEMO=false` y borrar manualmente).
- [ ] Rotar `JWT_SECRET`.
- [ ] Backup de `backend/data/*.json` (o dump de Postgres) antes de cualquier upgrade.

---

**Si todos los tests anteriores pasan, etiquetar release `pre-piloto-v1`
y notificar al gym piloto.**
