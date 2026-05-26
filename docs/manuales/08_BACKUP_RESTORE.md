# Backup y restore PostgreSQL — MVPFOOD

## Backup automático

```bash
chmod +x scripts/backup_postgres.sh
./scripts/backup_postgres.sh
# Salida: backups/pg/mvpfood_YYYYMMDD_HHMMSS.dump
```

Variables opcionales: `POSTGRES_HOST`, `POSTGRES_PORT` (default 5434), `BACKUP_RETENTION_DAYS` (default 14).

## Restore completo

```bash
docker exec -i mvpfood-postgres pg_restore -U mvpfood -d mvpfood --clean --if-exists < backups/pg/mvpfood_YYYYMMDD.dump
```

## Restore parcial (tabla)

```bash
pg_restore -t module_licenses -d mvpfood backups/pg/mvpfood_YYYYMMDD.dump
```

## Rollback aplicación (Git)

Ver tag `pre-food-integration-20260521` en historial del repositorio.
