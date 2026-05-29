# PRODUCT VISION AUDIT — MVPFOOD / D28D

**Fecha:** 2026-05-29  
**Versión analizada:** `cbc4e39` (`main`)  
**Alcance:** Shell D28D + integraciones FOOD_PLAN / TRAINING (sin modificar `food_version_final`)  
**Tipo:** Análisis estratégico — **sin implementación de cambios**

**Referencias:** `docs/PILOT_READINESS_FIXES.md`, `docs/SEMANTIC_UX_AUDIT.md`, `docs/STAGING_READINESS.md`, manuales en `docs/MANUALES/`

---

## 1. Resumen ejecutivo

El ecosistema **cumple la visión técnica de negocio**: registro único, licencias por módulo, cadena comercial SERVICIO → PROGRAMA → PLAN → PAGO → LICENCIA → VIGENCIA, Communication Center, retos, seguimiento y SSO a FOOD_PLAN/TRAINING. E2E en verde (81 pruebas automatizadas locales).

**Fortalezas comerciales:** modularidad real, white-label gym/coach, códigos de invitación, retención (retos + semáforos + FAQ + asistente + WhatsApp).

**Riesgos de producto:** no hay checkout público de **bundle triple** (D28D+FOOD+TRAINING); dos flujos de registro; fragmentación UX cuando módulos son externos; super-admin con navegación densa; usuario final sin centro de notificaciones unificado.

**Recomendación:** **READY** para piloto controlado 5 usuarios; **WARNING** para 20–35 y producción controlada hasta cerrar env productivo (SMTP, Zoom, Wompi) y 3 fricciones UX de alto impacto.

---

## 2. Hallazgos por severidad

### CRÍTICO

| ID | Hallazgo | Evidencia | Impacto |
|----|----------|-----------|---------|
| C1 | **No existe registro comercial “pack completo”** (D28D + FOOD + TRAINING en un solo checkout) | `RegisterCommercialWizard.jsx` — paso 1 elige un solo servicio; triple módulo solo vía admin/licencias (`final.d28d@d28d.local`) | Marketing promete ecosistema; venta pública es mono-servicio |
| C2 | **Capacidad bajo carga alta** (stress K6) | `performance/results/capacity-estimate.json` — BLOCKER >~500 VUs | No afecta piloto 5–35; sí apertura masiva sin tuning |

### ALTO

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| A1 | Dos flujos de registro (wizard vs legacy con código obligatorio) | `App.jsx` (`VITE_REGISTER_WIZARD_V2`), `Register.jsx` vs `RegisterCommercialWizard.jsx` |
| A2 | Usuario final **sin bandeja de notificaciones** (clases, licencia, retos) | Communication Center emite eventos; UI usuario no centraliza |
| A3 | **Doble asistente** para usuarios Food (FAB NutritionChat + HelpAssistant en Progreso) | `Dashboard.jsx`, `HelpAssistantWidget` |
| A4 | Coach: **UI de roles** muestra opciones que backend rechaza | `AdminUsers.jsx` vs `serverApp.js` POST `/admin/users` |
| A5 | Seguimiento Food vs Training **en UIs distintas** (iframe SSO vs shell) | `CoachEcosystemTracking.jsx`, módulo Food externo |
| A6 | Super-admin: **9 ítems de nav** + duplicidad Pagos/Vigencias/Maestros | `Dashboard.jsx`, `CommercialPlansHub`, `AdminModuleVigencias` |
| A7 | Salto a módulos externos (Food/Training) rompe continuidad “una app” | `foodModule.js`, `trainingModule.js`, flags `VITE_*_EXTERNAL` |

### MEDIO

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| M1 | Retos bajo **Progreso**, no en home — baja discoverability | `D28dChallengesPanel.jsx`, nav usuario final |
| M2 | Gym **no administra retos** — solo plataforma D28D | `D28DAdminView.jsx` roles |
| M3 | Panel Empresas no crea gyms/trainers (by design) | `AdminCompanies.jsx` — hint a Gimnasios |
| M4 | Progreso sobrecargado para usuario triple licencia | `Progress.jsx` — Food + D28D + Training + retos + asistente |
| M5 | Renovación **por módulo** en Mi Cuenta | `MyAccount.jsx`, `POST /accounts` con `module_code` |
| M6 | Wizard registro **5 pasos** + moneda — fricción vs invitación directa | `RegisterCommercialWizard.jsx` |
| M7 | Reportes gym dispersos (asistencia live, agregados progreso) | `AdminLiveClasses.jsx`, `Progress.jsx` |
| M8 | Coach puro **sin Inicio** — boot a progreso/galería | `Dashboard.jsx` |
| M9 | Etiquetas mixtas legacy (`Plan de alimentación` en `Register.jsx`) | `MODULE_LABELS` vs auditoría semántica |

