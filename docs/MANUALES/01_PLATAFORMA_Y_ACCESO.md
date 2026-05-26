# Manual 01 — Plataforma y acceso

**Módulo:** Shell D28D (núcleo)  
**Versión:** Mayo 2026

---

## 1. Qué es el shell

El **shell** es la plataforma central: un solo login, un solo usuario y varios servicios activados por licencia.

| Responsabilidad | Descripción |
|-----------------|-------------|
| Autenticación | JWT, sesión ~7 días |
| Registro | Wizard comercial o API |
| Licencias | `module_licenses` + `module_access` |
| Pagos | Wompi, sede, transferencia |
| Comunicación | Eventos, plantillas, WhatsApp |
| Marca | Apariencia global y white-label gym |

Los módulos **Food** y **Training** embebidos usan SSO: mismo email/contraseña del shell.

---

## 2. Login

1. Abrir la URL del frontend (ej. `http://localhost:5175`).
2. Email + contraseña → token JWT guardado en `localStorage`.
3. Redirección al **Inicio** con tarjetas de servicios licenciados.

### Credenciales de desarrollo

Contraseña común: **`Demo!2026`**

| Email | Rol |
|-------|-----|
| `admin@foodplan.local` | super_admin |
| `admin.d28d@foodplan.local` | admin_d28d |
| `admin.food@foodplan.local` | admin_food_plan |
| `admin.entrenador@foodplan.local` | admin_training |
| `usuario.demo@foodplan.local` | usuario_final |

Rescate tras reset de BD: `npm run seed:dev`

---

## 3. Registro

### Wizard comercial (frontend)

Ruta: pantalla **Registro** (activo por defecto con `VITE_REGISTER_WIZARD_V2=true`).

Pasos: Servicio → Programa (solo D28D) → Plan → Moneda → Datos y pago.

| Servicio | Módulos asignados |
|----------|-------------------|
| D28D | `d28d`, `live_classes`, `d28d_program` |
| Food | `food_plan`, `nutrition` |
| Training | `training`, `nutrition` |

Tras registro: `POST /accounts` activa el plan (Wompi abre checkout si aplica).

### API directa

`POST /api/auth/register` — requiere `nombre`, `email`, `password` (≥8), opcional `genero`, `module_access`, `invite_code`.

### Plan pareja

1. Titular activa plan con `is_couple=true` → recibe `couple_invite_code`.
2. Pareja se registra y usa **Redimir código pareja** en Mi cuenta.

---

## 4. Roles

| Rol | Acceso típico |
|-----|---------------|
| `super_admin` | Todo: maestros, pagos, comunicación, auditoría |
| `admin_d28d` | D28D, programas, clases, gimnasios, retos |
| `admin_food_plan` / `admin_food` | Food, catálogo, recetas |
| `admin_training` / `admin_entrenador` | Training, coaches, rutinas |
| `admin_gimnasio` / `admin_marca` | Su sede: usuarios, clases, vigencias |
| `entrenador` / `nutricionista` | Sus atletas |
| `entrenador_d28d` | Host de clases (sin crear clases globales) |
| `usuario_final` | Solo servicios de su plan |

**Multi-sede:** el token incluye `gym_id`; un admin de gym no ve otras sedes.

---

## 5. Maestros del sistema

Menú **Maestros** (principalmente `super_admin`):

| Maestro | Manual |
|---------|--------|
| D28D | [02_MODULO_D28D.md](./02_MODULO_D28D.md) |
| Plan de alimentación | [03_MODULO_FOOD.md](./03_MODULO_FOOD.md) |
| Entrenadores | [04_MODULO_TRAINING.md](./04_MODULO_TRAINING.md) |
| Planes y licencias | [05_PLANES_PAGOS_VIGENCIAS.md](./05_PLANES_PAGOS_VIGENCIAS.md) |
| Configuraciones | [07_CONFIGURACIONES_ADMIN.md](./07_CONFIGURACIONES_ADMIN.md) |

---

## 6. Multi-licencia (un login, varios servicios)

El perfil expone `module_access` y `licenses`. El Inicio usa `GET /api/accounts/my-services`.

**Ejemplo verificado:** `final.d28d@d28d.local` → D28D + Food + Training + clases en vivo.

**Coach marca blanca:** `nicolasdelrio@foodplan.local` / `nicolas123` → Food + Training (sin D28D). Seed: `npm run seed:coach-nicolas`.

---

## 7. Glosario shell

| Término | Significado |
|---------|-------------|
| `module_access` | JSON con módulos activos del usuario |
| Invite code | Código gym/coach/D28D al registrarse |
| SSO | Entrada Food/Training con token del shell |
| Vigencia | Fecha fin de licencia (`valid_until`) |

---

[← Índice manuales](./README.md) · [Siguiente: D28D →](./02_MODULO_D28D.md)
