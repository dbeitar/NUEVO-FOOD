# Fase Producto V1.1 — Diseño y auditoría

**Proyecto:** MVPFOOD / D28D  
**Fecha:** 2026-05-26  
**Estado:** análisis y propuesta — **sin implementación**  
**Restricción:** el módulo Food no se modifica (solo referencia funcional).

---

## Resumen ejecutivo

| Bloque | Estado actual | Propuesta V1.1 |
|--------|---------------|----------------|
| Comunicaciones (correos/notificaciones) | **Parcial** — logs sí, correos no | Motor de despacho unificado en shell |
| FAQ Center | **No existe** en shell | Motor compartido + contenido aislado por módulo |
| Agente de ayuda | **Parcial** — Ollama en shell, FoodBot en Food (no tocar) | RAG local gratuito por módulo en shell |
| Retos D28D | **No existe** | Módulo nuevo en shell D28D |

**Esfuerzo total estimado:** 28–38 días-persona (ver §9).

---

# BLOQUE 1 — Auditoría correos y notificaciones

## 1.1 Arquitectura actual

```
Evento de negocio (register, pago, clase…)
        │
        ▼
communicationCenterService.logEvent()  ──► communication_event_logs (PostgreSQL)
        │
        ▼ (opcional, no conectado hoy)
NotificationDatabase.create()          ──► notifications.json (JsonStore)
        │
        ✗ No hay envío SMTP en shell
        ✗ Plantillas no se resuelven automáticamente
```

**Food (referencia, no modificar):** `modules/food_version_final/backend/src/common/mail.service.ts` — nodemailer + SMTP real + MailHog dev + emails de bienvenida, renovación, recordatorios.

**Shell:** no tiene `MailService`. Comentario en `authController.js`: *"TODO: enviar contraseña temporal por email (SendGrid)"*.

### Hallazgo crítico en código

En `communicationCenterService.js`, `normalizeChannel()` mapea `'email'` → `'in_app'`. Las plantillas con canal `email` se guardan pero **nunca se tratan como email** en logs ni despacho.

---

## 1.2 Matriz de validación por evento

Evidencia basada en código (`backend/src`) y E2E previo (`npm run test:comm`, 17/17 en eventos implementados).

| Evento solicitado | ¿Evento generado? | ¿Correo enviado? | ¿Plantilla usada? | ¿Auditoría registrada? | Errores / brechas |
|-------------------|-------------------|------------------|-------------------|------------------------|-------------------|
| **Registro** | ✅ `user.registered` — `authController.js` | ❌ No | ❌ `template_id` siempre null | ✅ `communication_event_logs` + Winston | Solo canal `in_app`; sin email al usuario |
| **Pago aprobado** | ✅ `payment.approved` — `paymentAdminController.js` | ❌ No | ❌ No | ✅ Log + `NotificationDatabase` tipo `pago_confirmado` | Notificación in-app al usuario sí; email no |
| **Pago rechazado** | ✅ `payment.rejected` — `paymentAdminController.js` | ❌ No | ❌ No | ✅ Log + `NotificationDatabase` tipo `pago_rechazado` | Idem |
| **Inicio ciclo** | ❌ No existe evento | ❌ No | ❌ No | ❌ No | `cycleController.js` CRUD sin hooks; cambio `active_cycle_id` en programa sin evento |
| **Cambio horario** | ✅ `d28d.class.time_changed` — `liveClassController.js` | ❌ No | ❌ No | ✅ Log | Comparación start/end antes del update (corregido en hardening) |
| **Licencia próxima a vencer** | ❌ No | ❌ No | ❌ No | ❌ No | Solo listado reactivo en `GET /payment-admin/overview` y `getExpiringSoon()`; sin job ni notificación proactiva |
| **Licencia vencida** | ❌ No (shell) | ❌ No (shell) | ❌ No | ❌ Parcial | Bloqueo en `auth`/licencias al login; Food tiene flujo propio (`PlanVencidoPage`) — **no tocar** |
| **Reactivación** | ❌ No evento comm | ❌ No | ❌ No | ⚠️ Parcial | `extendVigencia` crea notificación `vigencia_extendida`; sin `logEvent` |
| **Seguimiento** | ❌ No como comm | ❌ No | ❌ No | ⚠️ Parcial | Existe **seguimiento operativo** (`d28dCoachTracking`, training logs); no es evento de comunicación |