### BAJO

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| B1 | `PanelCard` clic + botón “Abrir” redundante | `D28DAdminView.jsx` |
| B2 | Ranking retos solo top 5 en panel — sin hub global | API ranking |
| B3 | White-label por URLs, no wizard de assets | `WhiteLabelFields.jsx` |
| B4 | Extender vigencia con `window.prompt` | `AdminModuleVigencias.jsx` |

---

## 3. PERFIL 1 — USUARIO FINAL

### Pregunta clave

**¿Un usuario nuevo entiende la plataforma en menos de 5 minutos?**

**Respuesta:** **Parcialmente sí** si entra por wizard directo con un solo servicio y plan visible. **No** si necesita bundle triple, códigos mixtos o módulos externos — requiere >5 min o soporte humano.

### Validación por área

| Área | ¿Intuitivo? | Notas |
|------|-------------|-------|
| Registro | ⚠️ | Wizard claro por servicio; código de gym en wizard OK post-estabilización |
| Login | ✅ | Un email, un JWT |
| Compra | ⚠️ | Wompi + sede; pareja con código diferido en sede |
| Licencia | ✅ | Badges en Mi Cuenta |
| Acceso servicios | ✅ | Tarjetas en Inicio según licencia |
| Programas / clases | ✅ | Calendario semanal por defecto |
| Rutinas | ✅ | Vía D28D / Training según licencia |
| Retos | ⚠️ | Ocultos bajo Progreso |
| Seguimiento | ✅ | Semáforos + gráficas |
| Mi Cuenta | ✅ | Servicios, vigencia, WhatsApp |
| Soporte | ✅ | FAQ + asistente + WhatsApp |
| Correos / WhatsApp | ⚠️ | Dependen de config admin |
| Notificaciones | ❌ | Sin inbox usuario |
| FAQ / Asistente | ⚠️ | Duplicidad con chat Food |

### Fricciones detectadas

- Demasiados clics: Inicio → Progreso → Retos (3 niveles)
- Mensajes ambiguos: errores SSO Food sin URL configurada (mejorado a 503 con hint)
- Flujo compra: 5 pasos wizard + redirect Wompi
- Botones duplicados: asistentes Food

---

## 4. PERFIL 2 — ENTRENADOR

### Pregunta clave

**¿Un entrenador puede escalar su negocio usando la plataforma?**

**Respuesta:** **Sí, con límites.** Puede rutinas, galería, seguimiento, marca, código de invitación (vía admin). **No** crea usuarios libremente como admin comercial — comparte código (modelo correcto). Escala mejor con white-label + Training embebido que con Food fragmentado.

### Validación

| Área | Estado |
|------|--------|
| Rutinas | ✅ Maestro + asistente IA |
| Galería | ✅ Primera tarjeta coach |
| Seguimiento / semáforo | ⚠️ Split Food/Training |
| Entrenados | ✅ Mis usuarios (scope coach) |
| Marca personal | ✅ CoachBrandingPanel |
| Invitaciones / código | ⚠️ No self-service en panel coach |

### Oportunidades comerciales

- Dashboard coach con KPIs (activos, semáforo rojo, renovaciones)
- Código de invitación visible en panel coach
- Pack “coach + FOOD” como SKU único

---

## 5. PERFIL 3 — GYM

### Pregunta clave

**¿Un gimnasio puede ampliar servicios sin aumentar estructura operativa?**

**Respuesta:** **Sí en modelo D28D** (clases globales, retos plataforma, white-label). **Limitado** en operación propia de retos y reportes ejecutivos unificados.

### Validación

| Área | Estado |
|------|--------|
| Marca blanca | ✅ AdminGyms / Mi marca |
| Usuarios | ✅ Scope gym + plan obligatorio |
| Invitaciones | ✅ Código editable |
| Clases en vivo | ✅ Programación si rol permite |
| Retos | ❌ Solo lectura usuario; admin D28D crea |
| Seguimiento / reportes | ⚠️ Disperso |
| Programas | ✅ Vía D28D |

### Barreras de adopción

- Gym no crea su sede — depende de super_admin
- D28D panel anidado (Maestros → D28D → …)
- Sin dashboard “salud del gym” único

---

## 6. PERFIL 4 — SUPER ADMIN

### Pregunta clave

**¿Puede operar todo el ecosistema desde una sola plataforma?**

**Respuesta:** **Sí funcionalmente** — todos los maestros existen. **Con fricción operativa** por navegación profunda y procesos manuales (confirmar pagos sede, extender vigencias, configurar comms).

### Validación

| Área | Estado |
|------|--------|
| Usuarios / planes / programas | ✅ |
| Licencias / pagos / vigencias | ✅ (entrada duplicada) |
| Gym / entrenadores | ✅ |
| D28D / FOOD / TRAINING | ✅ vía maestros + SSO |
| Retos / FAQ / comunicación | ✅ |
| Auditoría | ✅ |

### Riesgos operativos

- Dependencia de variables `.env` (Zoom, Food, Wompi, SMTP)
- Migraciones Prisma manuales post-deploy
- Sin alertas proactivas de jobs scheduler fallidos en UI

---

