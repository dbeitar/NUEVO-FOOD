# Fase de Paridad Funcional con Food — Diseño

**Proyecto:** MVPFOOD / D28D  
**Fecha:** 2026-05-26  
**Estado:** diseño funcional — **sin implementación**  
**Principio:** evolución sin destrucción  
**Restricción:** Food es referencia funcional únicamente. **No modificar, mover ni migrar lógica desde Food.**

---

## Resumen ejecutivo

Food ofrece una experiencia madura de **acompañamiento continuo**: semáforo de adherencia, recordatorios automáticos, dashboard del coach, renovaciones y comunicación proactiva. El shell D28D/Training tiene piezas parciales (asistencia live, logs de entrenamiento, Communication Center V1.1A) pero carece de **cohesión de experiencia usuario final**.

Este documento define **7 fases incrementales** para alcanzar paridad de experiencia **sin tocar Food** ni alterar licencias, pagos, registro ni arquitectura base.

| Fase | Nombre | Estado actual | Esfuerzo est. |
|------|--------|---------------|---------------|
| 1 | Comunicación 100% | **Implementado V1.1A** — validar prod | 2–3 d |
| 2 | Retos D28D | No existe | 10–14 d |
| 3 | Seguimiento D28D | Parcial (`D28dCoachTracking`) | 8–10 d |
| 4 | Seguimiento Training | Parcial (`coachTrainingService`) | 8–10 d |
| 5 | FAQ Center | No existe en shell | 4–5 d |
| 6 | Asistente contextual | No existe en shell | 5–6 d |
| 7 | Servicios activos (Mi Cuenta) | Parcial (1 cuenta/plan) | 3–4 d |
| **Total** | | | **40–52 d-persona** |

---

# FASE 1 — Comunicación 100%

## 1.1 Diseño funcional

**Referencia Food (solo lectura):** plantillas por nivel (semáforo), cron diario, email + nota interna, personalización `{nombre}`, `{entrenador}`.

**Shell objetivo:** Communication Center como canal único transversal del ecosistema (no del módulo Food embebido).

### Estado post V1.1A (ya implementado)

| Capacidad | Estado |
|-----------|--------|
| MailService propio (SMTP/SendGrid/Resend/Mailgun/Ethereal) | ✅ |
| `dispatchEvent()` consume plantillas + variables | ✅ |
| Canal `email` preservado (no → `in_app`) | ✅ |
| Notificación in-app desde hooks | ✅ |
| Scheduler diario (vencimientos, ciclos) | ✅ |
| Auditoría `communication_event_logs` con templateId | ✅ |
| Panel admin (Plantillas, Eventos, WhatsApp, Email, Auditoría) | ✅ |
| E2E `npm run test:comm` | ✅ 21/21 |

### Brechas para declarar “100% producción”

| Brecha | Acción propuesta |
|--------|------------------|
| SMTP real en prod | Configurar `MAIL_PROVIDER` + credenciales en staging/prod |
| Dedup scheduler | Evitar reenvío mismo evento/día/usuario (`comm_dedup_key` en log o tabla) |
| `notifications.json` legacy | Migrar a Prisma (opcional V1.1b, no bloqueante) |
| Plantillas por módulo training/food shell | Completar seeds para todos los eventos en cada `modulo` |
| Monitoreo errores email | Alerta admin si `estado=error` > umbral |

## 1.2 Impacto técnico

- Sin cambios en licencias, pagos, registro.
- Solo hardening operativo del Communication Center existente.

## 1.3 Tablas

Existentes (sin cambio):

- `communication_templates`
- `communication_event_logs`

Opcional V1.1b:

```prisma
model CommunicationDedup {
  id        Int      @id @default(autoincrement())
  dedupKey  String   @unique @map("dedup_key")  // e.g. license.expiring:71:2026-06-02
  createdAt DateTime @default(now()) @map("created_at")
}
```

## 1.4 APIs

Existentes — sin nuevas rutas obligatorias:

- `GET/POST/PUT/DELETE /api/communications/templates`
- `GET /api/communications/logs`
- `POST /api/communications/email/test`
- `POST /api/communications/jobs/run` (validación admin)

## 1.5 Pantallas

