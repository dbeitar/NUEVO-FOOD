# PRE-PILOTO OFICIAL — MVPFOOD / D28D

**Fecha:** 2026-05-29  
**Repositorio:** `https://github.com/cesargomez-food/NUEVO-FOOD.git`  
**Rama:** `main`

---

## FASE 0 — COMMIT Y PUSH

### Estado git

| Campo | Valor |
|-------|-------|
| **Commit HEAD** | `cbc4e390fa25e1ef710a466e93bf919e5d0a7b10` |
| **Short hash** | `cbc4e39` |
| **Fecha commit** | 2026-05-29 18:08:30 -0500 |
| **Responsable** | Cesar Gomez (`gerenciacgconsulting@gmail.com`) |
| **Mensaje** | `fix(pilot): estabilización pre-piloto — registro, planes, clases y vigencias` |
| **Commit anterior (Zoom)** | `4434859` — clases en vivo sin API Zoom en dev |
| **Push** | `origin/main` — `5587e48..cbc4e39` |
| **Working tree** | Limpio (`git status` sin cambios pendientes) |

### Contenido incluido en release pre-piloto

- Estabilización pre-piloto (`docs/PILOT_READINESS_FIXES.md`)
- Correcciones UX registro, planes, calendario, vigencias, empresas
- Auditoría semántica previa (`docs/SEMANTIC_UX_AUDIT.md`, commit `2696972`)
- Suite performance K6 (`performance/` — artefactos locales, no en repo)
- Migración Prisma `20260529120000_fix_d28d_routines_trainer_id`

---

## FASE 1 — STAGING / DESPLIEGUE

### CI automático (post-push)

| Pipeline | Trigger | Alcance |
|----------|---------|---------|
| `.github/workflows/deploy-frontend.yml` | push `main` | Frontend → Vercel (`npm run build` + `vercel deploy --prod`) |

> El backend, PostgreSQL, SMTP, Zoom y Wompi **no** se despliegan con este workflow. Requieren acción manual en el servidor de staging/producción.

### Checklist variables productivas (WARNING — acción manual)

| Variable / servicio | Propósito | Estado local |
|---------------------|-----------|--------------|
| `SMTP_*` / SendGrid | Emails Communication Center | Dev: skip en tests |
| `ZOOM_S2S_*` / `D28D_ZOOM_PMI_*` | Reuniones reales | Dev: placeholder |
| `FOOD_MODULE_URL` | SSO FOOD_PLAN | Configurado en local de prueba |
| `FOOD_SHELL_API_KEY` | Puente shell ↔ Food | Requerido en staging |
| `WOMPI_*` | Pagos online | Sandbox en dev |
| HTTPS | Cookies / SSO | Local HTTP |
| Backups PG | Continuidad | Docker local |
| PM2 / process manager | Backend 24/7 | `nodemon` en dev |

### Comandos post-deploy staging

```bash
cd backend && npx prisma migrate deploy && npx prisma generate
npm run seed:dev && npm run seed:verify
# Backend: PORT=3002 node server.js (PM2 en prod)
npm run test:e2e
npm run test:comm
npm run test:ux
npm run test:commercial
npm run test:phases
```

---

## EVIDENCIA DE PRUEBAS (2026-05-29, local `:3002`)

| Suite | Comando | Resultado |
|-------|---------|-----------|
| E2E sistema | `npm run test:e2e` | **14/14 OK** |
| Communication Center | `npm run test:comm` | **21/21 OK** |
| UX adherencia | `npm run test:ux` | **26/26 OK** |
| Comercial | `npm run test:commercial` | **20/20 OK** |
| Fases API | `npm run test:phases` | **ALL PHASES OK** |

### Cobertura validada

- Registro D28D / FOOD / Training / pareja
- Login único + licencias multi-módulo
- Communication Center + scheduler + WhatsApp URL
- Retos, FAQ, asistente, auditoría
- Zoom por programa, payment links
- Food-module status + training con licencia

### Performance (referencia, no gate de piloto 5–35 usuarios)

Suite K6 completada en local; capacidad estimada **BLOCKER** bajo stress >~500 VUs (`performance/results/capacity-estimate.json`). Para piloto 5–35 usuarios no es limitante; revisar antes de apertura masiva.

---

## DECISIÓN STAGING

| Gate | Estado |
|------|--------|
| Código en `origin/main` | **READY** |
| E2E local | **READY** |
| Deploy backend staging Hostinger | **WARNING** — pendiente acción manual |
| Variables productivas reales | **WARNING** |
| Email delivery real | **WARNING** — `TEST_EMAIL_TO` no configurado en comm test |

---

*Documento generado como parte del pre-piloto oficial. Sin nuevas funcionalidades.*
