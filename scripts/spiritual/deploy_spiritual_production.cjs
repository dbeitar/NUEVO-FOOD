#!/usr/bin/env node
/**
 * Despliegue espiritual en producción/staging (idempotente).
 *
 * Qué hace:
 *  1. Importa Biblia RVR1960 completa si hay < 100 versículos en DB
 *  2. Bootstrap Nicolas del Rio si no hay contenido trainer activo
 *  3. Desactiva contenido piloto de tests (Prueba V1, etc.)
 *
 * Uso (en el servidor, con DATABASE_URL configurada):
 *   npm run db:prisma-deploy          # primero: tablas spiritual_*
 *   npm run spiritual:deploy-prod     # luego: datos
 *
 * Forzar re-import biblia: npm run spiritual:deploy-prod -- --force-bible
 * Forzar re-bootstrap:     npm run spiritual:deploy-prod -- --force-bootstrap
 */
const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const forceBible = process.argv.includes('--force-bible');
const forceBootstrap = process.argv.includes('--force-bootstrap');

async function main() {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    console.error('[spiritual:deploy] Configura DATABASE_URL en backend/.env');
    process.exit(1);
  }

  const { getPrisma } = require('../../backend/src/lib/prisma');
  const prisma = getPrisma();
  await prisma.$connect();

  const verseCount = await prisma.spiritualBibleVerse.count();
  const needBible = forceBible || verseCount < 100;
  console.log('[spiritual:deploy] Versículos en DB:', verseCount);

  if (needBible) {
    console.log('\n=== Import Biblia RVR1960 (descarga + PostgreSQL) ===');
    execSync('node scripts/spiritual/download_and_import_rvr1960.cjs', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
  } else {
    console.log('[spiritual:deploy] Biblia ya cargada — omitiendo import (usa --force-bible para repetir)');
  }

  const trainer = await prisma.trainer.findFirst({
    where: {
      OR: [
        { email: { contains: 'nicolasdelrio', mode: 'insensitive' } },
        { nombre: { contains: 'Nicolas', mode: 'insensitive' } },
      ],
    },
  });

  if (!trainer) {
    console.warn('[spiritual:deploy] Nicolas del Rio no encontrado.');
    console.warn('  Ejecuta antes: npm run seed:coach-nicolas');
  } else {
    const activeContent = await prisma.spiritualDevotionalPlan.count({
      where: { active: true, scopeType: 'trainer', scopeTrainerId: trainer.id },
    });
    const needBootstrap = forceBootstrap || activeContent === 0;

    if (needBootstrap) {
      console.log('\n=== Bootstrap contenido Nicolas del Rio ===');
      execSync('node scripts/spiritual/bootstrap_nicolas_del_rio.cjs', {
        cwd: path.join(__dirname, '../..'),
        stdio: 'inherit',
      });
    } else {
      console.log('[spiritual:deploy] Contenido trainer ya existe — omitiendo bootstrap (usa --force-bootstrap)');
    }
  }

  console.log('\n=== Desactivar contenido piloto de tests ===');
  execSync('node scripts/spiritual/deactivate_test_content.cjs', {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
  });

  const books = await prisma.spiritualBibleBook.count();
  const verses = await prisma.spiritualBibleVerse.count();
  const devotionals = await prisma.spiritualDevotionalPlan.count({ where: { active: true } });
  console.log('\n[spiritual:deploy] ✓ Listo');
  console.log('  Biblia:', books, 'libros ·', verses, 'versículos');
  console.log('  Devocionales activos:', devotionals);
  console.log('\nVerifica en admin: GET /api/spiritual/admin/bible/stats');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[spiritual:deploy] ERROR:', e.message || e);
  process.exit(1);
});
