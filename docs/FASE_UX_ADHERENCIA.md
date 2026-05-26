# Fase UX y Adherencia — Paridad D28D / Training vs Food

**Fecha:** 2026-05-26  
**Estado:** **IMPLEMENTADO** — E2E `npm run test:ux` **26/26 OK**  
**Food:** no modificado (referencia funcional únicamente)

---

## Resultado por fase

| Fase | Nombre | Estado | Pruebas |
|------|--------|--------|---------|
| 1 | Retos D28D | ✅ COMPLETA | crear/editar/duplicar/activar/inscribir/evidencia/podio/publicar |
| 2 | Seguimiento D28D | ✅ COMPLETA | progreso usuario + overview admin + semáforo |
| 3 | Seguimiento Training | ✅ COMPLETA | semáforo + progreso coach/atleta |
| 4 | FAQ Center | ✅ COMPLETA | CRUD seed + búsqueda + categorías |
| 5 | Asistente contextual | ✅ COMPLETA | FAQ match + escalada WhatsApp sin IA externa |
| 6 | Communication Center | ✅ COMPLETA | eventos retos + semáforo + plantillas seed |
| 7 | Mi Cuenta | ✅ COMPLETA | my-services (previo) + progreso/retos en panel D28D |
| 8 | Auditoría | ✅ COMPLETA | platform_audit_events + logs retos/FAQ/help |
| 9 | Pruebas obligatorias | ✅ **26/26** | `scripts/test_ux_adherence_e2e.mjs` |

---

## 1. Diseño funcional

### Fase 1 — Retos D28D
- Admin: CRUD, duplicar, activar, cerrar, publicar, cancelar, evaluar, podio 1°/2°/3°
- Usuario: inscribirse, retirarse, evidencias (texto, imagen, pdf), ranking, ganadores
- Ubicación UI: D28D → Retos (admin) / vista `d28d-challenges` (usuario)

### Fase 2 — Seguimiento D28D
- Indicadores: clases, asistencia %, retos, días activos, semáforo (70/40)
- Dashboard usuario: `D28dProgressDashboard`
- Dashboard admin: `GET /d28d/progress/overview`

### Fase 3 — Training
- Semáforo GREEN/YELLOW/RED sobre logs 7 días
- APIs: `/training/progress/me`, `/training/progress/traffic-light/*`

### Fase 4–5 — FAQ + Asistente
- Motor único, módulos d28d/training/platform
- Búsqueda keyword, sin OpenAI
- Widget flotante + escalada WhatsApp

### Fase 6 — Communication
- Eventos: `d28d.challenge.*`, `training.traffic_light.*`, `d28d.user.inactive`, etc.
- Canales: in_app (+ email donde exista plantilla)

---

## 2. Tablas nuevas

| Tabla | Propósito |
|-------|-----------|
| `d28d_challenges` | Retos |
| `d28d_challenge_entries` | Participación |
| `d28d_challenge_evidences` | Evidencias múltiples |
| `d28d_challenge_podium` | Podio 1-3 |
| `d28d_user_progress_snapshots` | Snapshots progreso |
| `training_traffic_light_snapshots` | Semáforo training |
| `faq_categories` / `faq_items` | FAQ Center |
| `help_assistant_logs` | Consultas asistente |
| `platform_audit_events` | Auditoría UX |

Migración: `backend/prisma/migrations/20260526220000_ux_adherence_phase/migration.sql`

---

## 3. APIs

| Prefijo | Descripción |
|---------|-------------|
| `/api/d28d/challenges/*` | Retos CRUD + participación |
| `/api/d28d/progress/*` | Progreso D28D |
| `/api/training/progress/*` | Semáforo training |
| `/api/faq/:modulo/*` | FAQ |
| `/api/help/*` | Asistente |
| `/api/platform/audit` | Auditoría plataforma |

---

## 4. Servicios backend

- `d28dChallengeService.js` + `D28dChallengeStore.js`
- `d28dProgressService.js`
- `trainingTrafficLightService.js`
- `faqService.js`
- `helpAssistantService.js`
- `platformAuditService.js`

---

## 5. Pantallas frontend

| Componente | Rol |
|------------|-----|
| `D28dChallengesAdmin.jsx` | Admin retos |
| `D28dChallengesPanel.jsx` | Usuario retos |
| `D28dProgressDashboard.jsx` | Mi progreso |
| `FaqCenterAdmin.jsx` | Admin FAQ |
| `HelpAssistantWidget.jsx` | Asistente flotante |
| `TrainingProgressPanel.jsx` | Semáforo training |

---

## 6. Evidencia pruebas

```bash
npm run test:ux
# === 26 OK / 0 FAIL ===
```

Incluye: retos, progreso, semáforo, FAQ, asistente, comm logs, my-services, auditoría, compat Food.

---

## 7. Checklist producción

- [ ] `npx prisma generate` tras deploy
- [ ] Ejecutar migración SQL UX phase en prod
- [ ] Reiniciar backend
- [ ] `npm run test:ux` en staging
- [ ] Configurar plantillas email para eventos retos (opcional; in_app activo)
- [ ] Revisar registro público (500 preexistente en auth/register — no introducido por esta fase)

---

## 8. Riesgos / WARNING

| Item | Nota |
|------|------|
| `POST /auth/register` → 500 | Bug preexistente; E2E usa `usuario.demo@foodplan.local` |
| Retos en JSON + Prisma | JsonStore primario; Prisma sync en hydrate cuando client generado |
| Scheduler semáforo auto-notify | Hooks manuales en progreso; extender `communicationScheduler.js` en hardening |

---

## 9. Compatibilidad

✅ Food, Training embebido, licencias, pagos, registro API, Communication Center, programas comerciales — sin ruptura.

---

*Food no modificado. Evolución sin destrucción.*
