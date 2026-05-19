const { usePgStorage, useDbAuth } = require('../utils/storageMode');

async function initStorage() {
  if (useDbAuth() && usePgStorage()) {
    console.warn(
      '[CONFIG] USE_DB_AUTH ignorado: con USE_PG_STORAGE todo el dominio (incl. usuarios) va a PostgreSQL.',
    );
  }

  if (!usePgStorage()) {
    console.log('[storage] Modo archivos JSON (backend/data/)');
    return { mode: 'json' };
  }

  if (!process.env.DATABASE_URL && !process.env.DB_HOST && !process.env.DB_NAME) {
    throw new Error(
      'USE_PG_STORAGE activo pero faltan DATABASE_URL o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD',
    );
  }

  const pgCollectionCache = require('../utils/pgCollectionCache');
  await pgCollectionCache.init();
  console.log('[storage] Modo PostgreSQL (json_collections)');
  return { mode: 'postgres' };
}

module.exports = { initStorage };
