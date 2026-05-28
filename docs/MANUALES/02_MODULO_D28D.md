# Manual 02 — Módulo D28D

**Programas, clases en vivo, gimnasios marca blanca, retos y progreso**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

D28D opera los programas de transformación en 28 días:

| Programa | Público |
|----------|---------|
| **Vital D28D** | Bienestar integral |
| **Pancitas Fit** | Embarazo |
| **Virtual D28D** | Programa clásico online |

Incluye: ciclos, clases en vivo (Zoom), galería de ejercicios, gimnasios white-label, retos con podio y seguimiento de adherencia.

---

## 2. Cómo acceder

| Rol | Ruta UI |
|-----|---------|
| Super admin / Admin D28D | **Maestros → D28D** o servicio **D28D** en Inicio |
| Admin gym / marca | Dentro del panel D28D → sección Gimnasios marca blanca |
| Usuario final | Tarjeta D28D / Clases en Inicio |
| Host D28D | Rol `entrenador_d28d` — solo clases asignadas |

---

## 3. Panel Operación (tarjetas)

| Tarjeta | Función |
|---------|---------|
| **Clases en vivo y reuniones** | Plantillas y calendario con links Zoom |
| **Programas D28D** | Ciclos, Zoom por programa, planes comerciales (pestaña Planes) |
| **Rutinas D28D** | Plantillas reutilizables para clases |
| **Retos D28D** | CRUD retos, evaluación, podio 1°/2°/3° |
| **Galería de videos** | Videos por ejercicio |

### Gimnasios marca blanca

| Tarjeta | Quién | Función |
|---------|-------|---------|
| Gimnasios | Super admin, Admin D28D | Crear sedes, branding |
| Usuarios | Admin gym / D28D | Altas y roles por sede |
| Clases en vivo (sede) | Admin gym | Agenda local |
| Empresas y convenios | Super admin | Convenios corporativos |

> Solo plataforma crea gimnasios nuevos; admin gym opera su sede.

---

## 4. Flujo clases en vivo

```
Admin programa clase → Usuario se inscribe → Entra por Zoom → Asistencia registrada
```

| Entrada | Salida |
|---------|--------|
| Programa, ciclo, título, horario, link Zoom | Calendario + inscripciones |
| Cambio de horario | Evento `d28d.class.time_changed` |

**Zoom:** se configura por programa (pestaña Zoom en editor de programa), no en un maestro global separado.

---

## 5. Retos D28D

**Admin:** D28D → Retos D28D

| Acción | Descripción |
|--------|-------------|
| Crear / editar | Nombre, programa, fechas, premio |
| Activar / cerrar | Estados del reto |
| Evaluar | Puntuación por participante |
| Podio | 1°, 2°, 3° y publicar ganadores |

**Usuario:** vista Progreso / retos — inscribirse, subir evidencias (texto, imagen, PDF).

**API:** `/api/d28d/challenges/*`

---

## 6. Seguimiento y progreso

| Indicador | Descripción |
|-----------|-------------|
| Asistencia clases | % sobre clases programadas |
| Retos | Inscritos, completados, ganados |
| Semáforo | Verde ≥70%, amarillo ≥40%, rojo &lt;40% |
| Días activos | Actividad en plataforma |

**Usuario:** menú **Progreso** → panel D28D.  
**Admin:** `GET /api/d28d/progress/overview`

---

## 7. Roles D28D específicos

| Rol | Permisos |
|-----|----------|
| `admin_d28d` | Programas, clases, retos, gimnasios (plataforma) |
| `entrenador_d28d` | Ver clases asignadas; **no** crear clases globales |
| `admin_gimnasio` | Usuarios y clases de su sede |

---

## 8. Datos principales

| Tabla / store | Contenido |
|---------------|-----------|
| `programs`, `cycles` | Programas y ciclos 28 días |
| Live classes | Plantillas y sesiones |
| `d28d_challenges` | Retos y participación |
| `d28d_user_progress_snapshots` | Progreso / semáforo |
| `gyms` | Marca blanca |

---

## 9. Pruebas

```bash
npm run test:ux          # retos + progreso D28D
npm run test:phases      # rol entrenador_d28d
npm run test:commercial  # registro D28D + pareja
```

---

[← Plataforma](./01_PLATAFORMA_Y_ACCESO.md) · [Índice](./README.md) · [Food →](./03_MODULO_FOOD.md)
