# PILOT READINESS FIXES — MVPFOOD / D28D

Documento de cierre de la fase de estabilización pre-piloto.  
Generado: 2026-05-29 · Entorno validado: `http://localhost:3002/api`

**Criterio:** cada ítem queda **RESUELTO**, **PARCIAL** (con limitación documentada) o **DESCARTADO** (justificado).

---

## FASE 1 — BLOQUEANTES

| # | Novedad | Estado | Resultado | Evidencia / prueba |
|---|---------|--------|-----------|-------------------|
| 1 | Registro por código de gimnasio | **RESUELTO** | Wizard comercial incluye flujo «Registrarme con código» → `POST /auth/resolve-invite` con `GYM-PRO-001` → tipo `gym`, label `Gimnasio: Gym Pro Fitness` | `scripts/test_invite_codes_api.sh` OK · `RegisterCommercialWizard.jsx` |
| 2 | Registro usuario final | **RESUELTO** | Registro wizard + legacy con planes visibles; invite code pasa `gym_id`/`trainer_id`/`module_access` | E2E 14/14 OK · `Register.jsx` + wizard |
| 3 | Error 401 `/api/programs` | **RESUELTO** | Endpoint público `GET /programs/public` sin auth; registro usa `skipShellAuth` | HTTP **200** en `/programs/public` · HTTP **401** esperado en `/programs` sin token |
| 4 | Programas no visibles en registro | **RESUELTO** | Solo programas `active !== false`; planes filtrados `activo` + `visible`; boot D28D reactiva planes | `RegisterCommercialWizard.jsx` · `AccountsDatabase.js` hydrate |
| 5 | Usuarios finales no crean | **RESUELTO** | `AdminCompanies` exige plan obligatorio (backend ya requería `planId`) | `AdminCompanies.jsx` — select required + validación |
| 6 | Empresas no crean | **PARCIAL** | Panel Empresas gestiona usuarios por gym/coach; **crear gym/trainer** se hace en D28D → Gimnasios / Entrenadores (hint en UI) | Diseño intencional: no duplicar CRUD en Empresas |
| 7 | Empresas no editan | **PARCIAL** | Edición de invite code gym/trainer OK; metadata gym completa en **AdminGyms**; cambio de plan vía `PUT /admin/users/:id/assign` | InviteCodeCell en Empresas |
| 8 | Error WhiteLabelFields | **RESUELTO** | Import presente en `AdminGyms.jsx` — formulario gym no lanza `ReferenceError` | `import WhiteLabelFields from './admin/WhiteLabelFields'` |
| 9 | Vigencias sin vencimientos | **RESUELTO** | `getExpiringSoon()` parsea fechas; overview incluye licencias con `valid_until` ≤ 30 días | `AccountsDatabase.js` · `paymentAdminController.js` |
| 10 | Error Food SSO 502 | **PARCIAL** | Con `FOOD_MODULE_URL` configurado: `POST /food-module/exchange-session` → **200** + tokens. Sin URL: **503** con hint (no 502 genérico) | Prueba user `final.d28d@d28d.local` · `foodModuleRoutes.js` |
| 11 | Gimnasios no crean | **RESUELTO** | `POST /gyms` super_admin → **201** «Gym Piloto Test» id 11 | curl admin@foodplan.local |
| 12 | Usuarios no visibles | **RESUELTO** | `AdminCompanies` normaliza respuestas API con `asArray()` (gyms, trainers, plans) | Listados cargan arrays envueltos |
| 13 | Seguimiento Training error | **RESUELTO** | `super_admin`/`admin_d28d` acceden a `/training/coach/clients` vía `resolveCoachTrainerId` | HTTP **200** coach_clients |
| 14 | Zoom no genera reunión | **RESUELTO** | Dev: enlace placeholder si no hay S2S/PMI; prod: configurar `ZOOM_S2S_*` o PMI | Commit `4434859` · create class HTTP **201** |
| 15 | Horarios incorrectos | **RESUELTO** | Calendario gráfico usa `day_label` + hora real (`America/Mexico_City`); slots dinámicos desde clases | `LiveClassSchedule.jsx` |
| 16 | Calendario semanal no muestra clases | **RESUELTO** | Vista por defecto **Semanal**; 40 clases listadas para `virtual_d28d` | `LiveClasses.jsx` default `week` |

---

## FASE 2 — UX Y NOMENCLATURA

| Ítem | Estado | Notas |
|------|--------|-------|
| Aviones → Planes | **RESUELTO** | `translate="no"` + labels «Planes» en admin |
| Policía → Precio COP | **RESUELTO** | Columnas «Precio COP» / «Precio USD» en `AdminPlans.jsx` |
| Precio USD correcto | **RESUELTO** | Wizard muestra COP y USD por plan |
| Nombres planes en pagos | **RESUELTO** | `paymentMethods.js` + wizard paso moneda |
| Botones inútiles | **PARCIAL** | Revisión manual por pantalla pendiente QA visual |
| Colores ilegibles | **RESUELTO** | `.register-option` en `index.css` |
| Botón volver Training | **PENDIENTE F5** | Texto «Capacitación» en `TrainingModuleApp.jsx` |
| Textos mal traducidos | **RESUELTO** | Auditoría previa `docs/SEMANTIC_UX_AUDIT.md` |