Existente: `CommunicationCenterAdmin.jsx` (Configuraciones → Comunicación).

## 1.6 Compatibilidad

100% additive. Food interno intacto.

## 1.7 Estrategia migración

1. Validar SMTP real en staging.
2. Ejecutar `npm run test:comm` contra staging.
3. Activar scheduler en prod (`COMM_SCHEDULER_ENABLED=true`).

## 1.8 Plan pruebas

| Caso | Evidencia |
|------|-----------|
| Registro → email + in_app + log | E2E existente |
| Pago aprobado/rechazado | E2E existente |
| Vencimiento +7 días | E2E `license.expiring` |
| Reactivación | Confirm pago → `license.reactivated` |
| Auditoría consultable | GET logs con templateId |

## 1.9 Roadmap

**Semana 0 (inmediato):** validación prod SMTP — **Fase 1 = cierre**.

---

# FASE 2 — Retos D28D

## 2.1 Diseño funcional

Módulo de gamificación dentro del shell D28D. Referencia Food: competencia implícita vía semáforo y ranking de adherencia del coach — **no replicar lógica Food**, solo el concepto de motivación y seguimiento visible.

### Flujo usuario

```
Ver retos abiertos → Aceptar participar → Subir evidencia (foto/archivo)
→ Ver ranking (si publicado) → Ver podio (si publicado)
```

### Flujo admin

```
Crear reto → Publicar (open) → Evaluar participantes → Asignar puntuación
→ Seleccionar podio (1°, 2°, 3°) → Publicar resultados → Cerrar
```

### Estados del reto

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador, no visible |
| `open` | Inscripción y envíos activos |
| `closed` | No acepta nuevos envíos; evaluación |
| `published` | Ranking y podio visibles |

### Reglas V1

- Una participación por usuario por reto (`unique challengeId + userId`).
- Aceptación explícita (`accepted_at`) antes de subir archivos.
- Archivos: JPG/PNG/PDF, máx 5 MB foto / 10 MB doc.
- Ranking ordenado por `puntuacion` DESC; podio manual (admin elige 1°/2°/3°).

## 2.2 Impacto técnico

- Nuevo dominio en shell (`/api/d28d/challenges/*`).
- Storage local V1 → interfaz `StorageProvider` para S3 en prod.
- Hooks Communication Center: `d28d.challenge.*`.
- **No toca:** licencias, pagos, registro, Food, Training module.

## 2.3 Tablas

```prisma
model D28dChallenge {
  id          Int      @id @default(autoincrement())
  titulo      String
  descripcion String   @db.Text
  programId   String?  @map("program_id")
  cycleId     Int?     @map("cycle_id")
  fechaInicio DateTime @map("fecha_inicio")
  fechaFin    DateTime @map("fecha_fin")
  estado      String   @default("draft")  // draft|open|closed|published
  reglas      Json?
  creadoPorId Int      @map("creado_por_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  entries     D28dChallengeEntry[]
  podium      D28dChallengePodium[]
}

model D28dChallengeEntry {
  id           Int      @id @default(autoincrement())
  challengeId  Int      @map("challenge_id")
  userId       Int      @map("user_id")
  acceptedAt   DateTime? @map("accepted_at")
  comentario   String?  @db.Text
  puntuacion   Decimal? @db.Decimal(5,2)
  estado       String   @default("pending")  // pending|accepted|submitted|reviewed|disqualified
  submittedAt  DateTime? @map("submitted_at")
  createdAt    DateTime @default(now()) @map("created_at")
  files        D28dChallengeFile[]
  @@unique([challengeId, userId])
}

model D28dChallengeFile {
  id        Int    @id @default(autoincrement())
  entryId   Int    @map("entry_id")
  tipo      String // photo|document
  url       String
  mime      String?
  sizeBytes Int?   @map("size_bytes")
  createdAt DateTime @default(now()) @map("created_at")
}

model D28dChallengePodium {
  id          Int      @id @default(autoincrement())
  challengeId Int      @map("challenge_id")
  lugar       Int      // 1|2|3
  entryId     Int      @map("entry_id")
  publicadoAt DateTime? @map("publicado_at")
  @@unique([challengeId, lugar])
}
```

