# ECOSYSTEM ALIGNMENT AUDIT — MVPFOOD / D28D

**Fecha:** 2026-05-29  
**Versión analizada:** `09f38cd` (`main`)  
**Marco estratégico:** FOOD_PLAN congelado — **no se modifica** `food_version_final`, UX Food, rutas Food ni componentes Food.  
**Tipo:** Auditoría de alineación del Shell + D28D + TRAINING al estándar operativo de FOOD_PLAN.  
**Implementación:** **Ninguna** en este documento — solo hallazgos, acciones clasificadas y propuestas V1.1/V2.

**Referencias:** `docs/PRODUCT_VISION_AUDIT.md`, `docs/PILOT_READINESS_FIXES.md`, `docs/PRE_PILOT_OFFICIAL.md`, `docs/SEMANTIC_UX_AUDIT.md`

---

## 0. Principio rector

FOOD_PLAN es el módulo de referencia: usuarios reales, recurrencia, adopción probada.  
El ecosistema debe **adaptarse a Food**, no al revés.

| Regla | Estado |
|-------|--------|
| No tocar `modules/food_version_final/` | ✅ Respetado en este cierre |
| Cambios solo en Shell / D28D / TRAINING | ✅ Alcance de acciones propuestas |
| Sin nuevas funcionalidades en este cierre | ✅ Solo documentación |

---

## 1. Brechas encontradas (vs PRODUCT_VISION_AUDIT)

| ID | Brecha | Área | Severidad | ¿Toca Food? |
|----|--------|------|-----------|-------------|
| B1 | Dos flujos de registro (wizard vs legacy) | Shell | ALTO | No |
| B2 | Asistentes duplicados para usuario con FOOD_PLAN | Shell | ALTO | No (solo ocultar competencia shell) |
| B3 | Coach ve roles admin en UI; backend 403 | Shell | ALTO | No |
| B4 | Sin bandeja de notificaciones usuario final | Shell | ALTO | No |
| B5 | Retos solo bajo Progreso (no en nav/home) | Shell D28D | MEDIO | No |
| B6 | Navegación D28D anidada (Maestros → panel → programa) | Shell | MEDIO | No |
| B7 | Super-admin: Pagos + Vigencias + Maestros redundantes | Shell | MEDIO | No |
| B8 | Usuario Food migrado debe aprender shell (Inicio, Progreso, Clases) | Shell | MEDIO | No (Food SSO intacto) |
| B9 | No hay checkout bundle triple en registro | Comercial | CRÍTICO comercial | No |
| B10 | Gym no administra retos (solo plataforma) | D28D | BAJO (by design) | No |
| B11 | `HelpAssistantWidget` y FAB `NutritionChat` compiten esquina inferior derecha | Shell UX | ALTO | No |

---

## 2. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación (sin tocar Food) |
|--------|--------------|---------|----------------------------|
| Usuario Food ve dos asistentes y abandona shell | Media | Alto | Ocultar asistente shell si solo FOOD (acción inmediata shell) |
| Coach intenta crear super_admin y pierde confianza | Media | Medio | Filtrar roles visibles (acción inmediata) |
| Usuario no ve vencimiento de licencia hasta bloqueo | Alta | Alto | V1.1 inbox; hoy: Mi Cuenta + comms email si SMTP |
| Migración Food→ecosistema confunde navegación | Alta | Medio | Onboarding shell 3 pasos (V1.1) |
| Registro legacy activado por env | Baja | Medio | Documentar `VITE_REGISTER_WIZARD_V2=true` obligatorio en prod |
| Gym opera solo por nav sin descubrir D28D | Media | Bajo | Guía operativa; nav gym ya tiene Clases/Vigencias |

---

## 3. Hallazgos por prioridad estratégica

### PRIORIDAD 1 — Eliminar duplicidad (Shell únicamente)

#### Registro

**Estado actual**

| Flujo | Archivo | Cuándo activo |
|-------|---------|---------------|
| **Oficial** | `RegisterCommercialWizard.jsx` | Default (`VITE_REGISTER_WIZARD_V2 !== 'false'`) |
| Legacy | `Register.jsx` | Solo si `VITE_REGISTER_WIZARD_V2=false` |

