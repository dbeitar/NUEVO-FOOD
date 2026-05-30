# VIENTO RECIO — Roadmap de implementación

**Versión:** 0.1 (diseño)  
**Alcance:** Centro de Formación Espiritual — capa transversal SuperAdmin  
**Restricción:** FOOD_PLAN, pagos, licencias, registro comercial y Communication Center existente **sin cambios de comportamiento**

---

## 1. Resumen ejecutivo

| Fase | Duración estimada | Entregable clave |
|------|-------------------|------------------|
| **F0** Diseño | ✅ Completado | 5 documentos arquitectura |
| **F1** Fundación | 2–3 semanas | Biblia + admin shell + flags |
| **F2** Contenido diario | 2 semanas | Versículo del día + devocionales |
| **F3** Comunidad | 2–3 semanas | Eventos, oración, testimonios |
| **F4** Retos + dashboard | 1–2 semanas | Puente D28D + widget usuario |
| **F5** Estudios + asignación | 2 semanas | Media library + multi-tenant |
| **F6** Comunicación + auditoría | 1 semana | Eventos CC + audit completo |
| **F7** Piloto espiritual | 1 semana | QA, docs operativos, rollout |

**Total estimado:** 11–14 semanas (1 dev full-stack + revisión SuperAdmin contenido)

---

## 2. Fase 0 — Diseño (completada)

- [x] `VIENTO_RECIO_ARCHITECTURE.md`
- [x] `VIENTO_RECIO_DATABASE.md`
- [x] `VIENTO_RECIO_USER_FLOWS.md`
- [x] `VIENTO_RECIO_ROADMAP.md`
- [x] `VIENTO_RECIO_SECURITY.md`

**Gate F0→F1:** Aprobación SuperAdmin del alcance y copy UX (sin marca producto).

---

## 3. Fase 1 — Fundación (MVP técnico)

### Objetivo

Infraestructura mínima operable: tablas biblia, API namespace, admin shell, importador.

### Backend

| Tarea | Prioridad |
|-------|-----------|
| Migración Prisma `spiritual_bible_*` | P0 |
| `spiritualRoutes.js` montado en `/api/spiritual` | P0 |
| `requireSuperAdmin` en rutas `/admin/*` | P0 |
| `bibleImportService` + `scripts/spiritual/import_bible.mjs` | P0 |
| `SPIRITUAL_CENTER_ENABLED` env flag | P0 |
| Seed versión RVR1960 vía import (data externa, no repo) | P1 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| `SpiritualCenterShell.jsx` bajo Maestros/Configuraciones | P0 |
| `BibleAdmin.jsx` — listado libros, preview capítulo | P1 |
| Entrada navegación solo `super_admin` | P0 |

### QA

- Import 31k versículos < 2 min local
- SuperAdmin accede centro; coach/usuario no ven menú
- Cero archivos tocados en `food_version_final`

**Gate F1→F2:** Biblia consultable vía API + 1 versión importada en staging.

---

## 4. Fase 2 — Contenido diario

### Objetivo

Versículo del día programable + devocionales 7/21/30/40 con progreso.

### Backend

| Tarea | Prioridad |
|-------|-----------|
| Tablas `spiritual_verse_of_day`, `spiritual_devotional_*` | P0 |
| CRUD admin versículo + scheduler job | P0 |
| API progreso devocional usuario | P0 |
| `spiritualAssignmentService` v1 (global + gym) | P1 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| `VerseOfDayAdmin.jsx` | P0 |
| `DevotionalAdmin.jsx` + editor días | P0 |
| `DevotionalDayView.jsx` usuario | P0 |
| `SpiritualDashboardWidget.jsx` v0 — solo versículo + devocional | P0 |

### Comunicación (parcial)

- Plantilla `verse.published` (in-app primero)
- `devotional.started` / `devotional.completed`

**Gate F2→F3:** SuperAdmin publica versículo; usuario asignado lo ve en Progreso en ≤ 2 clics.

---

## 5. Fase 3 — Comunidad

### Objetivo

Eventos, peticiones de oración, testimonios moderados.

### Backend

| Tarea | Prioridad |
|-------|-----------|
| Tablas eventos + registrations + attendance | P0 |
| Tablas prayer + comments | P0 |
| Tabla testimonies + moderation | P0 |
| Jobs `event.reminder` | P1 |
| `prayer.request.created` event | P0 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| `EventAdmin.jsx`, `PrayerAdminPanel.jsx` | P0 |
| `TestimonyModeration.jsx` | P0 |
| `PrayerRequestForm.jsx`, `SpiritualEventsList.jsx` | P0 |
| Widget dashboard: eventos + oración | P1 |

**Gate F3→F4:** Evento virtual con inscripción + recordatorio; petición oración con seguimiento admin.

---

## 6. Fase 4 — Retos espirituales + dashboard

### Objetivo

Reutilizar motor D28D; widget usuario completo (Componente 10).

### Backend