### Eventos adicionales ya implementados (no en checklist original)

| Evento | Estado |
|--------|--------|
| `d28d.class.scheduled` | ✅ Log al crear clase |
| `d28d.class.updated` | ✅ Si editan clase sin cambio de horario |
| `support.whatsapp.click` | ✅ Log + auditoría |
| `pago_pendiente` (admin) | ✅ `paymentNotifyService` → NotificationDatabase |
| `live_class_host` (coach) | ✅ `d28dHostNotification.js` → NotificationDatabase |

---

## 1.3 Plantillas y canales

| Canal en UI admin | Persistencia | Despacho real |
|-------------------|--------------|---------------|
| `in_app` | ✅ `communication_templates` | ⚠️ `deliverInAppNotification()` existe pero **no se invoca** desde hooks |
| `email` | ✅ Guardado en BD | ❌ Normalizado a `in_app`; sin SMTP shell |
| `whatsapp_link` | ✅ Config por plan | ✅ wa.me operativo; clic auditado |

---

## 1.4 Conclusión auditoría

**Lo que funciona hoy:** registro de eventos en PostgreSQL, UI admin (Plantillas/Eventos/WhatsApp/Auditoría), notificaciones in-app puntuales vía JsonStore, WhatsApp wa.me.

**Lo que NO funciona como producto de comunicaciones:**

1. Ningún correo sale desde el shell.
2. Plantillas no se enlazan ni renderizan en runtime.
3. Cinco de nueve eventos del checklist **no existen**.
4. No hay job programado para vencimientos.
5. Canal `email` roto por normalización incorrecta.

---

## 1.5 Propuesta de implementación (post-aprobación)

### Motor `dispatchEvent(evento, context)`

1. Buscar plantilla activa `(evento, modulo, canal)`.
2. Renderizar variables (`{{nombre}}`, `{{plan}}`, `{{fecha_vencimiento}}`…).
3. Por canal:
   - `in_app` → `deliverInAppNotification` + log con `template_id`
   - `email` → nuevo `shellMailService` (patrón Food, **código nuevo en shell**, sin tocar Food)
   - `whatsapp_link` → solo log (enlace ya en UI)
4. Siempre `logEvent` con `template_id`, `estado: ok|error`, `error` si falla SMTP.

### Eventos a implementar

| Evento propuesto | Trigger |
|------------------|---------|
| `d28d.cycle.started` | Usuario asignado a `cycle_id` en cuenta, o admin cambia `active_cycle_id` de programa |
| `license.expiring_soon` | Job diario: licencias/cuentas con vencimiento en 7/14 días |
| `license.expired` | Job diario + bloqueo ya existente en auth |
| `license.reactivated` | `extendVigencia` + `confirmPayment` |
| `tracking.reminder` | Job semanal o trigger coach (opcional V1.1) |

**Esfuerzo Bloque 1:** 5–7 días-persona.

---

# BLOQUE 2 — FAQ Center (diseño)

## 2.1 Principio

- **Un motor** en shell (`faqEngine`).
- **Contenido aislado** por `modulo`: `d28d`, `training`, `food`, `platform` (administración).
- Food mantiene su FAQ interna si la tuviera; el shell **no modifica** Food — solo expone API/UI para D28D, Training y Admin.

## 2.2 Modelo de datos (PostgreSQL)

```prisma
model FaqCategory {
  id        Int      @id @default(autoincrement())
  modulo    String   @db.VarChar(32)   // d28d | training | food | platform
  nombre    String   @db.VarChar(120)
  orden     Int      @default(0)
  activo    Boolean  @default(true)
  items     FaqItem[]
  @@index([modulo, activo])
}

model FaqItem {
  id          Int      @id @default(autoincrement())
  categoryId  Int
  pregunta    String   @db.VarChar(500)
  respuesta   String   @db.Text
  tags        String[] @default([])
  orden       Int      @default(0)
  activo      Boolean  @default(true)
  visibleRoles Json?   // null = todos; ["usuario_final"] etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  category    FaqCategory @relation(...)
  @@index([categoryId, activo])
}
```