**Cadena oficial (implementada en wizard):**

```
Servicio → Programa (si D28D) → Plan → Moneda → Datos y pago → Licencia → Acceso
```

**Sub-flujo código:** «Registrarme con código» → `POST /auth/resolve-invite` → Plan → Pago (post-estabilización `cbc4e39`).

**Confusión residual**

- `Register.jsx` sigue importado en `App.jsx` — riesgo operativo si alguien desactiva env.
- Legacy usa labels distintos (`MODULE_LABELS`: «Plan de alimentación» vs `FOOD_PLAN` en wizard).
- Documentación/manuales pueden referir flujo invite-only legacy.

**Acción inmediata (shell, sin código obligatorio en este cierre):**

- Fijar en runbook: **`VITE_REGISTER_WIZARD_V2=true` en staging/prod**.
- Marcar `Register.jsx` como deprecated en comentario/README ops.

**V1.1:** Eliminar rama legacy de `App.jsx` o redirigir legacy → wizard con query `?mode=invite`.

**V2:** Un solo componente registro con modos `direct` | `invite` (ya parcialmente en wizard).

#### Asistentes (usuario FOOD_PLAN)

**Estado actual — evidencia**

| Componente | Ubicación | Usuario |
|------------|-----------|---------|
| `NutritionChat` (FAB) | `Dashboard.jsx` L763–780 | Final con servicio `food-plan` |
| `HelpAssistantWidget` | `Dashboard.jsx` L632 (Progreso) | Final con D28D/Training/platform |
| Asistente / FAQ Food | Dentro de `food_version_final` vía SSO | Usuario en módulo Food embebido |

**Problema:** Usuario con **FOOD + D28D** ve FAB nutricional **y** HelpAssistant en Progreso **y** ayuda nativa al abrir Food — tres capas.

**Principio Food-first:** Para licencia FOOD, la ayuda nutricional es la de Food (SSO embebido). El shell **no debe competir**.

**Acción inmediata (shell, propuesta mínima — V1.1 si no se implementa ya):**

1. Si usuario tiene `food-plan` y **no** tiene D28D ni Training → **no renderizar** `HelpAssistantWidget` en Progreso.
2. Si usuario abre Food vía SSO embebido → FAB `NutritionChat` **oculto** (Food ya tiene chat/FAQ).
3. Reservar `HelpAssistantWidget` para módulos **D28D / Training / plataforma**.

**NO tocar:** `NutritionChat.jsx` lógica interna ni módulo Food.

---

### PRIORIDAD 2 — Experiencia Coach

**Reglas backend (correctas, mantener)**

| Puede | No puede |
|-------|----------|
| Crear `usuario_final`, `nutricionista` | `super_admin`, `admin_*` globales |
| Rutinas, galería, seguimiento, código | Licencias/pagos globales |
| Asignar planes | Crear admins |

**Evidencia:** `serverApp.js` POST `/admin/users` — coach fuerza `trainer_id`, sanitiza `module_access`, `planId: null`.

**Brecha UX:** `AdminUsers.jsx` L416–446 muestra **10 roles** incluyendo Super Admin a **todos** los actores; `isCoachActor` existe (L65–68) pero **no filtra** el grid de roles.

**Acción inmediata:** Filtrar checkboxes visibles cuando `isCoachActor` → solo `usuario_final`, `nutricionista` (y opcionalmente `entrenador` si aplica política).

**V1.1:** Ocultar tabs Gimnasios/Entrenadores para coach; mostrar código invitación en panel coach.

**V2:** Dashboard coach KPI (sin tocar Food).

---

### PRIORIDAD 3 — Experiencia Gym

**Validación funcional (sin nuevas features)**

