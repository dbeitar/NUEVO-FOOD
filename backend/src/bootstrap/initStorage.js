const { usePgStorage, useDbAuth, usePrisma } = require('../utils/storageMode');

async function initStorage() {
  if (useDbAuth() && usePgStorage()) {
    console.warn(
      '[CONFIG] USE_DB_AUTH ignorado: con USE_PG_STORAGE todo el dominio (incl. usuarios) va a PostgreSQL.',
    );
  }

  if (!usePgStorage()) {
    console.log('[storage] Modo archivos JSON (backend/data/)');
    return { mode: 'json', orm: null };
  }

  if (!process.env.DATABASE_URL && !process.env.DB_HOST && !process.env.DB_NAME) {
    throw new Error(
      'USE_PG_STORAGE activo pero faltan DATABASE_URL o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD',
    );
  }

  const pgCollectionCache = require('../utils/pgCollectionCache');
  await pgCollectionCache.init();

  const mode = usePrisma() ? 'postgres+prisma' : 'postgres';
  console.log(`[storage] Persistencia: ${mode} (json_collections)`);
  return { mode, orm: usePrisma() ? 'prisma' : 'pg' };
}

module.exports = { initStorage };