**Regla:** queries siempre filtran `modulo = X`. Un admin D28D no puede leer/editar FAQ de Training.

## 2.3 APIs (shell `/api/faq`)

| Método | Ruta | Rol | Uso |
|--------|------|-----|-----|
| GET | `/faq/:modulo` | autenticado | Listado público filtrado por rol |
| GET | `/faq/:modulo/search?q=` | autenticado | Búsqueda full-text |
| GET | `/faq/admin/:modulo/categories` | admin del módulo | CRUD categorías |
| POST/PUT/DELETE | `/faq/admin/:modulo/...` | admin del módulo | CRUD ítems |

### Permisos

| Módulo FAQ | Administra |
|------------|------------|
| `d28d` | super_admin, admin_d28d |
| `training` | super_admin, admin_training |
| `food` | super_admin, admin_food *(solo shell mirror; Food interno intacto)* |
| `platform` | super_admin |

## 2.4 Pantallas

| Pantalla | Ubicación | Usuario |
|----------|-----------|---------|
| **FAQ Admin** | Maestros → Configuraciones → FAQ (tab por módulo) | Admins |
| **FAQ Usuario** | Drawer/modal "Ayuda" en cada panel de servicio | usuario_final, coaches |
| **FAQ Pública registro** | Enlace en wizard registro (solo platform) | anónimo (solo platform) |

## 2.5 Referencia Food (solo lectura)

Food no tiene módulo FAQ dedicado hoy; sí tiene plantillas de notificación y chatbot nutricional. El FAQ Center shell sería **nuevo** para D28D/Training/Admin, no una migración de Food.

**Esfuerzo Bloque 2:** 4–5 días-persona.

---

# BLOQUE 3 — Agente de ayuda (diseño)

## 3.1 Objetivo

Asistente **gratuito** por módulo activo que responda usando:

- FAQ del módulo (Bloque 2)
- Extractos de `docs/MANUAL_ECOSISTEMA.md` (índice por módulo)
- Contexto de sesión (plan, rol, servicio abierto)

**Sin** APIs de pago (no Anthropic/OpenAI en shell — Food usa Anthropic internamente; **no replicar ni modificar**).

## 3.2 Arquitectura propuesta

```
Usuario (módulo activo = d28d)
        │
        ▼
POST /api/help/chat  { message, modulo, history[] }
        │
        ├──► faqSearch(modulo, query)     → top 5 chunks
        ├──► manualChunks(modulo)         → markdown pre-indexado
        └──► Ollama local (ya en aiController)
                    │
                    ▼
              Respuesta + fuentes citadas
```

### Stack gratuito

| Componente | Tecnología | Costo |
|------------|------------|-------|
| LLM | **Ollama** (`OLLAMA_BASE_URL`, modelo `llama3.1:8b` ya configurado) | $0 (self-hosted) |
| Embeddings | `nomic-embed-text` vía Ollama o búsqueda keyword en FAQ | $0 |
| Fallback | Respuestas FAQ directas sin LLM si Ollama no disponible | $0 |

### Contexto por módulo

| Módulo activo | System prompt incluye |
|---------------|----------------------|
| d28d | FAQ d28d, manual §programas/clases/ciclos |
| training | FAQ training, manual §entrenadores |
| food | FAQ shell food *(solo lectura)* — **no invocar APIs Food** |
| platform | FAQ admin, manual §maestros/configuraciones |

## 3.3 Pantallas

- Widget flotante "?" en dashboard (visible según `module_access`).
- Historial de sesión en localStorage (no persistir PII en servidor en V1.1).
- Panel admin: métricas de preguntas frecuentes sin respuesta (para mejorar FAQ).

## 3.4 Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Ollama no instalado en prod | Fallback FAQ keyword; mensaje claro al usuario |
| Alucinaciones | Prompt: "solo responde con contexto provisto"; citar fuente FAQ |
| Carga CPU | Rate limit; modelo pequeño; timeout 15s |
| Confusión con FoodBot | UI distinta; scope estricto por `modulo`; no embed Food chat |

## 3.5 Esfuerzo

