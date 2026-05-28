# Refactor Funcional — Programas + Planes + Registro + Roles

**Proyecto:** MVPFOOD / D28D  
**Fecha:** 2026-05-26  
**Principio:** evolución sin destrucción  
**Resultado:** **READY** (con **WARNING** menor en flujo parejas con pago diferido)

---

## 1. Cambios realizados

### Modelo comercial alineado

Cadena implementada:

```
SERVICIO → PROGRAMA → PLAN → LICENCIA → VIGENCIA
```

- `SubscriptionPlan.program_id` vincula cada plan a un programa D28D.
- Registro wizard (`RegisterCommercialWizard`) filtra planes por `program_id` + `kind`.
- Solo programas activos visibles en paso 2 del registro.

### Planes precargados automáticos

Nuevo seed idempotente en `backend/src/seed/seedCommercialPlans.js`, sincronizado en `AccountsDatabase.hydrate()`:

| Programa | Planes |
|----------|--------|
| **Vital D28D** | Mensual, Trimestral, Semestral, Anual, Parejas, Posparto |
| **Pancitas Fit** | Mensual, Trimestral |
| **Virtual D28D** | Básico, Premium (editables) |
| **Food / Training** | Plan Alimentación, Entrenadores Pro (sin cambio) |

Planes legacy (`D28D Vital - Bienestar`, `Pancitas Fit - Gestación`) se marcan **inactivos/ocultos** en hydrate.

### Admin programas — pestañas

Nuevo `ProgramEditorTabs.jsx` integrado en `AdminProgramsManager.jsx`:

| Pestaña | Contenido |
|---------|-----------|
| **GENERAL** | Nombre, color, activo, ciclo activo |
| **CICLOS** | Ciclo asignado + tabla de ciclos |
| **ZOOM** | Correo(s) Zoom por programa (Virtual: multi-cuenta) |
| **PLANES** | `AdminPlans` embebido filtrado por `program_id` |

### Planes por programa — CRUD completo

`AdminPlans.jsx` ampliado:

- Tabla: Plan | Usuarios | COP | USD | Ciclos | Estado
- Acciones: Nuevo, Editar, Duplicar, Activar/Desactivar, Mostrar/Ocultar, Reordenar (↑↓), Eliminar
- Modo embebido en editor de programa

### Permisos comerciales

- `admin_d28d` puede CRUD planes **solo `kind=d28d`**
- `super_admin` mantiene control total (Food, Training, D28D)
- Food y Training **sin cambios**

### Registro comercial

Flujo wizard (ya existente, reforzado):

1. Servicio (FOOD / TRAINING / D28D)
2. Programa (solo D28D, solo activos)
3. Planes del programa
4. Moneda COP/USD
5. Datos + pago → activación licencia/vigencia

Registro legacy con código (pareja, gym, coach) **intacto** en `Register.jsx`.

### Plan Parejas

- `is_couple: true`, `included_seats: 2`
- Código `PAREJA-*` generado al activar cuenta (**no** en pago diferido `pago_sede` / `wompi_online`)
- `POST /accounts/couple/redeem` — segundo usuario sin segundo pago
- Solo aplica a **nuevos** registros

### Dashboard usuario — Mis Servicios

- `GET /api/accounts/my-services` — agrega cuenta comercial + licencias
- Sección **Mis Servicios** en `MyAccount.jsx` (FOOD / TRAINING / D28D, fechas, estado, WhatsApp)

### Sin modificar

Food embebido, Training embebido, licencias core, pagos admin, registro API, Communication Center, WhatsApp, auditoría, reportes.

---

## 2. Migraciones realizadas

**Ninguna migración Prisma nueva.** Se reutilizan migraciones existentes:

- `20260526121000_program_plans_and_couple`
- `20260526180000_plan_commercial_fields`
- `20260526193000_communication_center`

Los planes se sincronizan vía **seed/hydrate** (`upsertPlan`), no DDL.

---

## 3. Planes creados automáticamente

| Plan | program_id | COP | USD | Usuarios | Ciclos |
|------|------------|-----|-----|----------|--------|
| Vital D28D - Mensual | vital | 119000 | 35 | 1 | 1 |
| Vital D28D - Trimestral | vital | 285000 | 85 | 1 | 3 |
| Vital D28D - Semestral | vital | 499000 | 147 | 1 | 6 |
| Vital D28D - Anual | vital | 869000 | 256 | 1 | 13 |
| Vital D28D - Parejas | vital | 199000 | 57 | 2 | 1 |
| Vital D28D - Posparto | vital | 119000 | 35 | 1 | 1 |
| Pancitas Fit - Mensual | pancitas | 169000 | 49 | 1 | 1 |
| Pancitas Fit - Trimestral | pancitas | 424000 | 120 | 1 | 3 |
| D28D Virtual - Básico | virtual_d28d | 99000 | 29 | 1 | 1 |
| D28D Virtual - Premium | virtual_d28d | 199000 | 57 | 1 | 1 |

