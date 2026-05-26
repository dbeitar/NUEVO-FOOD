# Manual 04 — Entrenadores (Training)

**Rutinas, galería, asignación, diario y seguimiento con semáforo**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

El módulo **Entrenadores** permite a coaches y admins:

- Crear plantillas de rutinas (días, ejercicios, series).
- Asignar planes a atletas.
- Gestionar galería de videos por ejercicio.
- Registrar sesiones completadas.
- Ver adherencia con **semáforo** (verde / amarillo / rojo).

Puede operar **embebido** (`/training-module`) o en modo legacy del shell.

---

## 2. Cómo acceder

| Rol | Ruta |
|-----|------|
| Admin training | **Maestros → Entrenadores** |
| Coach puro | Boot directo a galería / seguimiento |
| Usuario final | Tarjeta **Entrenamiento** en Inicio |
| Admin operaciones | Panel ops: entrenadores + usuarios coaches |

---

## 3. Panel coach (tarjetas)

| Tarjeta | Función |
|---------|---------|
| **Galería de videos** | Videos por ejercicio |
| **Asistente IA** | Rutinas desde galería (motor local) |
| **Planificación / Rutinas** | Asignar plan por usuario |
| **Mis usuarios** | Atletas vinculados al coach |
| **Seguimiento** | Adherencia Food + Training |

### Panel admin operaciones

| Tarjeta | Función |
|---------|---------|
| **Entrenadores** | Alta coaches, capacidad, invite codes |
| **Usuarios coaches** | Usuarios de todos los coaches |
| **Seguimiento** | Vista agregada |

---

## 4. Flujo rutina

```
Coach crea plantilla → Asigna a user_id → Atleta ve rutina del día → Registra sesión
```

| Entrada | Salida |
|---------|--------|
| Días, ejercicios, series, descanso | Plan en `/training/my-current-plan` |
| Log de sesión + wellness | Historial y adherencia |
| Sustitución ejercicio | Alternativa sin romper estructura |

**APIs:** `/api/training/admin/plans`, `/api/training/gallery`, logs en store training.

---

## 5. Semáforo de cumplimiento

Calculado sobre **últimos 7 días** de logs:

| Color | Significado típico |
|-------|------------------|
| **Verde** | Adherencia alta |
| **Amarillo** | Adherencia media |
| **Rojo** | Baja actividad |

**Usuario:** panel Progreso → Training.  
**API:** `/api/training/progress/me`, `/api/training/progress/traffic-light/*`

Eventos Communication (plantillas seed): `training.traffic_light.*`

---

## 6. Marca blanca coach

Un entrenador independiente (`entrenador` + `trainer_id`):

- Galería y categorías privadas (`coach:{trainerId}:...`).
- Usuarios creados heredan módulos Food + Training sin D28D.
- Ejemplo demo: `nicolasdelrio@foodplan.local` — seed `npm run seed:coach-nicolas`.

---

## 7. Licencia

| Campo | Valor |
|-------|-------|
| Plan kind | `training` |
| `module_access` | `training: true` |
| Invite coach | Código en registro → `trainer_id` asignado |

---

## 8. Integración embebida

| Variable | Efecto |
|----------|--------|
| Training externo | Abre `/training-module` con SSO |
| `VITE_TRAINING_LEGACY=true` | Rutas legacy en shell |

Código embebido: `modules/training_version_final/`

---

## 9. Pruebas

```bash
npm run test:ux          # semáforo training
npm run test:e2e         # crear rutina, plan
npm run test:commercial  # registro Training
```

---

[← Food](./03_MODULO_FOOD.md) · [Índice](./README.md) · [Planes y pagos →](./05_PLANES_PAGOS_VIGENCIAS.md)