| Capacidad | Estado | Acceso |
|-----------|--------|--------|
| Usuarios | ✅ | Nav → Usuarios (scope gym) |
| Clases en vivo | ✅ | Nav → Clases en vivo |
| Asistencia | ✅ | Admin live classes → reporte |
| Retos | ⚠️ Usuarios ven en Progreso; gym no crea | Plataforma D28D |
| Seguimiento | ✅ | Nav → Galería / Progreso agregados |
| Marca blanca | ✅ | Nav → Mi marca (`AdminGyms`) |

**Clics innecesarios detectados**

```
Inicio → Tarjeta D28D → Elegir programa → Tarjeta operación → Vista
(4 clics) vs Nav directo → Clases (2 clics)
```

**Duplicidad:** `liveclasses` en `OPERATION_CARDS` y `GYM_CARDS` (`D28DAdminView.jsx` L32–76).

**Acción inmediata:** Documentar para gym admin: **usar barra superior**, no panel D28D anidado, para operación diaria.

**V1.1:** Ocultar tarjeta D28D en Inicio para `admin_gimnasio` si nav ya expone Clases/Usuarios.

**V2:** Dashboard gym único (KPI asistencia + usuarios activos).

---

### PRIORIDAD 4 — Centro de notificaciones (solo análisis)

**¿Existe forma clara para el usuario de ver horarios, vencimientos, mensajes?**

| Canal | Horarios | Vencimientos | Mensajes |
|-------|----------|--------------|----------|
| Mi Cuenta | ❌ | ✅ badges plan/licencia | ⚠️ parcial |
| Email | ✅ si SMTP + templates | ✅ `license.expiring` | ✅ comms |
| WhatsApp | Manual | Manual | ✅ soporte plan |
| In-app inbox | ❌ | ❌ | ❌ |

**Backend existente (no Communication Center, no Food):**

- `NotificationDatabase` + `GET /api/notifications` (`notificationRoutes.js`)
- Communication Center escribe `NotificationDatabase` para eventos in_app
- **Frontend usuario final:** solo `LiveClassesPanel.jsx` consume `/notifications` (hosts D28D, slice 5)

**Conclusión:** **No existe** bandeja clara para usuario final. Datos sí se generan.

**Propuesta V1.1 (NO implementar en este cierre):**

- Icono campana en header shell → `GET /notifications` + badge unread
- Tipos: `live_class_host`, `license.expiring`, `pago_pendiente`, `d28d.class.scheduled`
- Sin modificar Communication Center ni Food

**Propuesta V2:** Preferencias por canal (email / in-app / WhatsApp) en Mi Cuenta.

---

### PRIORIDAD 5 — Retos y adherencia (solo análisis)

**Validación funcional**

| Función | Estado | Evidencia |
|---------|--------|-----------|
| Inscripción | ✅ | `POST /d28d/challenges/:id/enroll` |
| Evidencias texto/imagen/PDF | ✅ | `D28dChallengesPanel.jsx` |
| Ranking / podio | ✅ | API + admin podium |
| Premios | ✅ | Campo `premio` en reto |

**Visibilidad**

- Retos renderizados en **Progreso**, no en nav principal (`Dashboard.jsx` L622–626).
- Ruta alternativa `d28d-challenges` existe pero no está en nav usuario final.
- Usuario Food migrado con D28D puede **no descubrir** retos.

**Propuesta V1.1 (documentar, no implementar):**

- Badge «Retos» en nav si hay reto `active` sin inscripción
- Tarjeta en Inicio bajo servicio D28D

**Propuesta V2:** Push/email al publicar reto (Communication Center ya soporta eventos).

---

### PRIORIDAD 6 — Experiencia multi-servicio (usuario Food migrado)

**Escenario:** Usuario Food activo recibe licencia D28D y/o Training.

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Login único | ✅ | Mismo email/JWT shell |
| Misma contraseña | ✅ | SSO Food usa bridge password / exchange |
| Mis Servicios | ✅ | `GET /accounts/my-services` en `MyAccount.jsx` |
| Licencias | ✅ | `/licenses/me`, badges vigencia |
| Cambio entre módulos | ⚠️ | Inicio → tarjeta → SSO Food externo o panel Training |
| Mi Cuenta | ✅ | Unificado |
| Soporte WhatsApp | ✅ | Por plan en Mi Cuenta |
| Sin reaprender Food | ✅ | `openFoodModule()` → `/food-plan` SSO — **UX Food intacta** |

