# Manuales MVPFOOD / D28D

Documentación operativa **por módulo**. Cada manual es independiente y puede leerse sin el resto; el índice maestro sigue en [MANUAL_ECOSISTEMA.md](../MANUAL_ECOSISTEMA.md).

**Versión:** Mayo 2026  
**Audiencia:** operadores, administradores, coaches y usuarios finales.

---

## Índice de manuales

| # | Manual | Contenido |
|---|--------|-----------|
| 01 | [Plataforma y acceso](./01_PLATAFORMA_Y_ACCESO.md) | Login, registro, roles, maestros, multi-licencia, SSO |
| 02 | [Módulo D28D](./02_MODULO_D28D.md) | Programas, ciclos, clases en vivo, Zoom, gimnasios, retos, progreso |
| 03 | [Plan de alimentación (Food)](./03_MODULO_FOOD.md) | Calculadora, catálogo, recetas, registro diario, seguimiento |
| 04 | [Entrenadores (Training)](./04_MODULO_TRAINING.md) | Rutinas, galería, asignación, seguimiento, semáforo |
| 05 | [Planes, pagos y vigencias](./05_PLANES_PAGOS_VIGENCIAS.md) | Oferta comercial, registro wizard, pareja, Wompi, licencias |
| 06 | [Comunicación y WhatsApp](./06_COMUNICACION_Y_WHATSAPP.md) | Plantillas, eventos, auditoría, soporte wa.me |
| 07 | [Configuraciones y administración](./07_CONFIGURACIONES_ADMIN.md) | Apariencia, FAQ Center, auditoría, vigencias globales |
| 08 | [Guía usuario final](./08_USUARIO_FINAL.md) | Inicio, servicios, Mi cuenta, progreso, retos |
| 09 | [Despliegue y operación](./09_DESPLIEGUE_OPERACION.md) | Arranque local, staging, seeds, pruebas E2E, backup |

---

## Documentos técnicos complementarios

| Documento | Uso |
|-----------|-----|
| [STAGING_READINESS.md](../STAGING_READINESS.md) | Checklist READY / WARNING / BLOCKER |
| [REFACTOR_CONSOLIDACION_COMERCIAL.md](../REFACTOR_CONSOLIDACION_COMERCIAL.md) | Detalle comercial por programa |
| [FASE_UX_ADHERENCIA.md](../FASE_UX_ADHERENCIA.md) | Retos, FAQ, asistente, APIs UX |
| [README del repo](../../README.md) | Instalación del código |

---

## Mapa rápido: dónde está cada cosa en la UI

```
Inicio (servicios)
├── D28D          → Manual 02
├── Food Plan     → Manual 03
├── Entrenadores  → Manual 04
└── Mi Cuenta     → Manual 08

Maestros (super_admin)
├── D28D          → Manual 02
├── Food          → Manual 03
├── Training      → Manual 04
├── Planes y licencias → Manual 05
└── Configuraciones    → Manual 07 + 06
```

---

*Actualizado Mayo 2026 — ecosistema funcional en staging.*
