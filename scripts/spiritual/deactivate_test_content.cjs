#!/usr/bin/env node
/**
 * Desactiva contenido piloto creado por test_spiritual_v1.sh (Prueba V1, etc.)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

async function main() {
  const { getPrisma } = require('../../backend/src/lib/prisma');
  const prisma = getPrisma();
  await prisma.$connect();

  const verses = await prisma.spiritualVerseOfDay.updateMany({
    where: {
      OR: [
        { customText: { contains: 'Prueba V1' } },
        { reflection: { contains: 'Reflexión piloto' } },
      ],
      scopeType: 'global',
    },
    data: { published: false },
  });

  const devotionals = await prisma.spiritualDevotionalPlan.updateMany({
    where: {
      OR: [
        { title: { contains: 'V1 Test' } },
        { title: { contains: 'Devocional V1' } },
      ],
      scopeType: 'global',
    },
    data: { active: false },
  });

  const events = await prisma.spiritualEvent.updateMany({
    where: {
      title: { contains: 'Evento V1' },
      scopeType: 'global',
    },
    data: { active: false },
  });

  console.log('[deactivate] Versículos piloto:', verses.count);
  console.log('[deactivate] Devocionales piloto:', devotionals.count);
  console.log('[deactivate] Eventos piloto:', events.count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
