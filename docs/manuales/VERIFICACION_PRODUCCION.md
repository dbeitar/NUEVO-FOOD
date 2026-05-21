# Verificación en producción — registro, códigos y usuarios semilla

Ejecutar **una vez** en el servidor (con volumen persistente en `backend/data/`):

```bash
cd /ruta/al/repo
node scripts/seed_production_verify.cjs 'Demo!2026'
# Reiniciar el proceso del backend
```

El manifiesto versionado está en `scripts/seeds/production-verify.manifest.json`.

---

## 1. Contraseña común (piloto / verificación)

| Uso | Valor |
|-----|-------|
| Todas las cuentas de esta guía | `Demo!2026` (o la que pases al script) |

En producción real, cambia la contraseña después de la verificación o usa contraseñas distintas al invocar el script.

---

## 2. Códigos de invitación (registro público)

Flujo en la app: **Crear cuenta → Código → Plan**.

| Código | Tipo | Módulos activos |
|--------|------|-----------------|
| `D28D-PILOTO` | D28D | D28D, entrenamiento, plan alimentación, clases en vivo |
| `GYM-D28D-004` | Gimnasio (D28D Marca Blanca) | D28D, clases en vivo |
| `COACH-CARLOS-001` | Entrenador Carlos | Entrenamiento, plan alimentación, clases en vivo |
| `GYM-PRO-001` | Gym Pro Fitness | D28D, clases en vivo |
| `COACH-MARIA-002` | Entrenadora María | Entrenamiento, food, clases |

Códigos D28D adicionales (variable de entorno `D28D_INVITE_CODE`): `D28D`, `D28D-PILOTO-2026`.

### API rápida

```bash
API=https://TU-BACKEND/api

curl -s -X POST "$API/auth/resolve-invite" \
  -H 'Content-Type: application/json' \
  -d '{"code":"D28D-PILOTO"}' | jq .

curl -s -X POST "$API/auth/resolve-invite" \
  -H 'Content-Type: application/json' \
  -d '{"code":"GYM-D28D-004"}' | jq .

curl -s -X POST "$API/auth/resolve-invite" \
  -H 'Content-Type: application/json' \
  -d '{"code":"COACH-CARLOS-001"}' | jq .
```

---

## 3. Cuentas administrador (post-semilla)

| Rol | Email |
|-----|-------|
| super_admin | `admin@d28d.local` |
| admin_d28d | `d28d.admin@d28d.local` |
| admin_food | `food.admin@d28d.local` |
| admin_entrenador | `coach.admin@d28d.local` |

**Maestros → Usuarios:** editar un usuario final y activar/desactivar módulos (D28D, entrenamiento, food, clases en vivo).

---

## 4. Usuarios finales de verificación (ya creados por la semilla)

Usar para comprobar el **dashboard** sin repetir el registro.

| Email | Código usado | Qué debe verse en inicio |
|-------|--------------|---------------------------|
| `final.d28d@d28d.local` | D28D-PILOTO | D28D, Plan alimentación, Entrenamiento, Clases en vivo |
| `final.gym@d28d.local` | GYM-D28D-004 | D28D, Clases en vivo |
| `final.coach@d28d.local` | COACH-CARLOS-001 | Entrenamiento, Plan alimentación, Clases en vivo |

```bash
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"final.d28d@d28d.local","password":"Demo!2026"}' | jq '.user.module_access // .token'
```

---

## 5. Checklist manual en el frontend

1. Abrir la URL de producción del frontend.
2. **Registro** con email nuevo:
   - Paso 1: datos personales.
   - Paso 2: código (ej. `D28D-PILOTO`) → debe avanzar sin cerrar la ventana.
   - Paso 3: elegir plan con **clic en tarjeta** (no debe recargar ni cerrar) → confirmar.
3. Iniciar sesión con `final.gym@d28d.local` → solo tarjetas gym/D28D.
4. Login `final.coach@d28d.local` → training + food, sin D28D.
5. Login `admin@d28d.local` → Usuarios → editar módulos de un usuario final → guardar → re-login del usuario y comprobar cambio.

---

## 6. Variables de entorno recomendadas

```env
USE_DB_AUTH=false
SEED_DEMO=false
D28D_INVITE_CODE=D28D,D28D-PILOTO,D28D-PILOTO-2026
```

---

## 7. Si los datos no persisten

- Confirmar volumen montado en `backend/data/`.
- Volver a ejecutar `node scripts/seed_production_verify.cjs`.
- Reiniciar backend.

Ver también: [PRODUCCION_HOY.md](./PRODUCCION_HOY.md).