**Brecha:** Shell añade capa **Inicio / Progreso / Clases** encima de Food. Usuario Food puro que gana D28D debe entender que Clases y Retos viven en shell, nutrición sigue en FOOD_PLAN.

**Acción inmediata:** Guía migración 1 página: «Tu FOOD_PLAN no cambia; D28D se accede desde Inicio».

**V1.1:** Tarjeta «Nuevo: Clases D28D» en Inicio post-asignación licencia.

---

### PRIORIDAD 7 — Auditoría de navegación

#### Usuario final (máx. 6 ítems nav)

| Ítem | Clics típicos a objetivo |
|------|--------------------------|
| Inicio → FOOD SSO | 2 |
| Inicio → Progreso → Retos | 2 |
| Clases | 1 |
| Mi Cuenta | 1 |

**Duplicados:** Progreso mezcla Food charts + D28D + Training + asistente.

#### Coach puro (sin Inicio)

| Ítem | Nota |
|------|------|
| 6 ítems nav, boot a galería/progreso | Curva aprendizaje |

#### Gym (6 ítems + D28D panel opcional)

| Redundancia | Detalle |
|-------------|---------|
| Clases | Nav + panel D28D |
| Usuarios | Nav + Empresas (super_admin) |

#### Super Admin (9 ítems nav)

| Ítem | Redundancia |
|------|-------------|
| Pagos | ↔ Maestros → Config → links pago |
| Vigencias | ↔ CommercialPlans hub |
| Empresas | ↔ Maestros → D28D → Empresas |

**Conteo clics operación frecuente (super admin):**

- Confirmar pago sede: Inicio → Vigencias → Confirmar = **3 clics** ✅ aceptable
- Programar clase D28D: Inicio → Maestros → D28D → Programa → Clases → Admin = **5+ clics** ⚠️

---

## 4. Acciones inmediatas (shell — post-cierre documental)

> Pequeños cambios de configuración/UX permitidos; **no** incluidos en este commit si el cierre es solo audit. Listados como checklist ops/dev **sin tocar Food**.

| # | Acción | Archivo / config | Esfuerzo |
|---|--------|------------------|----------|
| A1 | `VITE_REGISTER_WIZARD_V2=true` en prod | `.env` staging/prod | Ops |
| A2 | Deprecar legacy register en README ops | `docs/MANUALES/` | Doc |
| A3 | Filtrar roles UI coach | `AdminUsers.jsx` | S |
| A4 | Ocultar HelpAssistant si solo FOOD | `Dashboard.jsx` | S |
| A5 | Ocultar NutritionChat si Food embebido activo | `Dashboard.jsx` | S |
| A6 | Runbook migración Food → ecosistema | `docs/MANUALES/` | Doc |

---

## 5. Acciones V1.1 (propuestas — no implementadas)

| # | Propuesta | Impacto |
|---|-----------|---------|
| V1.1-1 | Bandeja notificaciones header (`GET /notifications`) | Retención, vencimientos |
| V1.1-2 | Retos visibles en nav/home | Adherencia D28D |
| V1.1-3 | Eliminar `Register.jsx` de producción | Elimina duplicidad registro |
| V1.1-4 | Código invitación visible panel coach | Escala coach |
| V1.1-5 | Consolidar Pagos+Vigencias super-admin (1 entrada) | Ops |
| V1.1-6 | Onboarding 3 pantallas post-primer login multi-servicio | Migración Food |
| V1.1-7 | Ocultar panel D28D anidado para gym si nav suficiente | −2 clics |

---

## 6. Acciones V2 (propuestas estratégicas)

| # | Propuesta | Notas |
|---|-----------|-------|
| V2-1 | SKU «Ecosistema» registro (sin tocar Food module) | Comercial |
| V2-2 | Dashboard coach / gym KPI | Shell only |
| V2-3 | Preferencias notificación usuario | Shell + comms existente |
| V2-4 | Unificar registro en un componente | Shell refactor menor |

