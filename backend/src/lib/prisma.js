const { PrismaClient } = require('@prisma/client');
const { usePrisma } = require('../utils/storageMode');

let prisma;
let connected = false;

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  if (!host || !name || !user) return null;

  const port = process.env.DB_PORT || '5432';
  const password = encodeURIComponent(process.env.DB_PASSWORD || '');
  const ssl = String(process.env.DB_SSL || '').toLowerCase() === 'true' ? '?sslmode=require' : '';
  return `postgresql://${encodeURIComponent(user)}:${password}@${host}:${port}/${name}${ssl}`;
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const built = buildDatabaseUrl();
  if (built) {
    process.env.DATABASE_URL = built;
    return built;
  }
  return null;
}

function getPrisma() {
  if (!usePrisma()) {
    throw new Error('Prisma no está activo (USE_PRISMA / USE_PG_STORAGE)');
  }
  if (!prisma) {
    const url = ensureDatabaseUrl();
    if (!url) {
      throw new Error('DATABASE_URL o DB_HOST/DB_NAME/DB_USER requeridos para Prisma');
    }
    prisma = new PrismaClient({
      datasources: { db: { url } },
      log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  return prisma;
}

async function connectPrisma() {
  const client = getPrisma();
  if (!connected) {
    await client.$connect();
    connected = true;
  }
  return client;
}

async function disconnectPrisma() {
  if (prisma && connected) {
    await prisma.$disconnect();
    connected = false;
  }
}

function isPrismaConnected() {
  return connected;
}

module.exports = {
  getPrisma,
  connectPrisma,
  disconnectPrisma,
  isPrismaConnected,
  ensureDatabaseUrl,
  buildDatabaseUrl,
};
