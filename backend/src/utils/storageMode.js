/**
 * Modo de persistencia del dominio (gimnasios, usuarios, ciclos, etc.).
 *
 * USE_PG_STORAGE=true  → PostgreSQL (Prisma → json_collections).
 * USE_PG_STORAGE=false → archivos en backend/data/*.json
 *
 * USE_PRISMA=false     → SQL crudo (pg) en lugar de Prisma (solo si PG activo).
 *
 * En producción, si hay DATABASE_URL o DB_* y no se desactiva, se usa PostgreSQL + Prisma.
 */
function usePgStorage() {
  const explicit = String(process.env.USE_PG_STORAGE || '').trim().toLowerCase();
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') return true;
  if (explicit === 'false' || explicit === '0' || explicit === 'no') return false;

  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const hasDb = Boolean(
    process.env.DATABASE_URL
    || process.env.DB_HOST
    || process.env.DB_NAME,
  );
  return isProd && hasDb;
}

function useDbAuth() {
  if (usePgStorage()) return false;
  return String(process.env.USE_DB_AUTH || '').toLowerCase() === 'true';
}

/** Prisma ORM para json_collections (recomendado en producción). */
function usePrisma() {
  if (!usePgStorage()) return false;
  const explicit = String(process.env.USE_PRISMA || '').trim().toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'no') return false;
  if (explicit === 'true' || explicit === '1' || explicit === 'yes') return true;
  return true;
}

module.exports = { usePgStorage, useDbAuth, usePrisma };
