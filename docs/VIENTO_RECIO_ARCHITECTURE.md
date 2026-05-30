# VIENTO RECIO — Arquitectura oficial del Centro de Formación Espiritual

**Versión:** 0.1 (diseño)  
**Fecha:** 2026-05-29  
**Estado:** Documentación — sin implementación  
**Codename interno:** `spiritual` / `viento_recio` (nunca expuesto como producto comercial)

---

## 1. Decisión estratégica

VIENTO RECIO es una **capa transversal de acompañamiento espiritual** administrada exclusivamente por **Super Admin**. No es:

| Excluido explícitamente |
|-------------------------|
| Servicio comercial · Licencia · Plan · Módulo de registro · Tarjeta en Inicio · Ítem en Mis Servicios · Flujo de pago |

Aplica a usuarios **ya existentes** de D28D, FOOD_PLAN y TRAINING según **asignación de contenido** (global, gym, trainer, comunidad).

### Reglas absolutas (congelamiento)

- **NO** modificar `modules/food_version_final/`
- **NO** modificar flujos comerciales, licencias, registro, pagos
- **NO** alterar plantillas existentes del Communication Center (solo **añadir** eventos/plantillas nuevas)
- **NO** tocar base de datos ni procesos de Food

---

## 2. Principios de diseño

1. **Reutilizar infraestructura** — retos D28D, Communication Center, auditoría plataforma, notificaciones in-app, multi-tenant gym/trainer.
2. **Invisibilidad de marca producto** — el usuario final no ve «VIENTO RECIO»; ve «Formación», «Devocional de hoy», «Versículo», etc.
3. **Super Admin único operador** — entrenadores y gyms **consumen** contenido asignado, no administran el centro.
4. **Separación de dominio** — prefijo de modelos/API `spiritual_*` o namespace `/api/spiritual/*` (interno).
5. **Escala de contenido** — Biblia vía importador (JSON/CSV/SQL), no hardcode en código.
6. **No red social** — sin amigos, feed infinito ni chat grupal complejo.

---

## 3. Vista de contexto (C4 nivel 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHELL MVPFOOD / D28D                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ D28D        │  │ FOOD_PLAN   │  │ TRAINING                │ │
│  │ (intacto)   │  │ (congelado) │  │ (intacto)               │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │  Capa espiritual      │  ← widgets embebidos     │
│              │  (VIENTO RECIO)       │     Progress / Inicio    │
│              └───────────┬───────────┘                          │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────────────┐ │
│  │ Super Admin: Centro de Formación Espiritual (admin only)    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   PostgreSQL      Communication      platform_audit_events
   (spiritual_*)   Center (+templates) NotificationDatabase
                   Zoom (eventos)      D28dChallenge (tipo spiritual)
```

---

## 4. Componentes del sistema

| # | Componente | Responsabilidad | Reutilización |
|---|--------------|-----------------|---------------|
| 1 | Biblia | Libros, capítulos, versículos, búsqueda, favoritos, notas | Tablas nuevas + importador CLI |
| 2 | Versículo del día | CRUD, programación, publicación | + Communication Center |
| 3 | Devocionales | Planes 7/21/30/40 días, progreso usuario | Tablas nuevas + progreso JSON |
| 4 | Estudios bíblicos | Media (PDF/video/audio/YouTube), taxonomía | Similar FAQ/media uploads |
| 5 | Testimonios | UGC moderado, asignación comunidad | Evidencias patrón retos |
| 6 | Eventos | Presencial/virtual, inscripción, asistencia | Patrón live classes (sin mezclar tablas) |
| 7 | Peticiones de oración | CRUD usuario, seguimiento admin | Tickets privados + scope tenant |
| 8 | Retos espirituales | Oración, lectura, gratitud, ayuno | **Motor `D28dChallenge`** + `reglas.kind: spiritual` |
| 9 | Asignación | global / gym / trainer / lista usuarios | `tenantScope.js` |
| 10 | Dashboard espiritual | Widget usuario final | Embebido en `Progress` / Inicio |

---

## 5. Backend — estructura propuesta

```
backend/src/
  routes/spiritualRoutes.js          # Montaje /api/spiritual/*
  controllers/spiritual/
    bibleController.js
    verseOfDayController.js
    devotionalController.js
    studyController.js
    testimonyController.js
    eventController.js
    prayerController.js
    assignmentController.js
    feedController.js                # Dashboard agregado usuario
  services/spiritual/
    bibleImportService.js
    spiritualAssignmentService.js    # Resuelve qué ve cada usuario
    spiritualChallengeBridge.js      # Puente a d28dChallengeService
  jobs/spiritualScheduler.js           # Versículo programado, recordatorios eventos
scripts/spiritual/
  import_bible.mjs                   # JSON | CSV | SQL
```

**Autorización:** middleware `requireSuperAdmin` para rutas admin; rutas consumo exigen `auth` + filtro por asignación (no por licencia comercial).

---

## 6. Frontend — estructura propuesta

```
src/components/spiritual/
  admin/
    SpiritualCenterShell.jsx         # Layout admin SuperAdmin
    BibleAdmin.jsx
    VerseOfDayAdmin.jsx
    DevotionalAdmin.jsx
    StudyAdmin.jsx
    TestimonyModeration.jsx
    EventAdmin.jsx
    PrayerAdminPanel.jsx
    ContentAssignment.jsx
  user/
    SpiritualDashboardWidget.jsx     # Componente 10 — sin marca VIENTO RECIO
    BibleReader.jsx
    DevotionalDayView.jsx
    PrayerRequestForm.jsx
    SpiritualEventsList.jsx