## 2.4 APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/d28d/challenges` | usuario (open/published) / admin (todos) |
| GET | `/api/d28d/challenges/:id` | autenticado |
| POST | `/api/d28d/challenges` | admin_d28d, super_admin |
| PUT | `/api/d28d/challenges/:id` | admin |
| POST | `/api/d28d/challenges/:id/open` | admin |
| POST | `/api/d28d/challenges/:id/close` | admin |
| POST | `/api/d28d/challenges/:id/participate` | usuario (licencia d28d) |
| POST | `/api/d28d/challenges/:id/accept` | participante |
| POST | `/api/d28d/challenges/:id/entries/:entryId/files` | participante (multipart) |
| PUT | `/api/d28d/challenges/:id/entries/:entryId/score` | admin |
| POST | `/api/d28d/challenges/:id/podium` | admin — `{ first, second, third }` entryIds |
| POST | `/api/d28d/challenges/:id/publish` | admin |
| GET | `/api/d28d/challenges/:id/ranking` | autenticado |

## 2.5 Pantallas

| Pantalla | Componente propuesto | Ubicación |
|----------|---------------------|-----------|
| Lista retos usuario | `D28dChallengesPanel.jsx` | Panel D28D / Inicio servicio |
| Detalle + participar | `D28dChallengeDetail.jsx` | Modal o ruta interna |
| Admin CRUD | `D28dChallengesAdmin.jsx` | D28DAdminView |
| Evaluación + podio | `D28dChallengeReview.jsx` | Admin |

## 2.6 Compatibilidad

- Additive: nuevas tablas y rutas bajo `/api/d28d/challenges`.
- Retos visibles solo si `module_access.d28d` activo.
- Sin impacto en clases live existentes.

## 2.7 Estrategia migración

1. Migración Prisma + seed reto demo.
2. Feature flag `D28D_CHALLENGES_ENABLED=true`.
3. Piloto con un programa (Virtual D28D).

## 2.8 Plan pruebas

- CRUD reto admin.
- Usuario acepta → sube foto → estado `submitted`.
- Admin califica → podio → publish → ranking visible.
- Eventos comm: `d28d.challenge.entry_submitted`, `d28d.challenge.winners_published`.
- Permisos: usuario sin licencia d28d → 403.

## 2.9 Roadmap

**Semanas 1–2** tras aprobación Fase 1.

---

# FASE 3 — Seguimiento D28D

## 3.1 Diseño funcional

**Referencia Food:** dashboard coach con adherencia %, días inactivos, semáforo, alertas.

**Shell objetivo:** panel unificado de progreso D28D para usuario y coach, alimentado por datos **ya existentes** + retos (Fase 2).

### Indicadores

| Indicador | Fuente actual | Cálculo propuesto |
|-----------|---------------|-------------------|
| Clases asistidas | `live_classes.attendance_user_ids` | COUNT por userId |
| % asistencia | clases del programa/ciclo vs asistidas | asistidas / inscritas o programadas |
| Retos completados | Fase 2 `entries.estado=submitted` | COUNT |
| Posición ranking | Fase 2 ranking | posición en reto activo |
| Racha | logs training opcional | días consecutivos con actividad |

### Dashboard motivacional (usuario)

- Tarjetas: “Has asistido a X clases”, “Tu adherencia es Y%”, “Completaste Z retos”.
- Mensaje dinámico según umbral (verde/amarillo/rojo — **lógica propia shell**, no copiar Food).

### Coach D28D

Extender `D28dCoachTracking.jsx` existente con:
- Vista adherencia agregada por usuario.
- Export CSV (ya parcialmente existe).
- Alertas usuarios inactivos > N días.

## 3.2 Impacto técnico

- Nuevo servicio `d28dProgressService.js` — agrega datos de live classes + retos + opcional training logs.
- Cache diario opcional en tabla `d28d_user_progress_snapshots` (evitar recalcular en cada request).
- **No modifica** modelo de clases live ni asistencia actual.

## 3.3 Tablas

