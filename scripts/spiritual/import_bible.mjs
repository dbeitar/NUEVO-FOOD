#!/usr/bin/env node
/**
 * Importador biblia JSON → PostgreSQL (VIENTO RECIO V1)
 * Uso: node scripts/spiritual/import_bible.mjs --file backend/data/spiritual/sample_bible_rvr1960.example.json
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const filePath = arg('--file', path.join(root, 'backend/data/spiritual/sample_bible_rvr1960.example.json'));
const versionCode = arg('--version', 'RVR1960');
const versionName = arg('--name', 'Reina-Valera 1960');

process.chdir(root);
process.env.DATABASE_URL = process.env.DATABASE_URL || '';

const { importBibleFromJson } = require(path.join(root, 'backend/src/services/spiritual/bibleImportService'));

importBibleFromJson({ filePath, versionCode, versionName })
  .then((out) => {
    console.log('[spiritual.import]', JSON.stringify(out));
    process.exit(0);
  })
  .catch((e) => {
    console.error('[spiritual.import] ERROR:', e.message);
    process.exit(1);
  });
