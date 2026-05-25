# Módulo Entrenadores (paridad Food Plan)

## Arquitectura modular

```
┌─────────────────────────────────────────────────────────┐
│  D28D Shell (MVPFOOD) — corazón                         │
│  • Auth JWT único                                       │
│  • Licencias module_access                              │
│  • Servicios: D28D | Food | Training | Live             │
└────────────┬──────────────────────┬─────────────────────┘
             │                      │
   /food-plan/*              /training-module/*
             │                      │
   ┌─────────▼─────────┐   ┌──────▼──────────────────┐
   │ Food Plan         │   │ Módulo Entrenadores      │
   │ (NestJS embebido) │   │ (shell embebido, mismo   │
   │                   │   │  stack React + API D28D) │
   └───────────────────┘   └──────────────────────────┘
```

- **D28D**: programas, clases en vivo, Zoom, rutinas plataforma — no se modifica en este módulo.
- **Food Plan**: `modules/food_version_final` + `/food-plan` — no se toca.
- **Entrenadores**: `/training-module` + `/api/training-module/*` — mismo patrón SSO que Food.

## Endpoints shell (backend)

| Ruta | Uso |
|------|-----|
| `GET /training-module/launch` | URL embebida + handoff |
| `POST /training-module/exchange` | SSO con token handoff |
| `POST /training-module/exchange-session` | SSO con JWT shell activo |
| `POST /training-module/provision` | Crear perfil training (admin_d28d) |
| `POST /training-module/sync-license` | Sincronizar licencia |

API de negocio (sin cambiar): `/api/training/*`, `/api/d28d/routines` (coach_wl), `/api/d28d/coach/*` (solo entrenador_d28d).

## Pantallas del módulo (`/training-module`)

### Coach / admin entrenador

| Ruta | Función |
|------|---------|
| `/coach` | Panel Capacitación (6 tarjetas) |
| `/coach/planning` | Planes + diario global |
| `/coach/routines` | Plantillas marca blanca |
| `/coach/gallery` | Videos por ejercicio |
| `/coach/users` | Usuarios asignados (`trainer_id`) |
| `/coach/progress` | Seguimiento experto (KPIs, notas coach) |

### Entrenado

| Ruta | Función |
|------|---------|
| `/athlete` | Rutina del día + registro de sesión |

## Variables

| Variable | Default | Efecto |
|----------|---------|--------|
| `VITE_TRAINING_LEGACY=false` | modular | Abre `/training-module` |
| `VITE_TRAINING_LEGACY=true` | — | Panel antiguo dentro del Dashboard |
| `TRAINING_EMBEDDED=true` | embebido | Launch → `/training-module/shell-sso` |

## Roles

- `entrenador` / `admin_training`: módulo Entrenadores (sin D28D operativo).
- `entrenador_d28d`: solo D28D / clases (sin mezclar con coach WL).
- `usuario_final` con licencia `training`: vista `/athlete`.