```prisma
model D28dUserProgressSnapshot {
  id                Int      @id @default(autoincrement())
  userId            Int      @map("user_id")
  programId         String?  @map("program_id")
  cycleId           Int?     @map("cycle_id")
  classesAttended   Int      @default(0) @map("classes_attended")
  classesScheduled  Int      @default(0) @map("classes_scheduled")
  attendancePct     Decimal  @default(0) @map("attendance_pct") @db.Decimal(5,2)
  challengesDone    Int      @default(0) @map("challenges_done")
  trafficLight      String   @default("yellow") @map("traffic_light") // green|yellow|red
  computedAt        DateTime @default(now()) @map("computed_at")
  @@index([userId, computedAt])
}
```

## 3.4 APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/d28d/progress/me` | usuario |
| GET | `/api/d28d/progress/user/:userId` | coach d28d, admin |
| GET | `/api/d28d/progress/overview` | coach d28d (lista participantes) |
| POST | `/api/d28d/progress/recompute` | admin (job manual) |

## 3.5 Pantallas

| Pantalla | Descripción |
|----------|-------------|
| `D28dProgressDashboard.jsx` | Usuario — tarjetas motivacionales |
| Extensión `D28dCoachTracking.jsx` | Coach — adherencia + alertas |
| Widget en `ServicesHero` | Badge “Tu progreso D28D” |

## 3.6 Compatibilidad

- Lee datos existentes; no cambia contratos de live-classes.
- Depende de Fase 2 para indicador retos (degradación graceful si retos deshabilitados).

## 3.7 Estrategia migración

1. Job nocturno recalcula snapshots (mismo scheduler comm o job separado).
2. Backfill inicial desde histórico de asistencia.

## 3.8 Plan pruebas

- Usuario con 3 asistencias → `classesAttended=3`.
- Usuario sin asistencias → semáforo rojo.
- Coach ve solo usuarios de su scope (programa/gym).

## 3.9 Roadmap

**Semanas 3–4** (paralelo parcial con Fase 2 si retos listos).

---

# FASE 4 — Seguimiento Training

## 4.1 Diseño funcional

**Referencia Food:** semáforo RED/YELLOW/GREEN, plantillas de notificación por nivel, cron automático, coach ve adherencia e interviene.

**Shell objetivo:** replicar **experiencia** en módulo Training del shell usando `TrainingLogStore`, `TrainingPlansStore`, `coachTrainingService.js` (ya calcula adherencia parcial).

### Semáforo Training (lógica propia)

| Color | Regla V1 (ventana 7 días) |
|-------|---------------------------|
| Verde | ≥ 70% sesiones completadas vs planificadas |
| Amarillo | 40–69% |
| Rojo | < 40% o > 2 días sin log |

### Recordatorios automáticos

- Integrar con Communication Center (Fase 1):
  - `training.traffic_light.red` → in_app + email (diario)
  - `training.traffic_light.yellow` → cada 3 días
  - `training.traffic_light.green` → semanal felicitación
- Plantillas configurables en admin (patrón Food, implementación shell).

### Coach

- Panel adherencia por atleta (extender `TrainingExpertProgress.jsx` / coach dashboard).
- Acciones: enviar recordatorio manual, ver incumplimientos, notas coach (ya parcial en training logs).

## 4.2 Impacto técnico

- Nuevo `trainingTrafficLightService.js`.
- Scheduler extiende jobs comm o cron dedicado `@daily 8am`.
- **No toca** módulo `training_version_final` embebido ni APIs NestJS Food.

## 4.3 Tablas

```prisma
model TrainingTrafficLightSnapshot {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  trainerId    Int?     @map("trainer_id")
  status       String   // GREEN|YELLOW|RED
  adherencePct Decimal  @map("adherence_pct") @db.Decimal(5,2)
  windowDays   Int      @default(7) @map("window_days")
  computedAt   DateTime @default(now()) @map("computed_at")
  @@index([userId, computedAt])
}

model TrainingReminderLog {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  level     String   // RED|YELLOW|GREEN
  channel   String   // email|in_app
  sentAt    DateTime @default(now()) @map("sent_at")
  @@index([userId, level, sentAt])
}
```

