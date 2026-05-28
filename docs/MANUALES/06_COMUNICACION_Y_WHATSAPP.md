# Manual 06 — Comunicación y WhatsApp

**Centro de comunicaciones, plantillas, eventos y soporte wa.me**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

Unifica mensajes automáticos y soporte:

- Plantillas por evento y canal (in_app, email, enlace WhatsApp).
- Log de todo lo enviado o intentado.
- WhatsApp por plan comercial.
- Scheduler diario para jobs de comunicación.

---

## 2. Cómo acceder

**Super admin:** Maestros → Configuraciones → **Comunicación**

| Pestaña | Función |
|---------|---------|
| **Plantillas** | CRUD mensajes por `evento` + `modulo` + `canal` |
| **Eventos** | Log filtrable (fecha, usuario, módulo) |
| **WhatsApp** | Número y mensaje por plan; probar enlace |
| **Auditoría** | Historial emails, errores, clics |

---

## 3. Eventos automáticos

| Evento | Cuándo |
|--------|--------|
| `user.registered` | Tras registro exitoso |
| `payment.approved` | Admin confirma pago |
| `payment.rejected` | Pago rechazado |
| `d28d.class.scheduled` | Nueva clase programada |
| `d28d.class.time_changed` | Cambio de horario |
| `support.whatsapp.click` | Usuario pulsa Contactar soporte |
| `d28d.challenge.*` | Retos (activar, podio, etc.) |
| `training.traffic_light.*` | Semáforo training |

Canal **whatsapp_link** no envía mensaje: genera URL `wa.me`.

---

## 4. WhatsApp soporte

| Concepto | Valor default |
|----------|---------------|
| Número global | **573192635819** (+57 319 263 5819) |
| URL | `https://wa.me/573192635819?text=...` |
| Mensaje | Por programa/plan (Vital, Food, Training…) |

**Mi cuenta:** botón **Contactar soporte** → abre WhatsApp con texto del plan.

**Config por plan:** editar plan en Planes y licencias → campos `support_whatsapp`, `support_message`, `support_activo`.

Utilidad frontend: `src/utils/whatsappSupport.js`

---

## 5. Asistente contextual (FAQ)

Widget flotante en paneles D28D / Training:

1. Usuario escribe pregunta.
2. Motor busca en FAQ (sin IA externa).
3. Si no hay match → **Escalar a WhatsApp**.

API: `POST /api/help/ask`, `POST /api/help/escalate`

Ver FAQ en [07_CONFIGURACIONES_ADMIN.md](./07_CONFIGURACIONES_ADMIN.md).

---

## 6. Email

Servicio: `shellMailService.js` — requiere SMTP configurado en staging/producción.

Plantillas canal `email` usan variables: `{{user.nombre}}`, `{{now}}`, etc.

---

## 7. Scheduler

Job: `communicationScheduler.js` — hora configurable (default 3:00).

Ejecuta jobs diarios (expiraciones, recordatorios según plantillas seed).

Variable entorno relacionada en backend `.env`.

---

## 8. APIs

| Ruta | Uso |
|------|-----|
| `/api/communications/templates` | CRUD plantillas |
| `/api/communications/logs` | Auditoría eventos |
| `/api/communications/dispatch` | Disparo manual (admin) |

---

## 9. Pruebas

```bash
npm run test:comm    # 21 checks comunicación + WhatsApp + registro
npm run test:ux      # asistente + escalada WhatsApp
```

---

[← Planes y pagos](./05_PLANES_PAGOS_VIGENCIAS.md) · [Índice](./README.md) · [Configuraciones →](./07_CONFIGURACIONES_ADMIN.md)
