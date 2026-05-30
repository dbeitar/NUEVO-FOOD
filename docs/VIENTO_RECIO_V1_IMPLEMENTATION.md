# VIENTO RECIO V1 — Implementación

**Versión:** 1.0  
**Estado:** Implementado pre-producción  
**Namespace:** `/api/spiritual/*` · módulo audit/comms: `spiritual`

---

## Resumen

VIENTO RECIO V1 entrega acompañamiento espiritual **integrado** en el ecosistema MVPFOOD/D28D sin modificar FOOD_PLAN, pagos, licencias, registro comercial ni SSO.

| Componente | Estado V1 |
|------------|-----------|
| Biblia (libros, capítulos, versículos, búsqueda, favoritos, marcadores) | ✅ |
| Versículo del día (CRUD, programación, alcance global/gym/trainer, CC) | ✅ |
| Devocionales (7/21/30/40 días, progreso) | ✅ |
| Estudios bíblicos (PDF, video, audio, YouTube, categorías, autores, tags) | ✅ |
| Eventos espirituales (presencial/virtual, Zoom/Meet, inscripción, asistencia, recordatorios) | ✅ |
| Widget usuario «Hoy» (Inicio + Progreso) | ✅ |
| Admin SuperAdmin (Centro de Formación Espiritual) | ✅ |
| Auditoría plataforma | ✅ |
| Peticiones de oración, testimonios, retos espirituales | 📄 V1.1 (solo doc) |

---

## Backend

### Rutas montadas

`backend/serverApp.js`:

```
app.use('/api/spiritual', spiritualRoutes);
app.use('/uploads/spiritual', express.static(...));
```

### Archivos principales

| Archivo | Rol |
|---------|-----|
| `backend/prisma/schema.prisma` | Modelos `spiritual_*` |
| `backend/src/routes/spiritualRoutes.js` | Rutas auth + admin |
| `backend/src/controllers/spiritualController.js` | Handlers HTTP |
| `backend/src/services/spiritual/spiritualService.js` | Lógica de negocio |
| `backend/src/services/spiritual/spiritualAssignmentService.js` | Alcance multi-tenant |
| `backend/src/services/spiritual/bibleImportService.js` | Import JSON |
| `backend/src/middleware/spiritualUpload.js` | Upload estudios + biblia |
| `backend/src/jobs/spiritualScheduler.js` | Recordatorios eventos |
| `scripts/spiritual/import_bible.mjs` | CLI importador |

### Feature flags

| Variable | Default | Efecto |
|----------|---------|--------|
| `SPIRITUAL_CENTER_ENABLED` | `true` | API spiritual activa |
| `VITE_SPIRITUAL_WIDGETS` | `true` | Widgets en frontend |
| `SPIRITUAL_REMINDER_INTERVAL_MS` | `3600000` | Intervalo job recordatorios |

---

## Frontend

| Archivo | Rol |
|---------|-----|
| `src/components/spiritual/admin/SpiritualCenterShell.jsx` | Admin SuperAdmin |
| `src/components/spiritual/user/SpiritualTodayWidget.jsx` | Widget «Hoy» |
| `src/components/spiritual/user/BibleReaderPanel.jsx` | Lector biblia |
| `src/utils/spiritualApi.js` | Cliente API |
| `src/components/dashboard/ConfigurationsHub.jsx` | Entrada admin |
| `src/components/Dashboard.jsx` | Embed Inicio/Progreso |

**Navegación admin:** Maestros → Configuraciones → Centro de Formación Espiritual

**Usuario final:** No ve «VIENTO RECIO»; ve sección «Hoy» en Inicio y Progreso.

---

## Communication Center

Cambio mínimo en `normalizeModule()`: se añade `'spiritual'`.

Plantillas nuevas (INSERT idempotente en seed):

- `verse.published` (in_app, email, whatsapp_link)
- `devotional.started`, `devotional.completed`
- `event.created`, `event.reminder`

**No se modificaron** plantillas existentes de d28d/training/food.

---

## Auditoría

Acciones registradas (`modulo: spiritual`):

- `bible.read`, `bible.favorited`, `bible.bookmarked`, `bible.imported`
- `verse.published`
- `devotional.started`, `devotional.day_completed`, `devotional.completed`
- `study.opened`, `study.saved`
- `event.created`, `event.registered`, `event.attended`

Consulta: `GET /api/platform/audit?modulo=spiritual`

---

## Lo que NO se tocó

- `modules/food_version_final/`
- Rutas `/api/food-module/*`, pagos, licencias, registro comercial
- Plantillas Communication Center existentes
- `userServices.js` (sin servicio espiritual comercial)

---

## Despliegue pre-producción

1. `npx prisma migrate deploy` (migración `20260530120000_spiritual_v1`)
2. Importar biblia: `node scripts/spiritual/import_bible.mjs --file backend/data/spiritual/sample_bible_rvr1960.example.json`
3. Reiniciar backend con `SPIRITUAL_CENTER_ENABLED=true`
4. Frontend build con `VITE_SPIRITUAL_WIDGETS=true`
5. Ejecutar `./scripts/test_spiritual_v1.sh`

---

*Implementación VIENTO RECIO V1 — pre-producción.*
