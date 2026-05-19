#!/usr/bin/env node
/**
 * Despliegue Prisma en producción: generate + migrate deploy.
 * Ejecutar en el servidor después de configurar DATABASE_URL.
 */
const { execSync } = require('child_process');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..', 'backend');
process.chdir(BACKEND);
require('dotenv').config();

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('Configura DATABASE_URL o DB_HOST/DB_NAME/DB_USER/DB_PASSWORD');
  process.exit(1);
}

console.log('=== Prisma: generate ===');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('\n=== Prisma: migrate deploy ===');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });

console.log('\n✓ Prisma listo. Arranca el backend (npm start).');