**Bloque 3:** 5–7 días-persona (depende de indexación manual vs embeddings).

---

# BLOQUE 4 — Retos D28D (diseño)

## 4.1 Alcance

Funcionalidad **nueva** en shell D28D. No existe código previo (grep sin matches de challenge/reto/ranking en shell).

## 4.2 Modelo de datos

```prisma
model D28dChallenge {
  id            Int      @id @default(autoincrement())
  titulo        String
  descripcion   String   @db.Text
  programId     String?  @map("program_id")    // vital | pancitas | virtual_d28d
  cycleId       Int?     @map("cycle_id")
  fechaInicio   DateTime @map("fecha_inicio")
  fechaFin      DateTime @map("fecha_fin")
  estado        String   @default("draft")   // draft | open | closed | published
  reglas        Json?    // tipos archivo, max MB, criterios
  creadoPorId   Int      @map("creado_por_id")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  entries       D28dChallengeEntry[]
  podium        D28dChallengePodium[]
}

model D28dChallengeEntry {
  id           Int      @id @default(autoincrement())
  challengeId  Int
  userId       Int
  titulo       String?
  comentario   String?  @db.Text
  puntuacion   Decimal? @db.Decimal(5,2)  // admin
  estado       String   @default("submitted") // submitted | reviewed | disqualified
  submittedAt  DateTime @default(now())
  files        D28dChallengeFile[]
  @@unique([challengeId, userId])  // una participación por reto (V1.1)
}

model D28dChallengeFile {
  id        Int    @id @default(autoincrement())
  entryId   Int
  tipo      String // photo | document | video
  url       String
  mime      String?
  sizeBytes Int?
  createdAt DateTime @default(now())
}

model D28dChallengePodium {
  id          Int @id @default(autoincrement())
  challengeId Int
  lugar       Int // 1 | 2 | 3
  entryId     Int
  publicadoAt DateTime?
  @@unique([challengeId, lugar])
}
```

## 4.3 Almacenamiento archivos

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Disco local** (`backend/uploads/challenges/`) | Rápido, $0 | No escala multi-instancia |
| **B. S3-compatible** | Producción ready | Config extra |

**Recomendación V1.1:** A en dev/staging; interfaz `StorageProvider` para migrar a B en prod.

- Multer (patrón existente en `frontendUpload.js`).
- Límites: 5 MB foto, 10 MB doc, tipos `image/jpeg`, `image/png`, `application/pdf`.
- Antivirus: fuera de scope V1.1.

