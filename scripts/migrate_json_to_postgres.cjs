#!/usr/bin/env node
/**
 * Importa backend/data/*.json a PostgreSQL (tabla json_collections).
 * Ejecutar una vez en el servidor antes o después de activar USE_PG_STORAGE.
 *
 * Requiere: DATABASE_URL o DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
 *
 *   node scripts/migrate_json_to_postgres.cjs
 */
const path = require('path');
const fs = require('fs');

process.env.USE_PG_STORAGE = 'true';
process.env.USE_PRISMA = 'true';
const BACKEND = path.resolve(__dirname, '..', 'backend');
process.chdir(BACKEND);
require('dotenv').config();

const { ensureDatabaseUrl } = require(path.join(BACKEND, 'src/lib/prisma'));
const { KNOWN_COLLECTIONS } = require(path.join(BACKEND, 'src/utils/pgCollectionCache'));

const DATA_DIR = process.env.JSON_DATA_DIR
  ? path.resolve(process.env.JSON_DATA_DIR)
  : path.join(BACKEND, 'data');

async function main() {
  if (!ensureDatabaseUrl() && !process.env.DB_HOST) {
    console.error('Configura DATABASE_URL o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD');
    process.exit(1);
  }

  const { execSync } = require('child_process');
  execSync('npx prisma migrate deploy', { cwd: BACKEND, stdio: 'inherit' });
  execSync('npx prisma generate', { cwd: BACKEND, stdio: 'inherit' });

  const { connectPrisma, getPrisma } = require(path.join(BACKEND, 'src/lib/prisma'));
  await connectPrisma();
  const prisma = getPrisma();

  let imported = 0;
  let skipped = 0;

  for (const name of KNOWN_COLLECTIONS) {
    const fp = path.join(DATA_DIR, name);
    if (!fs.existsSync(fp)) {
      skipped++;
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(fp, 'utf8'));
    await prisma.jsonCollection.upsert({
      where: { name },
      create: { name, payload },
      update: { payload },
    });
    console.log(`  OK  ${name}`);
    imported++;
  }

  await prisma.$disconnect();
  console.log(`\n${imported} colecciones importadas, ${skipped} sin archivo en disco.`);
  console.log('Reinicia el backend (USE_PG_STORAGE + Prisma por defecto en prod).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
