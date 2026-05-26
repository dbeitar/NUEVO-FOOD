const path = require('path');
const { execSync } = require('child_process');
const {
  useJsonFiles,
  useRelationalStorage,
  useDbAuth,
} = require('../utils/storageMode');

async function initStorage() {
  if (useDbAuth() && useRelationalStorage()) {
    console.warn('[CONFIG] USE_DB_AUTH ignorado: auth y dominio usan tablas relacionales.');
  }

  if (useJsonFiles()) {
    console.log('[storage] Modo archivos JSON (solo dev sin Postgres)');
    return { mode: 'json', orm: null };
  }

  const { ensureDatabaseUrl, connectPrisma, getPrisma } = require('../lib/prisma');
  if (!ensureDatabaseUrl()) {
    throw new Error('Falta DATABASE_URL o DB_HOST/DB_NAME/DB_USER para almacenamiento relacional');
  }

  await connectPrisma();

  const backendRoot = path.join(__dirname, '../..');
  try {
    execSync('npx prisma migrate deploy', { cwd: backendRoot, stdio: 'inherit' });
  } catch (e) {
    console.warn('[storage] migrate deploy:', e.message);
  }

  const { hydrateAll } = require('../db/hydrateAll');
  await hydrateAll();

  const userCount = await getPrisma().user.count();
  if (userCount === 0) {
    const { seedRelationalFromJson } = require('../db/seedRelationalFromJson');
    await seedRelationalFromJson();
    await hydrateAll();
  }

  console.log('[storage] PostgreSQL relacional + Prisma — listo');
  return { mode: 'relational', orm: 'prisma' };
}

module.exports = { initStorage };
