# Pagos y vigencias (shell + módulos)

## Patrón Food Plan (solo lectura en `food_version_final`)

- **Suscripción:** tabla `subscriptions` con `endDate`, estados `ACTIVE` / `EXPIRED`; login bloquea si venció.
- **Renovación:** usuario en `/plan-vencido` → `POST /auth/request-renewal` → email al super admin.
- **Admin:** `PUT /subscriptions/user/:id/extend` y `cancel` (roles `SUPER_ADMIN`, `ADMIN`).
- **Coach:** plantillas de notificación de adherencia (`/trainer/notification-templates`), no de cobro.

## Shell D28D (implementado)

### Dos métodos de pago

| ID | UX |
|----|-----|
| `wompi_online` | Abre checkout (URL configurable, default Wompi test) |
| `pago_sede` | Estado pendiente + notificación a coach/admin |

Configuración: **Pagos** (super_admin) → `/api/payment-links/admin` por módulo (`food`, `training`, `d28d`, `gym`).

### Vigencias y notificaciones

- **Panel:** navegación **Vigencias** → `AdminModuleVigencias`
- **API:** `GET /api/payment-admin/overview`, `POST .../confirm/:accountId`, `POST .../extend/:userId`
- **Licencias:** `module_licenses.valid_until` sincronizado al confirmar/extender
- **Notificaciones:** `NotificationDatabase` tipo `pago_pendiente` / `pago_confirmado`

## Módulo Training (`training_version_final`)

- Tablas `subscriptions` + `payment_notifications`
- Coach: **Vigencias** en `/coach/vigencias` → API `/api/v1/subscriptions/overview`

Food Plan embebido sigue usando su propia API de suscripciones; el shell unifica cobro de planes gym/D28D y licencias `module_access`.
