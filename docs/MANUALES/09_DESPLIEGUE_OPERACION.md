# Manual 09 — Despliegue y operación

**Arranque local, staging, seeds, pruebas y backup**  
**Versión:** Mayo 2026

---

## 1. Arranque local (desarrollo)

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
cp .env.example .env
npm install && cd backend && npm install && cd ..
cd backend && npx prisma migrate deploy && npx prisma generate
npm run dev:all
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5175 |
| Backend | http://localhost:3002/api |
| Health | http://localhost:3002/api/health |
| PostgreSQL | localhost:5434 |

---

## 2. Variables críticas (backend)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL |
| `USE_RELATIONAL_STORAGE=true` | Modo producción |
| `JWT_SECRET` | ≥ 32 caracteres |
| `SUPPORT_WHATSAPP_DEFAULT` | 573192635819 |
| SMTP / Wompi | Según entorno |

Ver `backend/.env.example` y `.env.example` raíz.

---

## 3. Seeds y cuentas piloto

| Comando | Uso |
|---------|-----|
| `npm run seed:dev` | 8 cuentas piloto + contraseña `Demo!2026` |
| `npm run seed:verify` | Cuentas E2E producción-verify manifest |
| `npm run seed:coach-nicolas` | Demo coach Food+Training |

Tras seed en PostgreSQL: **reiniciar backend** (cache UserDatabase en RAM).

---

## 4. Migraciones

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Al arrancar, `syncPostgresSequences` corrige SERIAL desincronizados (evita error 500 en registro).

---

## 5. Despliegue staging / producción

Checklist completo: [STAGING_READINESS.md](../STAGING_READINESS.md)

Resumen:

1. PostgreSQL gestionado + `DATABASE_URL` segura.
2. Migraciones + generate.
3. `npm run build` (frontend).
4. Backend con CORS al dominio real.
5. Seeds piloto si entorno nuevo.
6. Ejecutar suite E2E contra URL staging.

---

## 6. Pruebas automatizadas

| Comando | Checks | Área |
|---------|--------|------|
| `npm run test:comm` | 21 | Comunicación, WhatsApp, registro |
| `npm run test:commercial` | 20 | Planes, pareja, registro |
| `npm run test:ux` | 26 | Retos, FAQ, progreso |
| `npm run test:phases` | Fases 1–6 | Licencias, D28D host |
| `npm run test:e2e` | 14 | Smoke integral |

Base URL default: `http://localhost:3002/api`

---

## 7. Backup PostgreSQL

```bash
./scripts/backup_postgres.sh
# Salida: backups/pg/mvpfood_YYYYMMDD_HHMMSS.dump
```

Restore: `pg_restore` según comentarios en el script.

---

## 8. Monitoreo operativo

| Qué revisar | Dónde |
|-------------|-------|
| API viva | `GET /api/health` |
| Errores registro | Logs backend + `test:commercial` |
| Cola comunicación | Configuraciones → Comunicación → Eventos |
| Pagos pendientes | Configuraciones → Vigencias |
| Secuencias PG | Reinicio backend (auto-sync) |

---

## 9. Estado Mayo 2026

| Área | Estado |
|------|--------|
| Registro D28D / Food / Training / Pareja | OK |
| Licencias y pagos | OK |
| D28D + clases + retos | OK |
| Food + Training (shell + embebido) | OK piloto |
| Comunicación + WhatsApp | OK |
| E2E total | 81/81 en local |

---

[← Usuario final](./08_USUARIO_FINAL.md) · [Índice manuales](./README.md) · [Manual ecosistema](../MANUAL_ECOSISTEMA.md)