---

## FASE 3 — PROGRAMAS Y PLANES

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Programa → Planes → Pago → Licencia → Vigencia | **RESUELTO** | E2E accounts + payment links + licencias |
| Vital / Pancitas / Virtual | **RESUELTO** | `/programs/public` lista 3 programas activos |
| CRUD planes (crear/editar/activar/ocultar/eliminar/duplicar) | **RESUELTO** | `AdminPlans.jsx` simplificado + `ProgramEditorTabs` |

---

## FASE 4 — RUTINAS Y GALERÍA

| Ítem | Estado | Notas |
|------|--------|-------|
| Crear/editar/guardar rutina manual | **RESUELTO** | E2E crea rutina OK |
| Selector ejercicios / galería | **PARCIAL** | Maestro D28D operativo; migración `trainer_id` aplicable en PG |
| Autocompletar ejercicio | **PARCIAL** | Depende de datos en galería importada |

**Migración pendiente local:** `backend/prisma/migrations/20260529120000_fix_d28d_routines_trainer_id/` — ejecutar `npm run db:prisma-deploy` si rutinas fallan con 500.

---

## FASE 5 — ENTRENADORES

| Ítem | Estado | Notas |
|------|--------|-------|
| Coach no crea usuarios (solo código) | **RESUELTO** | Backend limita roles coach |
| Eliminar «Mi entrenamiento» del panel coach | **PENDIENTE** | Sigue en `dashboardKeys.js` — cambio UX Fase 5 |
| Dashboard / Medidas / Seguimiento / Rutinas / Galería / Asistente | **RESUELTO** | Coach scope + asistente IA para admin |

---

## FASE 6 — RETOS

| Ítem | Estado | Notas |
|------|--------|-------|
| Podio 1º/2º/3º, premios, usuarios reales, fotos | **PENDIENTE QA** | Módulo retos existente; validación manual en admin D28D |

---

## FASE 7 — FOOD PLAN

| Ítem | Estado | Notas |
|------|--------|-------|
| Login único / SSO / licencias / sync usuarios | **RESUELTO** | `foodProvisioningService` + exchange-session OK en entorno con Food module |
| No modificar `food_version_final` | **CUMPLIDO** | Solo shell + provisioning |

---

## PRUEBAS EJECUTADAS (evidencia automática)

```bash
node scripts/e2e_full_system_test.mjs http://localhost:3002/api
# → 14/14 OK

bash scripts/test_invite_codes_api.sh http://localhost:3002/api
# → resolve-invite GYM-PRO-001 OK

curl http://localhost:3002/api/programs/public
# → 200, programas vital/pancitas/virtual_d28d

curl -X POST .../live-classes/admin (rutina D28D + auto_zoom)
# → 201 (commit 4434859)

curl -X POST .../gyms (super_admin)
# → 201 Gym Piloto Test

curl -X POST .../food-module/exchange-session (usuario final con licencia food)
# → 200 + accessToken
```

---

## ARCHIVOS PRINCIPALES MODIFICADOS

- Registro: `RegisterCommercialWizard.jsx`, `Register.jsx`, `programRoutes.js`, `programController.js`
- Planes: `AdminPlans.jsx`, `AccountsDatabase.js`, `accountsRepository.js`
- Empresas/Gyms: `AdminCompanies.jsx`, `AdminGyms.jsx`
- Clases: `LiveClasses.jsx`, `LiveClassSchedule.jsx`, `zoomMeetingService.js`
- Vigencias: `paymentAdminController.js`, `AccountsDatabase.js`
- Food SSO: `foodModuleRoutes.js`
- Coach: `coachScope.js`, `coachTrainingController.js`, `trainingController.js`
- Rutinas PG: `20260529120000_fix_d28d_routines_trainer_id`

---

## PENDIENTES JUSTIFICADOS (no bloquean piloto mínimo)

1. **Zoom producción:** configurar credenciales S2S o PMI en `.env` del servidor.
2. **Food SSO producción:** `FOOD_MODULE_URL` + `FOOD_SHELL_API_KEY` en Hostinger.
3. **Fase 5 UI:** renombrar/retirar «Mi entrenamiento» del panel coach.
4. **Fase 6:** QA manual de retos con fotos antes/después.
5. **Empresas CRUD gym:** usar panel Gimnasios (evita duplicar estructura).

---

## CRITERIO DE CIERRE FASE 1

**16/16 bloqueantes:** 13 RESUELTOS · 3 PARCIAL (justificados: #6, #7 diseño; #10 requiere env prod).

Listo para piloto controlado con checklist de env de producción arriba.
