# FOOD_MIGRATION_RUNBOOK — Usuarios FOOD_PLAN → Ecosistema D28D

**Versión shell:** `main` (post A1–A3)  
**Regla:** FOOD_PLAN y `food_version_final` **no cambian**. Este runbook es solo para usuarios que ya tienen cuenta Food y reciben acceso D28D/TRAINING en el shell.

---

## 1. Qué NO cambia para el usuario Food

| Elemento | Estado |
|----------|--------|
| Email de acceso | **El mismo** |
| Contraseña | **La misma** (login único shell ↔ Food vía SSO) |
| App / UX FOOD_PLAN | **Intacta** — se abre desde tarjeta FOOD_PLAN o enlace habitual |
| Datos nutricionales en Food | **Sin migración** — permanecen en Food |
| URL Food producción | La configurada (`FOOD_MODULE_URL` / foodplan.tech) |

---

## 2. Login

1. Ir a la URL del ecosistema D28D (shell), ej. `https://tu-dominio.com`
2. **Iniciar sesión** con el **mismo email y contraseña** que usa hoy en FOOD_PLAN
3. Si aparece error de contraseña: usar **Recuperar contraseña** (mismo email) o contactar soporte

**Nota técnica:** El shell valida credenciales en su base de usuarios. La provisión Food ya vinculó el email; no hace falta crear cuenta nueva.

---

## 3. Contraseña actual

- La contraseña **no se resetea** al añadir licencia D28D o Training
- Si el usuario solo conocía login Food directo: probar la **misma contraseña** en el shell
- Contraseña puente interna (SSO) la gestiona el servidor — **el usuario no la ve**

---

## 4. Acceso FOOD_PLAN (sin cambios)

1. Tras login en shell → **Inicio**
2. Tarjeta **FOOD_PLAN** → abre módulo Food (SSO embebido o pestaña según configuración)
3. Experiencia dentro de Food: **igual que antes** (plan, registro, chat/FAQ de Food)

**Ajuste shell (piloto):** Si el usuario tiene **solo** FOOD_PLAN, el shell **no muestra** el asistente duplicado — la ayuda nutricional es la de Food.

---

## 5. Acceso D28D (nuevo, si tiene licencia)

1. Inicio → tarjeta **D28D**
2. **Clases en vivo:** menú **Clases** → calendario semanal
3. **Progreso / retos:** menú **Progreso** (retos D28D, semáforo)
4. Programa asignado: visible en **Mi Cuenta** → Mis servicios / vigencia

---

## 6. Acceso TRAINING (nuevo, si tiene licencia)

1. Inicio → tarjeta **Entrenadores** o menú **Entrenamiento**
2. Rutinas y seguimiento según rol (usuario final vs coach)

---

## 7. Mi Cuenta

Ruta: menú **Mi Cuenta**

| Sección | Uso |
|---------|-----|
| Plan / vigencia | Estado de suscripción por módulo |
| Mis servicios | D28D, FOOD_PLAN, Training activos |
| Perfil | Teléfono, objetivo, etc. |
| WhatsApp soporte | Según plan (enlace del plan comercial) |
| Renovar / pagar | Wompi o pago en sede |

---

## 8. Soporte

| Canal | Cuándo |
|-------|--------|
| WhatsApp del plan | Dudas de pago, vigencia, acceso (Mi Cuenta) |
| Asistente Food | **Dentro del módulo FOOD_PLAN** — nutrición |
| Asistente shell | Solo si tiene D28D/Training (no solo Food) |
| Admin / coach | Código de invitación o alta por entrenador |

---

## 9. Recuperación de contraseña

1. Pantalla login → **Olvidé mi contraseña** (si está habilitado en shell)
2. O solicitar reset al administrador / soporte WhatsApp
3. Tras cambio de contraseña en shell: usar la **nueva** también para entrar a Food (SSO reprovisiona puente)

---

## 10. Flujo recomendado — migración 35 usuarios Food

### Antes del día piloto (ops)

- [ ] Verificar email en shell = email Food
- [ ] Verificar licencia `food` / `food_plan` activa (`module_licenses`)
- [ ] Asignar licencias D28D/Training si aplica (sin tocar DB Food)
- [ ] `VITE_REGISTER_WIZARD_V2=true` en frontend prod
- [ ] `FOOD_MODULE_URL` + `FOOD_SHELL_API_KEY` en backend prod

### Comunicación al usuario (plantilla)

> Hola [nombre],  
> Tu cuenta FOOD_PLAN sigue igual. Entra en [URL shell] con el **mismo email y contraseña**.  
> Desde **Inicio** abre **FOOD_PLAN** como siempre.  
> Si tienes D28D nuevo: usa **Clases** y **Progreso**.  
> Soporte: [WhatsApp plan].

### Día 1

1. Login shell
2. Abrir FOOD_PLAN → confirmar plan visible
3. (Si D28D) Abrir Clases
4. Mi Cuenta → confirmar vigencia

---

## 11. Errores frecuentes

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| «Email ya registrado» en registro | Ya existe en shell | **Login**, no registrarse de nuevo |
| 502/503 al abrir Food | `FOOD_MODULE_URL` caído | Ops — no tocar Food code |
| No ve tarjeta D28D | Sin licencia D28D | Admin asigna licencia |
| Dos asistentes | Corregido en shell A3 | Actualizar frontend shell |

---

## 12. Evidencia técnica (solo lectura)

- Auditoría usuarios Food local: `docs/FOOD_USER_AUDIT_EVIDENCE.json` (generar con `node scripts/audit_food_users_readonly.mjs`)
- Registro único: `docs/REGISTER_OFFICIAL_EVIDENCE.md`
- E2E: `docs/PRE_PILOT_OFFICIAL.md` (81/81)

---

*Runbook operativo. Sin cambios en food_version_final.*
