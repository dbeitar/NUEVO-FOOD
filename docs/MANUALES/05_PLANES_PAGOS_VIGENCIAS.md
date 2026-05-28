# Manual 05 — Planes, pagos y vigencias

**Oferta comercial, registro, pareja, Wompi y licencias por módulo**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

Capa comercial del ecosistema:

- Catálogo de planes por servicio (D28D por programa, Food, Training).
- Precios COP y USD, ciclos D28D, plan pareja.
- Invites por programa (`program_invite_codes`).
- Activación de cuenta, pagos y vigencias.
- Sincronización con `module_licenses`.

---

## 2. Cómo acceder

**Super admin:** Maestros → **Planes y licencias**

Pestañas del hub:

| Pestaña | Contenido |
|---------|-----------|
| Planes D28D | Todos los programas (Vital, Pancitas, Virtual, custom) |
| Plan Alimentación | Plan comercial Food |
| Plan Entrenadores | Plan comercial Training |
| Códigos por programa | Invites específicos por `program_id` |

**Por programa D28D:** Maestros → D28D → Programas → Editar → pestaña **Planes**.

---

## 3. Campos de un plan comercial

| Campo | Descripción |
|-------|-------------|
| `nombre` | Identificador único (FK en cuentas) |
| `kind` | `d28d` \| `food` \| `training` |
| `program_id` | Programa D28D o `food` / `training` |
| `precio_mensual` / `precio_mensual_usd` | COP y USD |
| `cycle_ids` | Ciclos D28D incluidos |
| `is_couple` / `included_seats` | Plan pareja |
| `module_access` | Módulos que activa |
| `activo` / `visible` / `sort_order` | Catálogo público |
| `max_users` | Capacidad (**0 = ilimitado**) |
| Soporte WhatsApp | Por plan (opcional) |

---

## 4. Flujo de compra

```
Usuario elige plan → Método de pago → Estado → Admin confirma (si aplica) → Licencia vigente
```

| Método | Estado inicial |
|--------|----------------|
| **Pago en sede** | `pendiente_sede` |
| **Wompi online** | `pendiente_pago_online` + URL checkout |
| **Transferencia / activo** | Cuenta activa (según config) |

**Confirmación:** Configuraciones → **Vigencias** → Confirmar pago.

Eventos: `payment.approved`, `payment.rejected`.

---

## 5. Plan pareja

1. Titular compra plan con `is_couple=true`.
2. Sistema genera `couple_invite_code` (ej. `PAREJA-…`).
3. Pareja se registra con cuenta propia.
4. **Redimir código pareja** (`POST /api/accounts/couple/redeem`) → misma vigencia, cuenta vinculada.

> El código de pareja se genera con activación inmediata; con `pago_sede`/`wompi` pendiente puede requerir confirmación previa.

---

## 6. Registro comercial (wizard)

Frontend: `RegisterCommercialWizard.jsx`

| Paso | D28D | Food / Training |
|------|------|-----------------|
| 1 Servicio | ✓ | ✓ |
| 2 Programa | ✓ | (salta) |
| 3 Plan | ✓ | ✓ |
| 4 Moneda | ✓ | ✓ |
| 5 Datos + pago | ✓ | ✓ |

Tras `POST /auth/register` + login → `POST /api/accounts`.

---

## 7. Mi cuenta (usuario)

- Plan activo, vencimiento, servicios (`GET /api/accounts/my-services`).
- Upsell de módulos no contratados.
- Botón **Contactar soporte** (WhatsApp del plan).
- Redimir código pareja.

---

## 8. Licencias técnicas

Tabla `module_licenses`: `user_id`, `module_code`, `active`, `valid_until`, `source`.

Códigos: `food`, `training`, `d28d`, `gym`, `live_classes`.

Dual-read: JWT incluye `module_access` legacy + filas de licencia.

---

## 9. APIs principales

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/accounts/plans` | Catálogo (`?visible=true`, `kind`, `program_id`) |
| POST | `/api/accounts` | Activar plan |
| GET | `/api/accounts/me` | Cuenta del usuario |
| GET | `/api/accounts/my-services` | Servicios para Inicio |
| POST | `/api/accounts/couple/redeem` | Pareja |
| GET | `/api/payment-links/public` | Enlaces Wompi públicos |

---

## 10. Pruebas

```bash
npm run test:commercial   # 20 checks registro + pareja + planes
npm run test:comm         # payment.approved / rejected
```

Detalle técnico: [REFACTOR_CONSOLIDACION_COMERCIAL.md](../REFACTOR_CONSOLIDACION_COMERCIAL.md)

---

[← Training](./04_MODULO_TRAINING.md) · [Índice](./README.md) · [Comunicación →](./06_COMUNICACION_Y_WHATSAPP.md)