| Tarea | Prioridad |
|-------|-----------|
| `spiritualChallengeBridge.js` | P0 |
| Filtro retos `reglas.kind === 'spiritual'` | P0 |
| `feedController.js` agregado «Hoy» | P0 |
| Audit actions retos espirituales | P1 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| Admin crear reto espiritual (tipos oración/lectura/gratitud/ayuno) | P0 |
| Widget Progreso: retos activos separados de fitness | P0 |
| `BibleReader.jsx` — lectura, favoritos, notas | P1 |

### Integración Dashboard

- Embed en `Dashboard.jsx` case `progress` — **solo** si `VITE_SPIRITUAL_WIDGETS=true` y feed no vacío
- **No** modificar `userServices.js`

**Gate F4→F5:** Reto espiritual 7 días completable con evidencia; audit `challenge.completed`.

---

## 7. Fase 5 — Estudios + asignación avanzada

### Objetivo

Biblioteca estudios multimedia + asignación trainer/users.

### Backend

| Tarea | Prioridad |
|-------|-----------|
| Tablas studies, categories, authors | P0 |
| Upload PDF/video (multer patrón retos) | P0 |
| `spiritual_content_assignments` completo | P0 |
| Resolución scope trainer + user_ids | P0 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| `StudyAdmin.jsx`, `ContentAssignment.jsx` | P0 |
| Lista estudios recomendados en widget | P1 |

**Gate F5→F6:** Estudio PDF asignado solo a gym X invisible para gym Y.

---

## 8. Fase 6 — Comunicación + auditoría completa

### Objetivo

Todos los eventos CC; auditoría end-to-end; email/WhatsApp opcional.

### Backend

| Tarea | Prioridad |
|-------|-----------|
| INSERT plantillas modulo `spiritual` (no alterar existentes) | P0 |
| `normalizeModule('spiritual')` en communicationCenterService | P0 |
| Audit hooks en todos los controllers spiritual | P0 |
| WhatsApp vía CC si canal ya configurado | P2 |

### Frontend

| Tarea | Prioridad |
|-------|-----------|
| Filtro modulo=spiritual en Communication Center admin | P1 |

**Gate F6→F7:** Matriz eventos CC probada; export audit filtrable por modulo=spiritual.

---

## 9. Fase 7 — Piloto espiritual

### Checklist pre-rollout

- [ ] `SPIRITUAL_CENTER_ENABLED=true` staging
- [ ] Import biblia producción (versión acordada)
- [ ] 1 devocional 7 días + 1 evento + 1 reto piloto
- [ ] Asignación global limitada a cohorte piloto (scope users)
- [ ] E2E: usuario no ve «VIENTO RECIO» en UI
- [ ] Regresión: FOOD login, Mis Servicios, retos fitness intactos
- [ ] Doc operativo: `docs/VIENTO_RECIO_RUNBOOK.md` (post-F7)

### Métricas piloto

| Métrica | Objetivo |
|---------|----------|
| Usuarios con widget activo | Cohorte piloto 100% |
| Devocional día 1 completado | > 40% cohorte |
| Errores API spiritual | 0 P0 |
| Latencia GET `/spiritual/feed/today` p95 | < 300 ms |

---

## 10. Backlog post-piloto (V1.1+)

| Ítem | Notas |
|------|-------|
| Coach panel peticiones `leaders_only` | Sin módulo Viento Recio |
| Búsqueda full-text biblia pg_trgm | Performance |
| Audio devocionales TTS | Opcional |
| Reportes gym agregados eventos | V2 analytics |
| Segunda versión biblia (NVI) | Import adicional |
| Zoom S2S eventos espirituales | Reutilizar zoomMeetingService |

**Explícitamente fuera de roadmap:** licencia comercial, registro, Mis Servicios, red social, chat grupal.

---

## 11. Dependencias y riesgos

| Riesgo | Mitigación |
|--------|------------|
| Contaminar FOOD | Namespace aislado; code review checklist |
| Retos fitness mezclados | Filtro `reglas.kind` estricto en UI |
| Biblia copyright | SuperAdmin provee texto con licencia; no incluir en repo |
| Scope assignment bugs | Tests unitarios `spiritualAssignmentService` |
| CC plantillas rotas | Solo INSERT; no UPDATE existentes |

---

## 12. Equipo y responsabilidades

| Rol | Responsabilidad |
|-----|-------------------|
| SuperAdmin producto | Contenido, copy, moderación, piloto |
| Dev backend | Prisma, API, jobs, bridge retos |
| Dev frontend | Admin shell + widgets embebidos |
| QA | Regresión FOOD/D28D/Training + flujos espirituales |

---

## 13. Definition of Done (global)

1. Feature detrás de flag; desactivable sin deploy Food
2. Tests API spiritual (mín. happy path + auth)
3. Audit log en acciones mutables
4. Documentación API en README spiritual (F7)
5. Cero referencias «VIENTO RECIO» en strings usuario final (i18n review)

---

*Roadmap VIENTO RECIO — orden de implementación recomendado.*
