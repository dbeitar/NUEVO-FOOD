# Staging Readiness — MVPFOOD / D28D

**Fecha:** 2026-05-26  
**Alcance:** corrección de blocker + validación E2E (sin nuevas funcionalidades)

---

## Resultado global

| Estado | Significado |
|--------|-------------|
| **READY** | Validado E2E en local `:3002` |
| **WARNING** | Requiere acción manual en staging |
| **BLOCKER** | Resuelto en esta sesión |

---

## BLOCKER (resuelto)

### `POST /auth/register` → HTTP 500

**Causa:** secuencia PostgreSQL `users_id_seq` desincronizada (`last_value=108`, `MAX(id)=142`) + handler legacy con SQL directo.

**Corrección:**
- `backend/src/db/syncPostgresSequences.js` — sincroniza SERIAL al arrancar (`initStorage`)
- `backend/src/controllers/authController.js` — registro vía Prisma (`userRepo.createLegacy`), licencias, provisioning Food/Training, Communication `user.registered`

**Verificado:** `npm run test:commercial` (registro D28D, Food, Training, pareja) — **20/20 OK**

---

## E2E — evidencia

| Suite | Resultado |
|-------|-----------|
| `npm run test:comm` | **21/21 OK** |
| `npm run test:commercial` | **20/20 OK** |
| `npm run test:ux` | **26/26 OK** |
| `npm run test:phases` | **ALL PHASES OK** |
| `npm run test:e2e` | **14/14 OK** |

Cubre: registro, login, pago/cuenta, licencias, D28D, Training, Food, retos, seguimiento, FAQ, asistente, Communication Center, WhatsApp, auditoría, scheduler, expiraciones (comm daily jobs).

---

## Multi-licencia

### Usuario triple módulo (D28D + Food + Training)

| Campo | Valor |
|-------|-------|
| Email | `final.d28d@d28d.local` |
| Password | `Demo!2026` |
| Módulos | `d28d`, `food_plan`, `nutrition`, `training`, `live_classes` |
| Login | único JWT |
| Dashboard | `GET /accounts/my-services` → múltiples servicios |

### Coach Nicolás (Food + Training)

| Campo | Valor |
|-------|-------|
| Email | `nicolasdelrio@foodplan.local` |
| Password | `nicolas123` |
| Módulos | `training`, `food_plan`, `nutrition` |
| Cliente demo | `johnnicolasdelrio718@gmail.com` / `nicolas231223` |
| Seed | `npm run seed:coach-nicolas` |

> Nicolás es coach marca blanca (sin D28D). La verificación triple módulo usa `final.d28d@d28d.local`.

---

## Checklist despliegue staging

### READY

- [x] Registro público (`POST /auth/register`) Food / Training / D28D / pareja
- [x] Login + JWT + perfil enriquecido
- [x] Licencias (`/licenses/me`, `module_licenses`)
- [x] Cuenta comercial (`POST /accounts`, pareja, my-services)
- [x] Communication Center + scheduler (`comm.scheduler`)
- [x] Retos, progreso D28D/Training, FAQ, asistente, auditoría
- [x] Secuencias PostgreSQL auto-sync al boot

### WARNING (acciones en staging)

| Item | Acción |
|------|--------|
| Migraciones | `cd backend && npx prisma migrate deploy && npx prisma generate` |
| Secuencias | Reiniciar backend (sync automático en `initStorage`) |
| Cuentas piloto | `npm run seed:dev` + `npm run seed:verify` |
| Coach Nicolás | `npm run seed:coach-nicolas` (opcional demo) |
| Email real | Configurar SMTP / SendGrid para plantillas `email` |
| Wompi | Variables `WOMPI_*` en staging |
| Food/Training externos | `VITE_FOOD_*`, `VITE_TRAINING_*` según entorno |
| Columna `trainer_id` en rutinas D28D | Migración pendiente en algunos entornos (seed Nicolas muestra warning) |

### BLOCKER (ninguno pendiente post-fix)

---

## Comandos post-deploy

```bash
cd backend && npx prisma migrate deploy && npx prisma generate
PORT=3002 npm run dev          # o proceso PM2/Docker
npm run seed:dev
npm run seed:verify
npm run test:comm
npm run test:commercial
npm run test:ux
npm run test:phases
npm run test:e2e
```

---

*Sin nuevas funcionalidades. Solo corrección de registro + validación operativa.*
