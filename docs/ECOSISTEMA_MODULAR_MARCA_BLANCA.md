# Ecosistema modular marca blanca

Fecha: 2026-05-01

## Decisiones base

- D28D vive como marca blanca dentro del maestro de gimnasios y tambien como modulo especial protegido.
- Los gimnasios pueden usar D28D con su propia marca, pero no pueden copiar ni editar plantillas D28D.
- Cada entrenador tiene maestros propios: galeria, rutinas, parametros nutricionales y usuarios asignados.
- Un usuario puede tener varios roles. Se mantiene `rol` como rol principal para compatibilidad y se agrega `roles` para permisos granulares.
- La alimentacion se asigna siempre a un usuario y la administra un entrenador.
- Las clases en vivo registran asistencia cuando el usuario final hace clic para entrar al Zoom.

## Modulos

| Modulo | Independiente | Marca blanca | Replicable | Propietario |
| --- | --- | --- | --- | --- |
| Gym | Si | Si | Si | marca/gym |
| D28D | Si | Si | No editable | D28D |
| Entrenamiento | Si | Si | Si | entrenador/marca |
| Alimentacion | Si | Si | Compatible | entrenador |
| Clases en vivo | Si | Si | D28D bloqueado | D28D o marca |

## Roles

| Rol | Proposito |
| --- | --- |
| `super_admin` | Control total del ecosistema |
| `admin_marca` | Administra una marca blanca con permisos granulares |
| `admin_gimnasio` | Administra gimnasio, entrenadores y usuarios asociados |
| `admin_d28d` | Administra plantillas, galeria y clases D28D |
| `entrenador` | Administra sus usuarios, rutinas, galeria y nutricion |
| `nutricionista` | Gestiona planes nutricionales y parametros |
| `usuario_final` | Consume entrenamiento, alimentacion y clases |

## Permisos iniciales

Los permisos son cadenas funcionales, por ejemplo:

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

## Regla D28D

Los gimnasios pueden consumir calendario, plantillas y clases D28D como contenido bloqueado. El origen conserva:

```txt
source_module: d28d
locked: true
editable_by: [super_admin, admin_d28d]
```

## Asistencia en vivo

La asistencia se registra al hacer clic en "Unirse ahora". El usuario puede inscribirse previamente, pero la asistencia real es:

```txt
attendance_user_ids
attendance_events
```

## Rastro local

Las pruebas y avances se guardan en:

```txt
docs/testing/ecosistema-modular/
```