## 4.4 APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/training/progress/me` | atleta |
| GET | `/api/training/progress/client/:userId` | coach |
| GET | `/api/training/traffic-light/me` | atleta |
| GET | `/api/training/traffic-light/clients` | coach |
| POST | `/api/training/reminders/send/:userId` | coach (manual) |
| GET/PUT | `/api/training/reminder-templates` | admin training |

## 4.5 Pantallas

| Pantalla | Descripción |
|----------|-------------|
| `TrainingProgressDashboard.jsx` | Atleta — semáforo + racha + % cumplimiento |
| Extensión coach panel | Lista atletas con semáforo, filtros rojo/amarillo |
| Admin templates | Sub-sección en Communication Center o Training admin |

## 4.6 Compatibilidad

- Usa `TrainingLogStore` JSON/Prisma existente — sin migrar a Food.
- Recordatorios vía Communication Center — no duplicar MailService.

## 4.7 Estrategia migración

1. Calcular semáforo en shadow mode (log only) 1 semana.
2. Activar recordatorios automáticos con opt-out admin.
3. Plantillas seed training en `communication_templates`.

## 4.8 Plan pruebas

- Atleta 0 logs 7 días → RED.
- Atleta 5/7 completados → GREEN.
- Coach envía recordatorio → log comm + notificación.
- No enviar duplicado mismo día (TrainingReminderLog).

## 4.9 Roadmap

**Semanas 4–5**.

---

# FASE 5 — FAQ Center

## 5.1 Diseño funcional

**Referencia Food:** no tiene FAQ dedicado; referencia general = contenido de ayuda disperso. Objetivo shell: **motor único**, contenido **aislado por módulo**.

### Módulos de contenido

| Módulo FAQ | Administra | Nota |
|------------|------------|------|
| `d28d` | admin_d28d, super_admin | Operación programas, clases, retos |
| `training` | admin_training, coach | Rutinas, adherencia |
| `food` | admin_food (shell) | **Solo espejo admin shell** — Food interno no se toca |
| `platform` | super_admin | Registro, pagos, licencias, soporte |

### CRUD

- Categorías ordenables.
- Ítems con pregunta, respuesta, tags, roles visibles.
- Búsqueda full-text (PostgreSQL `ILIKE` V1; tsvector V2).

## 5.2 Impacto técnico

- Tablas nuevas en shell Prisma.
- Rutas `/api/faq/:modulo/*`.
- Sin dependencia de Food API.

## 5.3 Tablas

```prisma
model FaqCategory {
  id      Int      @id @default(autoincrement())
  modulo  String   @db.VarChar(32)
  nombre  String
  orden   Int      @default(0)
  activo  Boolean  @default(true)
  items   FaqItem[]
  @@index([modulo, activo])
}

model FaqItem {
  id           Int      @id @default(autoincrement())
  categoryId   Int      @map("category_id")
  pregunta     String   @db.VarChar(500)
  respuesta    String   @db.Text
  tags         String[] @default([])
  orden        Int      @default(0)
  activo       Boolean  @default(true)
  visibleRoles Json?    @map("visible_roles")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@index([categoryId, activo])
}
```

## 5.4 APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/faq/:modulo` | autenticado (filtrado rol) |
| GET | `/api/faq/:modulo/search?q=` | autenticado |
| GET | `/api/faq/admin/:modulo/categories` | admin módulo |
| POST/PUT/DELETE | `/api/faq/admin/:modulo/categories/:id` | admin |
| POST/PUT/DELETE | `/api/faq/admin/:modulo/items/:id` | admin |

## 5.5 Pantallas

| Pantalla | Ubicación |
|----------|-----------|
| `FaqCenterAdmin.jsx` | Configuraciones → FAQ (tabs por módulo) |
| `FaqDrawer.jsx` | Drawer “Ayuda” en cada panel de servicio |
| `FaqPublicPage.jsx` | Enlace registro (solo platform) |

## 5.6 Compatibilidad

100% additive. Food embebido mantiene su propia UX.

## 5.7 Estrategia migración

1. Seed FAQ inicial D28D + platform (20–30 preguntas).
2. Training y food shell en fase 2 del contenido.

## 5.8 Plan pruebas

- Admin D28D no puede editar FAQ training.
- Usuario final solo ve ítems de su rol.
- Búsqueda retorna resultados relevantes.

## 5.9 Roadmap