---

## 7. Hallazgos UX

| Hallazgo | Severidad | Perfil |
|----------|-----------|--------|
| Dos asistentes esquina inferior derecha | ALTO | Usuario Food+ |
| Progreso sobrecargado multi-licencia | MEDIO | Usuario triple |
| Coach sin Inicio | MEDIO | Coach |
| Super-admin nav denso | MEDIO | Super admin |
| Retos enterrados en Progreso | MEDIO | Usuario D28D |
| `window.prompt` extender vigencia | BAJO | Admin |

---

## 8. Hallazgos comerciales

| Hallazgo | Severidad |
|----------|-----------|
| Registro mono-servicio vs promesa ecosistema | CRÍTICO |
| Renovación por `module_code` en Mi Cuenta | MEDIO |
| Plan pareja: código en sede (fricción) | MEDIO |
| FOOD_PLAN checkout maduro vía Food/Wompi — **referencia a emular** en shell D28D/Training | Oportunidad |

---

## 9. Hallazgos operativos

| Hallazgo | Severidad |
|----------|-----------|
| Env prod SMTP/Zoom/Wompi manual | ALTO (staging) |
| Notificaciones generadas pero no visibles usuario | ALTO |
| Communication Center OK; delivery email skip en tests | MEDIO |
| E2E 81/81 local — gate pre-piloto | ✅ |
| FOOD congelado reduce riesgo regresión | ✅ |

---

## 10. Recomendación final

### Alineación con FOOD_PLAN

El ecosistema **respeta** el módulo Food: SSO embebido, misma contraseña, UX Food intacta al abrir módulo. Las brechas están en el **Shell** (duplicidad registro/asistentes, notificaciones, navegación admin) — corregibles **sin tocar Food**.

### Prioridad de cierre post-audit

1. **A3–A5** (shell UX mínimo) — máximo impacto / mínimo riesgo  
2. **A1–A2** (ops registro único)  
3. **V1.1-1, V1.1-3** (notificaciones + registro)  
4. Comercial bundle (V2-1) solo si marketing lo exige  

---

## DECISIÓN FINAL — Clasificación piloto

| Escenario | Clasificación | Condiciones |
|-----------|---------------|-------------|
| **Piloto 5 usuarios** | **READY** | Env staging; soporte WhatsApp; wizard oficial; Food vía SSO sin cambios |
| **Piloto 20 usuarios** | **WARNING** | + A3–A5 shell; SMTP real; monitoreo notificaciones manual |
| **Piloto 35 usuarios Food migrados** | **WARNING** | + guía migración; onboarding V1.1 recomendado; no forzar Progreso shell para nutrición (usar Food) |
| **Producción controlada** | **WARNING** | + V1.1 inbox; Zoom/Wompi prod; revisar bundle comercial |

### Blockers absolutos (ninguno de código Food)

1. Desactivar wizard comercial en prod (`VITE_REGISTER_WIZARD_V2=false`)  
2. Lanzar migración Food masiva sin guía ni SSO verificado  
3. Prometer notificaciones in-app sin V1.1 (hoy no visibles)  

---

## Anexo — Mapa de ownership (qué módulo resuelve qué)

| Necesidad | FOOD_PLAN (congelado) | Shell D28D | Shell Training |
|-----------|----------------------|------------|----------------|
| Nutrición / chat / FAQ food | ✅ Nativo | No competir | — |
| Clases Zoom | — | ✅ | — |
| Rutinas coach | — | D28D routines | ✅ |
| Licencias / pagos | Via provisioning | ✅ Cuentas | ✅ Cuentas |
| Retos | — | ✅ | — |
| Notificaciones usuario | Solo trainer en Food app | V1.1 shell | Coach notif API |

---

*Auditoría de cierre pre-piloto. Sin implementación. FOOD_PLAN congelado. Evidencia: codebase `09f38cd`, E2E 81/81 (`docs/PRE_PILOT_OFFICIAL.md`).*
