/**
 * Persistencia del dominio.
 *
 * USE_RELATIONAL_STORAGE=true (default con DATABASE_URL) → tablas Prisma.
 * USE_JSON_FILES=true → solo desarrollo sin Docker/Postgres.
 */

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL
    || (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER),
  );
}

function useJsonFiles() {
  const explicit = String(process.env.USE_JSON_FILES || '').trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  return !hasDatabaseConfig();
}

function useRelationalStorage() {
  if (useJsonFiles()) return false;
  const explicit = String(process.env.USE_RELATIONAL_STORAGE || '').trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  return hasDatabaseConfig();
}

/** @deprecated usar useRelationalStorage */
function usePgStorage() {
  return useRelationalStorage();
}

function useDbAuth() {
  return false;
}

function usePrisma() {
  return useRelationalStorage();
}

/** Fase 6: leer/escribir training plans en tabla SQL además de DomainDocument */
function useTrainingPlanSql() {
  const explicit = String(process.env.TRAINING_PLANS_SQL || '').trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return useRelationalStorage();
  if (explicit === 'false' || explicit === '0') return false;
  return useRelationalStorage();
}

module.exports = {
  useJsonFiles,
  useRelationalStorage,
  usePgStorage,
  useDbAuth,
  usePrisma,
  useTrainingPlanSql,
  hasDatabaseConfig,
};
