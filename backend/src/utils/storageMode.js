/**
 * Modo de persistencia del dominio (gimnasios, usuarios, ciclos, etc.).
 *
 * USE_PG_STORAGE=true  → colecciones JSON en PostgreSQL (tabla json_collections).
 * USE_PG_STORAGE=false → archivos en backend/data/*.json
 *
 * En producción, si hay DB_HOST o DATABASE_URL y no se desactiva explícitamente,
 * se usa PostgreSQL por defecto.
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

module.exports = { usePgStorage, useDbAuth };
