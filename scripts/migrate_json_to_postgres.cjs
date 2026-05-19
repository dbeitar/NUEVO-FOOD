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
const BACKEND = path.resolve(__dirname, '..', 'backend');
process.chdir(BACKEND);
require('dotenv').config();

const db = require(path.join(BACKEND, 'src/config/dbClient'));
const { KNOWN_COLLECTIONS } = require(path.join(BACKEND, 'src/utils/pgCollectionCache'));

const DATA_DIR = process.env.JSON_DATA_DIR
  ? path.resolve(process.env.JSON_DATA_DIR)
  : path.join(BACKEND, 'data');

async function main() {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error('Configura DATABASE_URL o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD');
    process.exit(1);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS json_collections (
      name VARCHAR(255) PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  let imported = 0;
  let skipped = 0;

  for (const name of KNOWN_COLLECTIONS) {
    const fp = path.join(DATA_DIR, name);
    if (!fs.existsSync(fp)) {
      skipped++;
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(fp, 'utf8'));
    await db.query(
      `INSERT INTO json_collections (name, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [name, JSON.stringify(payload)],
    );
    console.log(`  OK  ${name}`);
    imported++;
  }

  console.log(`\n${imported} colecciones importadas, ${skipped} sin archivo en disco.`);
  console.log('Reinicia el backend con USE_PG_STORAGE=true (o NODE_ENV=production + DB).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
