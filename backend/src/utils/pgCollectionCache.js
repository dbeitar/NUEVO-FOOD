const fs = require('fs');
const path = require('path');
const db = require('../config/dbClient');
const { usePrisma } = require('./storageMode');

const DATA_DIR = process.env.JSON_DATA_DIR
  ? path.resolve(process.env.JSON_DATA_DIR)
  : path.join(__dirname, '../../data');

/** Colecciones que el backend persiste (mismo nombre que el archivo JSON histórico). */
const KNOWN_COLLECTIONS = [
  'users.json',
  'gyms.json',
  'trainers.json',
  'cycles.json',
  'foods.json',
  'recipes.json',
  'live_classes.json',
  'training_plans.json',
  'training_log.json',
  'daily_food_logs.json',
  'exercises_gallery.json',
  'fitness_tests.json',
  'trainer_masters.json',
  'user_plans.json',
  'ecosystem_modules.json',
  'program_settings.json',
  'accounts_state.json',
];

const cache = new Map();
let initialized = false;
let flushChain = Promise.resolve();

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS json_collections (
  name VARCHAR(255) PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_json_collections_updated ON json_collections(updated_at);
`;

function diskPath(collectionName) {
  return path.join(DATA_DIR, collectionName);
}

function readDisk(collectionName) {
  const fp = diskPath(collectionName);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (e) {
    console.warn(`[storage] No se pudo leer ${fp}:`, e.message);
    return null;
  }
}

async function ensureTable() {
  if (usePrisma()) {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS json_collections (
        name VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_json_collections_updated ON json_collections(updated_at);
    `);
    return;
  }
  await db.query(CREATE_TABLE_SQL);
}

async function readFromDb(name) {
  if (usePrisma()) {
    const { getPrisma } = require('../lib/prisma');
    const row = await getPrisma().jsonCollection.findUnique({ where: { name } });
    return row ? row.payload : null;
  }
  const res = await db.query('SELECT payload FROM json_collections WHERE name = $1', [name]);
  return res.rows?.length ? res.rows[0].payload : null;
}

async function writeToDb(name, payload) {
  if (usePrisma()) {
    const { getPrisma } = require('../lib/prisma');
    await getPrisma().jsonCollection.upsert({
      where: { name },
      create: { name, payload },
      update: { payload },
    });
    return;
  }
  await db.query(
    `INSERT INTO json_collections (name, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [name, JSON.stringify(payload)],
  );
}

async function loadCollection(name, fallbackDefault) {
  const existing = await readFromDb(name);
  if (existing !== null && existing !== undefined) {
    return existing;
  }

  const fromDisk = readDisk(name);
  const payload = fromDisk !== null ? fromDisk : fallbackDefault;
  await writeToDb(name, payload);
  if (fromDisk !== null) {
    console.log(`[storage] Importado desde disco: ${name}`);
  }
  return payload;
}

async function init(overrides = {}) {
  if (initialized) return;

  if (usePrisma()) {
    const { connectPrisma } = require('../lib/prisma');
    await connectPrisma();
  }

  await ensureTable();

  const names = new Set([...KNOWN_COLLECTIONS, ...Object.keys(overrides)]);
  for (const name of names) {
    const fallback = Object.prototype.hasOwnProperty.call(overrides, name)
      ? overrides[name]
      : (name.endsWith('.json') ? [] : null);
    const data = await loadCollection(name, fallback);
    cache.set(name, data);
  }

  initialized = true;
  const via = usePrisma() ? 'Prisma' : 'PostgreSQL (pg)';
  console.log(`[storage] ${cache.size} colecciones listas — ${via}`);
}

function isReady() {
  return initialized;
}

function get(collectionName, fallbackDefault = []) {
  if (!initialized) return fallbackDefault;
  if (cache.has(collectionName)) return cache.get(collectionName);
  return fallbackDefault;
}

function set(collectionName, data) {
  cache.set(collectionName, data);
  flushChain = flushChain
    .then(() => persist(collectionName, data))
    .catch((err) => {
      console.error(`[storage] Error guardando ${collectionName}:`, err.message);
    });
  return data;
}

async function persist(collectionName, data) {
  await writeToDb(collectionName, data);
}

async function flushAll() {
  await flushChain;
  const tasks = [];
  for (const [name, data] of cache.entries()) {
    tasks.push(persist(name, data));
  }
  await Promise.all(tasks);
}

module.exports = {
  init,
  get,
  set,
  flushAll,
  isReady,
  KNOWN_COLLECTIONS,
};