## 7. EXPERIENCIA COMERCIAL

### Flujos validados (E2E)

| Flujo | Estado |
|-------|--------|
| D28D → Programa → Plan → Pago → Licencia → Acceso | ✅ |
| FOOD_PLAN → Pago → Acceso | ✅ |
| TRAINING → Pago → Acceso | ✅ |
| D28D + FOOD_PLAN | ⚠️ Solo admin/licencias, no checkout único |
| D28D + TRAINING | ⚠️ Idem |
| FOOD + TRAINING | ⚠️ Idem |
| Triple combo | ⚠️ Seed `final.d28d@d28d.local`, no wizard |

---

## 8. RETENCIÓN

### ¿Qué hace que un usuario vuelva?

| Mecanismo | Fortaleza |
|-----------|-----------|
| Retos + ranking + premios | Alta si admin publica retos activos |
| Seguimiento / semáforo | Alta — feedback visual |
| Clases en vivo D28D | Alta — cita semanal |
| Correos / WhatsApp | Media — requiere templates |
| FAQ / Asistente | Media |
| Comunidad | Baja — no hay feed social nativo |

### ¿Qué hace que abandone?

- Licencia vencida sin aviso claro en app (solo comms si configurados)
- SSO Food fallido
- Confusión multi-módulo / múltiples renovaciones
- Retos no visibles desde home

### Mejoras de adherencia (sin nuevas features — UX/ops)

1. Notificación in-app de vencimiento y clase próxima
2. Retos en home o badge en nav
3. Onboarding 3 pantallas post-registro
4. Unificar asistente Food

---

## 9. INNOVACIÓN (solo experiencia / ventas / retención / escala)

| Idea | Tipo | Prioridad |
|------|------|-----------|
| SKU “Ecosistema completo” en registro | Ventas | Alta |
| Inbox notificaciones usuario | Experiencia | Alta |
| Dashboard coach KPI | Ventas/retención | Media |
| Dashboard gym ejecutivo | Escalabilidad gym | Media |
| Onboarding guiado por rol | Experiencia | Media |
| Consolidar nav super-admin (Pagos+Vigencias) | Operación | Media |
| Health check panel env (Zoom/Food/SMTP) | Operación | Alta |

*No se proponen features “por moda” (social feed, IA genérica, gamificación vacía).*

---

## 10. Roadmap priorizado (siguiente versión — post-piloto)

| Prioridad | Ítem | Esfuerzo estimado |
|-----------|------|-------------------|
| P0 | Env productivo staging (SMTP, Zoom S2S, Wompi prod, HTTPS) | Ops |
| P0 | Migraciones + seed verify en staging | Ops |
| P1 | Bundle comercial triple en wizard o plan “Ecosistema” | Producto/M |
| P1 | Centro notificaciones usuario final | S |
| P1 | Unificar asistente Food (1 widget) | S |
| P2 | Coach: código invitación en panel + guard roles UI | S |
| P2 | Retos visible desde home / badge | S |
| P2 | Dashboard gym KPI | M |
| P3 | Consolidar nav admin | M |
| P3 | Reporte gym unificado | M |
| P4 | Capacity tuning pre-apertura masiva | Ops/L |

---

## 11. DECISIÓN FINAL

| Escenario | Clasificación | Condiciones |
|-----------|---------------|-------------|
| **Piloto 5 usuarios** | **READY** | Staging con env mínimo; soporte manual WhatsApp; cuentas seed o invitación |
| **Piloto 20 usuarios** | **WARNING** | Cerrar P0 ops + monitoreo PG; revisar fricción registro bundle |
| **Piloto 35 usuarios** | **WARNING** | Idem + plan soporte dedicado; confirmar Wompi prod |
| **Producción controlada** | **WARNING** | SMTP real, Zoom real, backups, PM2, HTTPS, capacity review antes de marketing masivo |

### Blockers absolutos para producción abierta

1. Variables productivas no configuradas en servidor
2. Checkout bundle alineado con promesa comercial (si marketing vende “todo en uno”)
3. Capacity BLOCKER bajo stress (solo para escala >35 concurrentes)

---

## 12. Recomendación final

**Lanzar piloto real con 5 usuarios** usando `cbc4e39` en staging una vez aplicado el checklist de `docs/PRE_PILOT_OFFICIAL.md`. El producto es **funcionalmente completo** y **comercialmente viable** para piloto asistido.

Para escalar a 20–35 y producción controlada, tratar como **WARNING** hasta:

1. Operacionalizar env productivo (no código).
2. Decidir estrategia de bundle (SKU único vs tres compras).
3. Reducir fricción UX de alto impacto (notificaciones, asistente único, nav admin).

**No se recomienda** rediseño arquitectónico ni tocar `food_version_final` en esta fase. La siguiente versión debe ser **iteración UX/comercial** sobre el shell existente.

---

*Auditoría generada sin implementar cambios. Evidencia técnica: commits `cbc4e39`, `4434859`; suites E2E 81/81 OK en local 2026-05-29.*
