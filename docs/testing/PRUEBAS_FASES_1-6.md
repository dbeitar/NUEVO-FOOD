# Pruebas Fases 1–6 (operativo)

## Arranque

```bash
docker compose up -d postgres
cd backend && npx prisma migrate deploy && npx prisma generate
cd .. && node scripts/seed_production_verify.cjs 'Demo!2026'
cd backend && PORT=3002 node server.js   # terminal 1
npm run dev                             # terminal 2
```

## API automática

```bash
./scripts/test_all_phases.sh http://localhost:3002/api
./scripts/test_d28d_host_role.sh http://localhost:3002/api
node scripts/migrate_module_access_to_licenses.cjs
```

## Cuentas

| Email | Rol / uso |
|-------|-----------|
| host.d28d@d28d.local | Entrenador D28D (solo clases, coach Alejo) |
| final.gym@d28d.local | Usuario gym + licencia `gym` |
| final.d28d@d28d.local | Todos los módulos |
| admin@d28d.local | Super admin → menú Pagos |

Contraseña: `Demo!2026`

## Manual UI

1. **F1:** login `host.d28d@d28d.local` → solo Clases en vivo.
2. **F2:** login `final.d28d@` → 5 tarjetas según licencias.
3. **F3:** login `final.gym@` → tarjeta Gimnasio + D28D.
4. **F4:** login coach con `trainer_id` → Mi cuenta → Marca del coach.
5. **F5:** super_admin → Pagos → configurar URLs.
6. **F6:** `TRAINING_PLANS_SQL=true` en backend/.env (opcional, con Postgres).