## 4.4 APIs

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/d28d/challenges` | usuario (activos) / admin (todos) |
| GET | `/api/d28d/challenges/:id` | autenticado |
| POST | `/api/d28d/challenges` | admin_d28d, super_admin |
| PUT | `/api/d28d/challenges/:id` | admin |
| POST | `/api/d28d/challenges/:id/close` | admin |
| POST | `/api/d28d/challenges/:id/participate` | usuario_final (licencia d28d) |
| POST | `/api/d28d/challenges/:id/entries/:entryId/files` | participante |
| PUT | `/api/d28d/challenges/:id/entries/:entryId/score` | admin |
| POST | `/api/d28d/challenges/:id/podium` | admin — body `{ first, second, third }` entryIds |
| POST | `/api/d28d/challenges/:id/publish-winners` | admin |
| GET | `/api/d28d/challenges/:id/ranking` | autenticado — orden por puntuación |

## 4.5 Pantallas

### Usuario (`D28dChallengesPanel.jsx`)

- Listado de retos abiertos del programa del usuario.
- Detalle: reglas, fechas, botón participar.
- Formulario: fotos + archivos + comentario.
- Ranking (solo puntuaciones publicadas).
- Podio visible tras `published`.

### Admin (`D28dChallengesAdmin.jsx` en D28DAdminView)

- CRUD retos.
- Tab participantes con preview de archivos.
- Calificación numérica + notas.
- Selector podio (drag o dropdown top 3).
- Publicar ganadores → evento `d28d.challenge.winners_published` (comunicaciones).

## 4.6 Auditoría

| Acción | Evento |
|--------|--------|
| Crear/editar/cerrar reto | `d28d.challenge.*` |
| Participación | `d28d.challenge.entry_submitted` |
| Calificar | `d28d.challenge.scored` |
| Publicar podio | `d28d.challenge.winners_published` |

## 4.7 Esfuerzo

**Bloque 4:** 10–14 días-persona.

---

# 5. Impacto técnico

| Área | Cambio |
|------|--------|
| PostgreSQL | +8 tablas (FAQ 2, Retos 4, opcional help_sessions 1, mail_log 1) |
| Backend shell | Nuevos services: `mailService`, `dispatchEvent`, `faqService`, `helpAgentService`, `challengeService` |
| Frontend shell | FAQ UI, Help widget, Retos panel + admin |
| Jobs | Cron node-cron o worker: vencimientos diarios |
| Infra | SMTP env vars (como Food pero en shell `.env`); Ollama opcional |
| Food | **Cero cambios** |
| Training module embebido | Opcional enlace a FAQ training del shell |

---

# 6. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| SMTP mal configurado en prod | Media | Alto | MailHog dev; health check `/api/comms/mail-test` |
| Duplicar lógica Food mail | Baja | Medio | Copiar patrón, no código; namespaces distintos |
| Retos: storage en disco | Media | Alto en prod | Provider S3 en fase 1.2 |
| Agente sin Ollama | Alta en prod | Medio | Fallback FAQ |
| Scope creep FAQ Food | Media | Alto | Tab `food` solo admin shell; no tocar `food_version_final` |
| JsonStore notifications vs Prisma | Alta | Medio | Migrar notifications a Prisma en Bloque 1 |

---

# 7. Compatibilidad

| Principio | Cumplimiento |
|-----------|--------------|
| Evolución sin destrucción | ✅ Solo additive: nuevas tablas, rutas, pantallas |
| APIs existentes | ✅ Sin breaking changes |
| Communication Center actual | ✅ Extiende `dispatchEvent`; corrige `normalizeChannel` |
| Licencias / pagos | ✅ Hooks adicionales en puntos ya identificados |
| Food | ✅ Aislamiento total |

---

# 8. Priorización recomendada

| Orden | Bloque | Prioridad | Justificación |
|-------|--------|-----------|---------------|
| 1 | **Comunicaciones — motor + email + eventos faltantes** | P0 | Bloquea confianza operativa y producción |
| 2 | **FAQ Center** | P1 | Prerrequisito del agente; valor inmediato sin IA |
| 3 | **Agente de ayuda** | P2 | Depende FAQ + Ollama; mejora UX |
| 4 | **Retos D28D** | P2 | Feature diferenciador; independiente de 1–3 |

### Entregas incrementales sugeridas

- **V1.1a:** Motor dispatch + SMTP shell + 9 eventos checklist + job vencimientos.
- **V1.1b:** FAQ Center D28D + platform.
- **V1.1c:** Agente ayuda D28D + Training.
- **V1.1d:** Retos D28D MVP (participar, archivos, ranking, podio).

---

# 9. Esfuerzo estimado

| Bloque | Días-persona | Notas |
|--------|--------------|-------|
| Comunicaciones completo | 5–7 | Incluye mail service + cron + fix email channel |
| FAQ Center | 4–5 | 4 módulos admin + UI usuario |
| Agente ayuda | 5–7 | Ollama + fallback + widget |
| Retos D28D | 10–14 | CRUD + uploads + ranking + admin |
| QA + E2E | 4–5 | Extender `test:comm` + nuevos scripts |
| **Total** | **28–38** | 1 dev full-time ≈ 6–8 semanas |

---

# 10. Criterios de aprobación sugeridos

Antes de implementar, confirmar:

- [ ] ¿SMTP producción (host, from, credenciales) disponible para shell?
- [ ] ¿Ollama en servidor o solo fallback FAQ?
- [ ] ¿Retos: una o múltiples entradas por usuario?
- [ ] ¿Storage retos: local V1.1 o S3 desde día 1?
- [ ] ¿FAQ módulo `food` en shell o solo D28D/Training/Platform?
- [ ] ¿Job vencimientos: 7 días, 14 días, o ambos?

---

*Documento de diseño — pendiente aprobación para desarrollo.*