**Semanas 5–6**.

---

# FASE 6 — Asistente contextual

## 6.1 Diseño funcional

**Referencia Food:** FoodBot (Anthropic) — **no replicar**. Shell: asistente **sin servicios de pago, sin IA externa**.

### Comportamiento

1. Usuario abre “?” en módulo activo (d28d / training / platform).
2. Escribe pregunta.
3. Motor busca en FAQ del módulo (keyword + scoring simple).
4. Si match > umbral → muestra respuesta FAQ citada.
5. Si no match → sugerencias de preguntas frecuentes + botón **Contactar soporte** (WhatsApp wa.me existente).
6. Registra interacción en auditoría (`help.assistant.query`).

### Sin IA externa

- No Ollama, no Anthropic, no OpenAI en esta fase.
- Opcional futuro: Ollama local (fuera de scope paridad Food).

## 6.2 Impacto técnico

- `helpAssistantService.js` — búsqueda FAQ + templates de respuesta.
- Depende de Fase 5.
- Reutiliza WhatsApp click log (Fase 1).

## 6.3 Tablas

```prisma
model HelpAssistantLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")
  modulo    String
  query     String
  matchedFaqId Int?  @map("matched_faq_id")
  escalatedWhatsapp Boolean @default(false) @map("escalated_whatsapp")
  createdAt DateTime @default(now()) @map("created_at")
}
```

## 6.4 APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/help/ask` | `{ modulo, query }` → `{ answer, faq_id, suggestions[] }` |
| GET | `/api/help/suggestions/:modulo` | Top 5 FAQ |

## 6.5 Pantallas

- `HelpAssistantWidget.jsx` — flotante en dashboard, contexto = módulo activo.
- Historial local (sessionStorage) — no PII en servidor V1.

## 6.6 Compatibilidad

- Aislado del chat nutricional Food.
- WhatsApp usa infra existente (`whatsappSupport.js`).

## 6.7 Estrategia migración

1. Lanzar con FAQ D28D + platform pobladas.
2. Métricas: preguntas sin match → alimentar FAQ.

## 6.8 Plan pruebas

- Pregunta con match → respuesta correcta + cita FAQ.
- Sin match → escalada WhatsApp registra `support.whatsapp.click`.
- Módulo training solo busca FAQ training.

## 6.9 Roadmap

**Semana 7** (post FAQ).

---

# FASE 7 — Servicios activos (Mi Cuenta)

## 7.1 Diseño funcional

**Referencia Food:** pantalla plan/suscripción con vencimiento, renovación, soporte.

**Shell objetivo:** usuario con **múltiples licencias** (D28D + Training + Food shell access) ve tarjeta por servicio.

### Por cada servicio activo

| Campo | Fuente |
|-------|--------|
| Nombre servicio | `moduleRegistry` |
| Fecha inicio | `module_licenses.valid_from` |
| Fecha vencimiento | `module_licenses.valid_until` |
| Estado | activo / por vencer / vencido |
| Soporte WhatsApp | `resolvePlanSupport(plan)` por servicio |
| Acción | Renovar / Contactar soporte |

### Estado actual

- `MyAccount.jsx` muestra **una cuenta** (`/accounts/me`).
- `/api/licenses/me` existe pero no se usa en UI principal.
- WhatsApp soporte parcialmente implementado.

## 7.2 Impacto técnico

- Extender `GET /accounts/me` o nuevo `GET /accounts/my-services` agregando licencias.
- Solo UI + agregación — **no modificar** lógica de licencias ni pagos.

## 7.3 Tablas

Sin tablas nuevas. Usar:

- `module_licenses`
- `user_accounts`
- `subscription_plans` (support_*)

## 7.4 APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/accounts/my-services` | `{ services: [{ module_code, valid_from, valid_until, status, plan_support }] }` |

Alternativa: enriquecer `/api/licenses/me` con `plan_support` y consumir desde frontend.

## 7.5 Pantallas

- Rediseño sección “Mis servicios” en `MyAccount.jsx`:
  - Grid de tarjetas (D28D, Training, Food, Live).
  - Badge estado (activo / vence en X días / vencido).
  - Botón WhatsApp por servicio.

