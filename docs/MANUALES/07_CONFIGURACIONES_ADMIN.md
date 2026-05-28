# Manual 07 — Configuraciones y administración

**Apariencia, FAQ Center, auditoría, vigencias y pagos globales**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

Hub **Configuraciones** (principalmente `super_admin`) centraliza ajustes transversales que no pertenecen a un solo módulo operativo.

**Ruta:** Maestros → **Configuraciones**

---

## 2. Tarjetas del hub

| Tarjeta | Función | Roles |
|---------|---------|-------|
| **Comunicación** | Ver manual [06](./06_COMUNICACION_Y_WHATSAPP.md) | super_admin |
| **FAQ Center** | Preguntas frecuentes por módulo | super_admin, admin_d28d, admin_training, admin_entrenador |
| **Enlaces y métodos de pago** | Wompi y pago en sede por módulo | super_admin |
| **Apariencia** | Maestro visual del frontend | super_admin |
| **Auditoría** | Log de acciones del sistema | super_admin |
| **Vigencias** | Confirmar pagos, extender licencias | Varios admin (ver abajo) |

---

## 3. Apariencia (Maestro visual)

**Ruta:** Configuraciones → Apariencia

| Pestaña | Qué edita |
|---------|-----------|
| Tema | Oscuro / claro, color acento |
| Marca | Nombre, logo, eslogan |
| Login | Textos hero de registro/login |
| Servicios | Tarjetas del Inicio |
| Maestros | Textos hub Maestros |
| Programas | Vital, Pancitas, Virtual |
| Paneles admin | Título, descripción e imagen de **cada tarjeta** por módulo |

> Si una tarjeta del panel D28D aparece sin texto, verificar claves en paneles admin o i18n (`panel.d28d.cards.*`). Defaults en `backend/src/config/defaultFrontendPanels.js`.

---

## 4. FAQ Center

**Ruta:** Configuraciones → FAQ Center

| Módulo FAQ | Uso |
|------------|-----|
| `d28d` | Preguntas programa / clases / retos |
| `training` | Rutinas, galería, cumplimiento |
| `platform` | Cuenta, pagos, acceso |

Operaciones: crear categoría, ítems con tags, contador “útil”.

**API:** `/api/faq/:modulo/*`

Alimenta el **Asistente contextual** (widget flotante).

---

## 5. Enlaces de pago

**Ruta:** Configuraciones → Enlaces y métodos de pago

Por módulo (`food`, `training`, `d28d`, `gym`):

- URL Wompi.
- Etiquetas pago online / pago en sede.
- Activar/desactivar métodos.

Público: `GET /api/payment-links/public` (registro wizard).

---

## 6. Vigencias

**Ruta:** Configuraciones → Vigencias

| Acción | Efecto |
|--------|--------|
| Ver pendientes | Pagos sede / Wompi sin confirmar |
| Confirmar pago | Activa cuenta + licencias + notificación |
| Rechazar | Estado rechazado + evento comm |
| Extender días | Nueva `fecha_vencimiento` |
| Por vencer | Cuentas en próximos 30 días |

Roles típicos: `super_admin`, `admin_d28d`, `admin_gimnasio`, `admin_marca`, coaches según config.

---

## 7. Auditoría

### Auditoría sistema

**Ruta:** Configuraciones → Auditoría

Logins, cambios admin, acciones sensibles (`audit_logs`).

### Auditoría plataforma UX

Eventos retos, FAQ, asistente: `GET /api/platform/audit`  
Tabla: `platform_audit_events`

### Auditoría comunicación

Dentro de Comunicación → pestaña Auditoría.

---

## 8. Usuarios y empresas (transversal)

Aunque viven en paneles de módulo, **Usuarios** y **Empresas** son transversales:

| Vista | Acceso |
|-------|--------|
| Admin Usuarios | Nav bar o panel D28D / Food / Training |
| Admin Empresas | Panel D28D (convenios) |
| Admin Gimnasios | D28D o nav super_admin |

---

## 9. Super admin — checklist diario

1. Revisar **Vigencias** → pagos pendientes.
2. Revisar **Comunicación → Eventos** → errores email.
3. Revisar clases del día (D28D).
4. Backup BD si producción (ver manual 09).

---

[← Comunicación](./06_COMUNICACION_Y_WHATSAPP.md) · [Índice](./README.md) · [Usuario final →](./08_USUARIO_FINAL.md)
