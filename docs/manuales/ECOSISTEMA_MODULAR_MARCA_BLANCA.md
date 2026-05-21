# Ecosistema Modular — Marca Blanca y Gobernanza

**Versión:** 1.1 — Consolidación documental
**Audiencia:** Equipo plataforma, partners, marcas piloto
**Relación:** se apoya en `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md` y se complementa con `ARQUITECTURA_VISIBLE_EXPERIENCIA.md` y `ROADMAP_REALISTA_ECOSISTEMA.md`

---

## 1. Decisiones base

- D28D vive como **marca blanca dentro del maestro de gimnasios** y también como **módulo especial protegido** (contenido bloqueado).
- Los gimnasios pueden usar D28D con su propia marca, pero **no pueden copiar ni editar plantillas D28D**.
- Cada entrenador tiene maestros propios: galería, rutinas, parámetros nutricionales y usuarios asignados.
- Un usuario puede tener varios roles. Se mantiene `rol` como rol principal (compatibilidad) y `roles[]` para permisos granulares.
- La alimentación se asigna siempre a un usuario y la administra un entrenador o nutricionista.
- Las clases en vivo registran asistencia cuando el usuario hace clic para entrar al Zoom (no antes).

---

## 2. Módulos del ecosistema

| Módulo | Independiente | Marca blanca | Replicable | Propietario |
| --- | --- | --- | --- | --- |
| Gym | Sí | Sí | Sí | marca / gym |
| D28D | Sí | Sí | **No editable** | D28D |
| Entrenamiento | Sí | Sí | Sí | entrenador / marca |
| Alimentación | Sí | Sí | Compatible | entrenador / nutricionista |
| Clases en vivo | Sí | Sí | D28D bloqueado | D28D o marca |

**Regla:** todo módulo nuevo debe declarar explícitamente estas cuatro propiedades antes de entrar al ecosistema.

---

## 3. Roles

| Rol | Propósito |
| --- | --- |
| `super_admin` | Control total del ecosistema. |
| `admin_marca` | Administra una marca blanca con permisos granulares. |
| `admin_gimnasio` | Administra gimnasio, entrenadores y usuarios asociados. |
| `admin_d28d` | Administra plantillas, galería y clases D28D. |
| `entrenador` | Administra sus usuarios, rutinas, galería y nutrición. |
| `nutricionista` | Gestiona planes nutricionales y parámetros. |
| `usuario_final` | Consume entrenamiento, alimentación y clases. |

> **Principio:** ningún rol ve datos de otra marca por defecto. La separación de datos es una garantía operativa, no un “nice-to-have”.

---

## 4. Permisos iniciales

Los permisos se modelan como cadenas funcionales. Esto evita acoplar lógica de negocio al rol literal.

- `ecosystem.manage`
- `brands.manage`
- `d28d.manage`
- `d28d.view`
- `gyms.manage`
- `trainers.manage_own`
- `training.manage_own`
- `nutrition.manage_assigned`
- `live_classes.manage`
- `live_classes.view`
- `users.manage_assigned`

Cada rol nace con un **set base** de permisos. Las marcas pueden ampliar/restringir dentro de su propio scope.

---

## 5. Regla D28D (contenido bloqueado)

Los gimnasios pueden consumir calendario, plantillas y clases D28D como **contenido bloqueado**. El origen se conserva en cada registro:

```txt
source_module: d28d
locked: true
editable_by: [super_admin, admin_d28d]
```

Esto garantiza:

- Trazabilidad del método.
- Imposibilidad de “canibalizar” IP de D28D bajo otra marca.
- Posibilidad de **distribución masiva** sin pérdida de control editorial.

---

## 6. Asistencia en clases en vivo

La asistencia se registra **al hacer clic en “Unirse ahora”**. La inscripción previa es opcional.

```txt
attendance_user_ids
attendance_events
```

Reglas operativas:
- La asistencia es **evento auditable**, no un toggle manual.
- Un usuario puede inscribirse sin asistir; eso queda registrado como diferencia entre `enrolled` y `attended`.
- El conteo de cupos visible en UI puede usar la lógica enmascarada definida en el manual (cupo congelado en “1 disponible”), pero la realidad operativa registra todo.

---

## 7. Rastro local de evidencia

Las pruebas y avances se guardan en:

```txt
docs/testing/ecosistema-modular/
```

Esto incluye logs de smoke tests, capturas de UI y resultados de validación funcional.

---

## 8. Principios de gobernanza del ecosistema

Esta sección formaliza la madurez operacional del ecosistema, **sin convertirla en burocracia**.

### 8.1 Ownership

- Cada módulo tiene **un dueño funcional** (persona o equipo) que decide su roadmap interno.
- Cada marca tiene **un admin responsable** declarado.
- Cada cuenta de usuario tiene **un trainer responsable** o, en su defecto, está marcada como “sin asignar”.

### 8.2 Multi-tenant y separación de datos

- Los datos están particionados lógicamente por marca/gym (`gym_id`, `brand_id`).
- Ninguna consulta administrativa puede devolver datos de otra marca, excepto:
  - `super_admin`,
  - métricas agregadas anónimas (no identifican usuarios).
- Los respaldos se almacenan con la misma separación.

### 8.3 Marca blanca

- Una marca = un set propio de logo, colores, mensaje, slug y canal de contacto (WhatsApp).
- La marca debe verse en **todas** las pantallas del usuario final.
- La marca de la plataforma (nuestro logo) **no aparece** en pantallas de usuario final, salvo en footer legal mínimo.

### 8.4 Permisos

- Los permisos se chequean **siempre** en backend, nunca solo en frontend.
- El frontend usa permisos para **mostrar/ocultar UI**, no como mecanismo de seguridad.
- Cualquier endpoint nuevo debe declarar el o los permisos requeridos en su documentación.

### 8.5 Contenido bloqueado vs contenido propio

- Los registros llevan `source_module` y `locked` cuando aplican.
- Una marca puede **clonar** contenido propio, **referenciar** contenido bloqueado, pero nunca **modificar** contenido bloqueado.
- Toda clonación queda con trazabilidad del origen.

### 8.6 Auditoría

- Acciones administrativas críticas (alta/baja de usuarios, asignaciones, cambios de plan, accesos a datos cruzados) deben registrarse en log de auditoría.
- El acceso a auditoría es exclusivo de `super_admin`.
- La auditoría no es opcional ni configurable a nivel de marca.

### 8.7 Cambios en el ecosistema

Cualquier cambio que altere la estructura del ecosistema (nuevo módulo, nuevo rol, nuevo permiso, cambio de propiedad de un módulo) debe:

1. Abrir un PR/decision-record en `docs/`.
2. Indicar impacto en módulos existentes y en marcas activas.
3. Validarse con pilotos antes de generalizar.
4. Reflejarse en este documento.

### 8.8 Datos de usuario final

- Los datos personales del usuario final pertenecen al usuario.
- La marca/coach los usa **para acompañar**, no para ceder a terceros.
- Cualquier exportación de datos sigue la política de privacidad declarada en `src/documents/PrivacyPolicy.md`.

---

## 9. Lo que este documento NO hace

- No describe la arquitectura técnica (controladores, base de datos). Eso vive en `DOCUMENTO_TECNICO_FOOD_PLAN.md` y en el código.
- No define copys de marketing.
- No define UX detallada por rol. Eso vive en `ARQUITECTURA_VISIBLE_EXPERIENCIA.md`.

---

*Refinado el 13 de mayo de 2026. La sección de Gobernanza es nueva y debe ser revisada cada vez que entre o salga un módulo.*