## 7.6 Compatibilidad

- Fallback: si solo hay una cuenta, UI actual sigue funcionando.
- Food embebido conserva su `PlanVencidoPage` interno.

## 7.7 Estrategia migración

1. Backend: endpoint agregado (additive).
2. Frontend: nueva sección; sección plan actual intacta.
3. Feature flag UI `MY_SERVICES_V2=true`.

## 7.8 Plan pruebas

- Usuario multi-licencia → 2+ tarjetas.
- Usuario solo D28D → 1 tarjeta.
- Vencimiento < 14 días → badge “por vencer”.
- Click WhatsApp → log auditoría.

## 7.9 Roadmap

**Semana 6–7** (puede paralelizarse con FAQ).

---

# Matriz de compatibilidad global

| Área | ¿Se modifica? | Notas |
|------|---------------|-------|
| Registro | ❌ No | |
| Pagos / vigencias admin | ❌ No | Solo lectura para Mi Cuenta |
| Licencias (`licenseService`) | ❌ No | Solo lectura/agregación UI |
| Food embebido | ❌ No | Referencia UX únicamente |
| Training embebido | ❌ No | Seguimiento en shell |
| Communication Center | ✅ Extender | Plantillas training/d28d, dedup |
| Arquitectura shell | ✅ Additive | Nuevas rutas bajo `/api/d28d/*`, `/api/faq/*`, `/api/help/*` |

---

# Estrategia de migración general

```
Fase 1 (validar prod comm) ──► Fase 2 (retos) ──► Fase 3 (seguimiento D28D)
                                      │
Fase 7 (Mi Cuenta) ◄── paralelo ──► Fase 5 (FAQ) ──► Fase 6 (asistente)
                                      │
                               Fase 4 (seguimiento Training)
```

**Principios:**

1. Cada fase entrega valor independiente.
2. Feature flags por módulo.
3. Migraciones Prisma incrementales (una por fase).
4. E2E por fase (`test:comm`, `test:challenges`, `test:progress`, etc.).
5. Rollback = desactivar flag; tablas nuevas no afectan flujos existentes.

---

# Plan de pruebas integrado

| Fase | Script / método | Criterio cierre |
|------|-----------------|-----------------|
| 1 | `npm run test:comm` + SMTP real | 21/21 + email recibido prod |
| 2 | `test:challenges_e2e.mjs` | Participar + podio + auditoría |
| 3 | `test:d28d_progress_e2e.mjs` | Indicadores correctos vs asistencia |
| 4 | `test:training_progress_e2e.mjs` | Semáforo + recordatorio |
| 5 | Manual + API FAQ CRUD | Aislamiento módulos |
| 6 | Manual widget + logs | Match FAQ + escalada WA |
| 7 | Manual multi-licencia | Tarjetas + fechas + WA |

---

# Roadmap de implementación (propuesto)

| Sprint | Fases | Entregable |
|--------|-------|------------|
| S0 | 1 | Comunicación prod validada |
| S1–S2 | 2 | Retos D28D MVP |
| S3 | 3 | Dashboard progreso D28D |
| S4 | 4 | Semáforo + recordatorios Training |
| S5 | 5 + 7 | FAQ Center + Mi Cuenta multi-servicio |
| S6 | 6 | Asistente contextual |

**Duración estimada:** 8–10 semanas (1 dev full-time) o 5–6 semanas (2 devs paralelos en fases 3/4 y 5/7).

---

# Decisiones requeridas antes de desarrollar

1. **Fase 1:** ¿Proveedor email prod (SMTP/Resend/SendGrid)?
2. **Fase 2:** ¿Storage retos local V1 o S3 desde día 1?
3. **Fase 2:** ¿Una o múltiples entregas por reto?
4. **Fase 3:** ¿Umbrales semáforo D28D (70/40) iguales a Training?
5. **Fase 5:** ¿FAQ módulo `food` en shell o solo D28D/Training/Platform?
6. **Fase 6:** ¿Confirmar cero IA externa (solo keyword FAQ)?
7. **Prioridad:** ¿Retos antes que seguimiento o viceversa?

---

*Documento de diseño — pendiente aprobación para desarrollo. Food no se modifica.*
