# MVPFOOD / D28D — Auditoría semántica, comercial y UX (pre‑producción)

**Fecha:** 2026-05-27  
**Alcance:** Shell (frontend `src/` + backend `backend/src/`).  
**Reglas respetadas:** sin cambios de lógica de negocio, sin cambios de APIs, sin tocar `modules/food_version_final/`.

---

## 1) Hallazgos principales

### 1.1 Nomenclatura “Food Plan / Plan de Alimentación / Alimentación” inconsistente

Se encontraron múltiples variantes visibles al usuario en:

- Tarjetas de Inicio/Servicios y Maestros.
- Registro comercial.
- Paneles admin.
- Mensajes de error/SSO.
- Configuración default del frontend (backend).
- Links de pago/labels (backend).
- Texto legal (Términos).

**Corrección obligatoria aplicada:** unificar a **`FOOD_PLAN`** (exacto) en el shell.

### 1.2 Textos técnicos visibles (dev/seed/legacy)

Se encontraron referencias técnicas en UI (ej. “seed”, “legacy”, variables `VITE_*`) que podían aparecer en pantallas admin.

**Corrección aplicada:** eliminar o neutralizar textos técnicos donde eran visibles.

---

## 2) Cambios aplicados (antes → después)

> Nota: las rutas bajo `src/_archive/**` son material archivado y no forman parte del flujo productivo. Se evitó modificarlas para no introducir ruido.

### FOOD_PLAN (shell)

| Pantalla / área | Archivo | Antes | Después | Riesgo |
|---|---|---|---|---|
| Inicio (tarjeta servicio) | `src/components/dashboard/userServices.js` | “Plan de Alimentación” | `FOOD_PLAN` | Bajo |
| Maestros (tarjeta) | `src/components/dashboard/MastersHub.jsx` | “Plan de Alimentación” | `FOOD_PLAN` | Bajo |
| Planes comerciales (tab + título) | `src/components/dashboard/CommercialPlansHub.jsx` | “Plan Alimentación” / “Plan comercial — Alimentación” | `FOOD_PLAN` / “Plan comercial — FOOD_PLAN” | Bajo |
| Apariencia (IDs de servicio/panel) | `src/components/AdminFrontendAppearance.jsx` | “Plan de Alimentación”, “Maestro Alimentación”, “Panel Alimentación” | `FOOD_PLAN`, “Maestro FOOD_PLAN”, “Panel FOOD_PLAN” | Bajo |
| Registro comercial (servicio) | `src/components/RegisterCommercialWizard.jsx` | “Plan de Alimentación” | `FOOD_PLAN` | Medio (impacta UX de registro) |
| Panel FOOD_PLAN (vista externa) | `src/components/dashboard/FoodPlanAdminView.jsx` | “Plan de Alimentación (Food Plan)” / botón “Abrir Food Plan” / texto legacy | `FOOD_PLAN` / “Abrir FOOD_PLAN” / texto técnico removido | Bajo |
| Shell SSO embebido | `src/food-plan/FoodPlanShell.jsx` | Mensajes con “Food Plan” | Mensajes con `FOOD_PLAN` | Bajo |
| Abrir módulo (alertas) | `src/utils/foodModule.js` | “No se pudo abrir Food Plan” | “No se pudo abrir FOOD_PLAN” | Bajo |
| Seguimiento coach (Food) | `src/components/coach/CoachEcosystemTracking.jsx` | “Seguimiento Food”, “Food Plan”, “módulo food” | `FOOD_PLAN` (visible) | Bajo |
| Training view (referencia cruzada) | `src/components/dashboard/TrainersAdminView.jsx` | “igual que Food Plan” + texto legacy | “igual que FOOD_PLAN” + texto técnico removido | Bajo |
| Texto legal (términos) | `src/i18n/legalContent.js` | “Plan de Alimentación” | `FOOD_PLAN` | Medio (texto legal visible) |

### Backend (labels/errores/config por defecto)

| Área | Archivo | Antes | Después | Riesgo |
|---|---|---|---|---|
| Default panels (hero) | `backend/src/config/defaultFrontendPanels.js` | “Plan de Alimentación” | `FOOD_PLAN` | Bajo |
| Default frontend config (services/masters) | `backend/src/config/defaultFrontendConfig.js` | “Plan de Alimentación” | `FOOD_PLAN` | Bajo |
| Links de pago (label) | `backend/src/controllers/paymentLinkController.js` | “Pago Plan Alimentación” | “Pago FOOD_PLAN” | Bajo |
| Notificaciones de pago (label módulo) | `backend/src/services/paymentNotifyService.js` | “Food Plan” | `FOOD_PLAN` | Bajo |
| Seed planes comerciales | `backend/src/seed/seedCommercialPlans.js` | “Plan Alimentación” | `FOOD_PLAN` | Medio (impacta nombres mostrados) |
| Food module gateway | `backend/src/routes/foodModuleRoutes.js` | “No se pudo abrir Food Plan” | “No se pudo abrir FOOD_PLAN” | Bajo |
| Provisionamiento (mensaje) | `backend/src/services/foodProvisioningService.js` | “No se pudo iniciar sesión en Food Plan…” | “No se pudo iniciar sesión en FOOD_PLAN…” | Bajo |
| Restricción plan único | `backend/src/controllers/accountsController.js` | “plan comercial de Alimentación” | “plan comercial de FOOD_PLAN” | Bajo |

### Monedas (COP / USD)

| Pantalla | Archivo | Antes | Después | Riesgo |
|---|---|---|---|---|
| Crear/editar plan (labels) | `src/components/AdminPlans.jsx` | “Precio Mensual (COP)” / “Precio Mensual (USD)” | “Precio COP” / “Precio USD” | Bajo |

### Textos técnicos visibles (dev/seed/legacy)

| Pantalla | Archivo | Antes | Después | Riesgo |
|---|---|---|---|---|
| Login (hints) | `src/components/ModernLogin.jsx` | “Desarrollo — acceso rápido”, “npm run seed:dev”, “Contraseña piloto” | “Acceso rápido”, “Contraseña de demostración…” | Bajo |
| Invites programa (tabla vacía) | `src/components/AdminProgramInvites.jsx` | “ejecuta hydrate para seeds” | “Crea uno para este programa.” | Bajo |

---

## 3) Evidencia (archivos generados y búsqueda)

- Se validó con búsqueda que **no** quedan referencias activas a:
  - `Plan de Alimentación`, `Plan Alimentación`, `Food Plan`, `FoodPlan`, `Plan Nutricional`
  - (excepto comentarios y archivos archivados en `src/_archive/**`).

---

## 4) Resultado final (READY / WARNING / BLOCKER)

**Resultado:** **WARNING**

**Razón:** el cambio a `FOOD_PLAN` es deliberadamente fuerte y puede requerir ajuste de branding (si el nombre comercial final no va en mayúsculas). Funcionalmente no afecta APIs/lógica, pero es un cambio visible en UX que debe aprobarse antes de piloto.

**Para quedar READY:**

- Confirmar si el nombre comercial final debe ser exactamente `FOOD_PLAN` o un nombre humano (ej. “Food Plan”) antes de piloto.