```

**Navegación Super Admin:**

```
Maestros → Configuraciones → Centro de Formación Espiritual
```

(o ítem bajo `masters` view — **solo** si `roles.includes('super_admin')`).

**Usuario final:** widgets en vista `progress` o sección colapsable en Inicio — **sin** entrada en `userServices.js` / `getServicesFor`.

---

## 7. Integración Communication Center

Nuevos eventos (plantillas **nuevas**, modulo `spiritual`):

| Evento | Disparador |
|--------|------------|
| `verse.published` | SuperAdmin publica versículo del día |
| `devotional.started` | Usuario inicia plan devocional |
| `devotional.completed` | Usuario completa día/plan |
| `event.created` | Nuevo evento espiritual |
| `event.reminder` | Job pre-evento |
| `prayer.request.created` | Nueva petición (privacidad configurable) |
| `challenge.started` | Reto espiritual activado (vía puente retos) |
| `challenge.completed` | Usuario completa reto espiritual |

Extender `normalizeModule()` en `communicationCenterService.js` para aceptar `spiritual` — **sin cambiar** plantillas existentes de `d28d`, `food`, `training`.

---

## 8. Integración retos (Componente 8)

**No crear motor nuevo.** Extender uso de `D28dChallenge`:

```json
{
  "kind": "spiritual",
  "spiritual_type": "prayer|reading|gratitude|fasting|habit|community",
  "visibility": "assigned_only",
  "assignment_id": 42
}
```

Campo `reglas` JSON ya existe en `D28dChallenge`. Retos espirituales:

- `programId` opcional o null (no atados a Vital/Pancitas comercial)
- Admin UI espiritual crea reto vía `spiritualChallengeBridge.create()` → delega a `d28dChallengeService`
- Panel usuario: filtrar retos donde `reglas.kind === 'spiritual'` en widget espiritual, **no** mezclar con retos fitness D28D en misma lista (o separar visualmente)

---

## 9. Integración auditoría

Usar `platformAuditService.log()` con `modulo: 'spiritual'`:

| action | entity |
|--------|--------|
| `bible.imported` | `bible_version` |
| `verse.published` | `verse_of_day` |
| `devotional.completed` | `devotional_progress` |
| `event.attended` | `spiritual_event` |
| `prayer.created` | `prayer_request` |
| `testimony.submitted` | `testimony` |
| `content.assigned` | `spiritual_assignment` |

---

## 10. Multi-tenant y asignación (Componente 9)

Modelo `SpiritualContentAssignment`:

```
scope_type: 'global' | 'gym' | 'trainer' | 'users'
scope_id:   null | gym_id | trainer_id | null
user_ids:   Int[] (solo si scope_type = users)
content_type + content_id
active_from / active_until
```

Resolución para usuario U:

1. SuperAdmin ve todo en admin.
2. Usuario final: unión de global + gym(U.gym_id) + trainer(U.trainer_id) + listas explícitas.
3. Coach/Gym: **solo lectura** de contenido asignado a su comunidad (API filtrada), sin UI «Centro».

---

## 11. Feature flags

| Variable | Propósito |
|----------|-----------|
| `SPIRITUAL_CENTER_ENABLED=true` | Master switch backend |
| `VITE_SPIRITUAL_WIDGETS=true` | Widgets en shell (SuperAdmin puede desactivar globalmente) |

Sin flags de licencia comercial.

---

## 12. Límites explícitos (fuera de alcance)

- Réplica YouVersion (planes de lectura masivos offline, audio profesional multi-voz)
- Red social (seguir usuarios, mensajes directos entre pares)
- Chat comunitario en tiempo real
- Monetización o planes «Viento Recio Premium»
- Modificación de FOOD_PLAN SSO, rutas o componentes Food

---

## 13. Referencias en codebase actual

| Patrón existente | Archivo |
|------------------|---------|
| Retos D28D | `backend/src/services/d28dChallengeService.js`, `D28dChallenge` Prisma |
| Communication Center | `backend/src/services/communicationCenterService.js` |
| Auditoría | `backend/src/services/platformAuditService.js` |
| Multi-tenant | `backend/src/utils/tenantScope.js` |
| FAQ admin (CRUD similar) | `backend/src/services/faqService.js`, `FaqCenterAdmin.jsx` |
| Config admin hub | `docs/MANUALES/07_CONFIGURACIONES_ADMIN.md` |
| Progreso usuario (embed) | `Dashboard.jsx` case `progress` |

---

## 14. Criterio de éxito arquitectónico

- [ ] Cero cambios en `food_version_final`
- [ ] Cero nuevas licencias / planes comerciales
- [ ] Super Admin opera todo desde un solo centro
- [ ] Usuario final recibe acompañamiento sin nueva «app» que aprender
- [ ] Retos espirituales usan mismo motor que retos D28D
- [ ] Comunicaciones usan mismo bus de eventos (plantillas nuevas)

---

*Documento de arquitectura — fase diseño VIENTO RECIO.*