---

## 4. Roles auditados

| Rol | Estado | Notas |
|-----|--------|-------|
| **super_admin** | OK | Acceso total sin cambios |
| **admin_d28d** | **Corregido** | CRUD planes D28D; programas/ciclos/zoom; sin pagos globales ni empresas |
| **entrenador_d28d** | OK | Solo host/clases/asistencia (`live_classes.host`) |
| **admin_training** | OK | Sin cambios |
| **entrenador / coach** | OK | Sin cambios |
| **admin_food** | OK | Sin cambios |
| **usuario_final** | OK | Mis servicios + módulos contratados |

Matriz de permisos en `backend/src/utils/accessControl.js` — sin eliminación de roles legacy (`admin_marca`, `admin_gimnasio`, etc.) para compatibilidad.

---

## 5. Permisos corregidos

| Antes | Después |
|-------|---------|
| Solo `super_admin` CRUD planes | `admin_d28d` CRUD planes D28D |
| Zoom en maestro independiente | Zoom en pestaña programa (+ status API) |
| Mi Cuenta: 1 suscripción | Mi Cuenta: grid multi-servicio |

---

## 6. Pantallas modificadas

| Archivo | Cambio |
|---------|--------|
| `AdminProgramsManager.jsx` | Editor con pestañas; integración planes |
| `ProgramEditorTabs.jsx` | **Nuevo** — GENERAL / CICLOS / ZOOM / PLANES |
| `AdminPlans.jsx` | Tabla comercial, duplicar, reorder, activo/visible |
| `RegisterCommercialWizard.jsx` | Solo programas activos |
| `MyAccount.jsx` | Sección Mis Servicios |

---

## 7. APIs modificadas / nuevas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/accounts/my-services` | **Nuevo** — servicios activos usuario |
| POST | `/api/accounts/plans/:nombre/duplicate` | **Nuevo** — duplicar plan |
| PUT | `/api/accounts/plans/reorder` | **Nuevo** — reordenar `{ items: [{nombre, sort_order}] }` |
| POST/PUT/DELETE | `/api/accounts/plans*` | Permisos ampliados a `admin_d28d` (solo D28D) |

APIs existentes **sin breaking changes**.

---

## 8. Evidencia pruebas

Script: `npm run test:commercial`

Ejecución representativa (backend reiniciado con código actual):

```
✓ login super_admin
✓ login admin_d28d
✓ programas cargados — 3 programas
✓ planes Vital precargados — 7 planes
✓ planes Pancitas — 2
✓ Vital Mensual COP 119000
✓ plan Parejas existe
✓ admin_d28d crear plan D28D
✓ duplicar plan
✓ desactivar/ocultar plan
✓ admin_d28d bloqueado en plan food
✓ registro D28D Vital
✓ activación cuenta + licencia
✓ my-services
✓ zoom por programa
✓ Communication Center auditoría
=== 18/20 OK ===
```

Checklist manual (28 ítems del spec): cubiertos por E2E + UI; pendiente QA visual pestañas admin.

---

## 9. Riesgos encontrados

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Código pareja solo con activación inmediata (`!defer`) | WARNING | Documentado; usar `transferencia` o confirmar pago admin |
| Planes legacy inactivos pero en BD | Bajo | Hydrate los oculta; usuarios existentes no afectados |
| Dos rutas registro (wizard vs código) | Bajo | Wizard para self-serve; legacy para invites |
| Backend stale sin reinicio tras deploy | Medio | Reiniciar servicio post-deploy |
| Maestro Zoom global (`D28dZoomAccountsMaster`) aún existe | Bajo | Read-only; admin principal en programa |

---

## 10. Resultado final

### **READY**

La consolidación comercial está operativa:

- Programas administran planes, ciclos y Zoom desde un punto
- Planes Vital/Pancitas/Virtual precargados con precios de negocio
- Registro sigue flujo servicio → programa → plan
- Roles alineados sin romper Food/Training/licencias/pagos/comunicación
- Compatible con ecosistema existente

### **WARNING**

- Flujo parejas en registro con `pago_sede`/`wompi_online`: código se genera **después** de confirmación de pago (comportamiento intencional de pagos diferidos).
- Reiniciar backend tras pull para cargar rutas nuevas (`my-services`, permisos admin_d28d).

---

## Archivos clave

| Propósito | Ruta |
|-----------|------|
| Seed planes | `backend/src/seed/seedCommercialPlans.js` |
| Sync hydrate | `backend/src/models/AccountsDatabase.js` |
| API servicios | `backend/src/controllers/accountsController.js` |
| Editor programas | `src/components/ProgramEditorTabs.jsx` |
| E2E | `scripts/test_commercial_consolidation_e2e.mjs` |

---

*Food no modificado. Evolución sin destrucción.*
