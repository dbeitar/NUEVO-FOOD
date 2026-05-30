#!/usr/bin/env node
/**
 * Bootstrap espiritual para comunidad Nicolas del Rio.
 * Uso: node scripts/spiritual/bootstrap_nicolas_del_rio.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

async function main() {
  const { getPrisma } = require('../../backend/src/lib/prisma');
  const spiritualAi = require('../../backend/src/services/spiritual/spiritualAiService');
  const spiritual = require('../../backend/src/services/spiritual/spiritualService');
  const { importBibleFromJson } = require('../../backend/src/services/spiritual/bibleImportService');

  await getPrisma().$connect();

  let trainer = await spiritualAi.findNicolasTrainer();
  if (!trainer) {
    console.error('[bootstrap] Nicolas del Rio no encontrado. Ejecuta primero: npm run seed:coach-nicolas');
    process.exit(1);
  }
  console.log('[bootstrap] Entrenador:', trainer.id, trainer.nombre, trainer.email);

  const verseCount = await getPrisma().spiritualBibleVerse.count();
  if (verseCount < 100) {
    const sample = path.join(__dirname, '../../backend/data/spiritual/sample_bible_rvr1960.example.json');
    console.log('[bootstrap] Importando biblia sample...');
    const imp = await importBibleFromJson({ filePath: sample });
    console.log('[bootstrap] Versículos importados:', imp.imported);
  } else {
    console.log('[bootstrap] Biblia ya tiene', verseCount, 'versículos');
  }

  const superUserId = 1;
  const scope = { scope_type: 'trainer', scope_trainer_id: trainer.id };

  const verseGen = await spiritualAi.generateVerseOfDay({ theme: 'enseñanzas de Jesús · comunidad Nicolas del Rio' });
  const verse = await spiritual.adminSaveVerseOfDay(superUserId, {
    scheduled_date: new Date().toISOString().slice(0, 10),
    verse_id: verseGen.verse_id,
    custom_text: verseGen.custom_text,
    reflection: verseGen.reflection,
    published: true,
    ...scope,
  });
  console.log('[bootstrap] Versículo del día id=', verse.id, verseGen.ai ? '(IA)' : '(fallback)');

  const devGen = await spiritualAi.generateDevotionalPlan({
    durationDays: 7,
    title: 'Comunidad Nicolas del Rio · 7 días con Jesús',
    theme: 'formación espiritual integrada al bienestar',
  });
  const dev = await spiritual.adminSaveDevotional(superUserId, {
    title: devGen.title,
    duration_days: devGen.duration_days,
    description: devGen.description,
    days: devGen.days,
    ...scope,
  });
  console.log('[bootstrap] Devocional 7 días id=', dev.id, devGen.ai ? '(IA)' : '(fallback)');

  const studyGen = await spiritualAi.generateStudy({ topic: 'Las bienaventuranzas y la transformación interior' });
  const cat = await spiritual.adminSaveCategory('Formación espiritual');
  const author = await spiritual.adminSaveAuthor('Nicolas del Rio · Comunidad');
  const study = await spiritual.adminSaveStudy(superUserId, {
    title: studyGen.title,
    description: studyGen.content_text || studyGen.description,
    media_type: 'text',
    media_url: 'inline',
    category_id: cat.id,
    author_id: author.id,
    tags: studyGen.tags,
    ...scope,
  });
  console.log('[bootstrap] Estudio id=', study.id, studyGen.ai ? '(IA)' : '(fallback)');

  console.log('\n[bootstrap] Listo. Clientes con trainer_id=', trainer.id, 'verán contenido en «Hoy».');
  process.exit(0);
}

main().catch((e) => {
  console.error('[bootstrap] ERROR:', e.message);
  process.exit(1);
});
