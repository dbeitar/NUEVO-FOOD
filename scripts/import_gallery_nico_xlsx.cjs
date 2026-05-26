#!/usr/bin/env node
/**
 * Carga masiva galería TRAINING desde SOLO BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx
 * Uso:
 *   node scripts/import_gallery_nico_xlsx.cjs --preview
 *   node scripts/import_gallery_nico_xlsx.cjs --apply
 *   node scripts/import_gallery_nico_xlsx.cjs --apply --file /ruta/archivo.xlsx
 */
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const COACH_EMAIL = process.env.SEED_COACH_EMAIL || 'nicolasdelrio@foodplan.local';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const preview = args.includes('--preview') || !apply;
  const fileIdx = args.indexOf('--file');
  const customFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  const { resolveExcelPath, parseGalleryWorkbook } = require('../backend/src/utils/galleryXlsxImport');
  const filePath = resolveExcelPath(customFile);

  if (!filePath) {
    console.error('ERROR: No se encontró SOLO BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx en Downloads/Descargas.');
    process.exit(1);
  }

  const stat = require('fs').statSync(filePath);
  console.log('Archivo:', filePath);
  console.log('Modificado:', stat.mtime.toISOString());
  console.log('Tamaño:', stat.size, 'bytes');

  const parsed = parseGalleryWorkbook(filePath);
  if (!parsed.exercises.length) {
    console.error('ERROR: El archivo no contiene ejercicios válidos.');
    process.exit(1);
  }

  console.log('\nHojas:', parsed.sheetNames.join(', '));
  console.log('Filas detectadas (raw):', parsed.stats?.raw_rows ?? '—');
  console.log('Ejercicios únicos:', parsed.exercises.length);
  console.log('Con URL:', parsed.stats?.with_url ?? parsed.exercises.filter((e) => e.video_url).length);
  console.log('Sin URL:', parsed.stats?.without_url ?? parsed.exercises.filter((e) => !e.video_url).length);
  console.log('Secciones:', parsed.sections?.length ?? 0);
  console.log('Categorías:', parsed.categories.length);
  if (parsed.stats?.without_url > 0) {
    console.log('\nSin enlace en Excel (se importan igual):');
    parsed.exercises.filter((e) => !e.video_url).forEach((e) => console.log(' -', e.exercise_name));
  }

  console.log('\n--- Muestra previa (primeros 15) ---');
  console.log('| Ejercicio | Grupo muscular | URL |');
  console.log('|-----------|----------------|-----|');
  for (const ex of parsed.exercises.slice(0, 15)) {
    const url = ex.video_url ? ex.video_url.slice(0, 48) + (ex.video_url.length > 48 ? '…' : '') : '—';
    console.log(`| ${ex.exercise_name} | ${ex.muscle_group} | ${url} |`);
  }

  if (!apply) {
    console.log('\nModo preview. Ejecuta con --apply para importar.');
    process.exit(0);
  }

  const userDB = require('../backend/src/models/UserDatabase');
  const TrainersDatabase = require('../backend/src/models/TrainersDatabase');
  const ExercisesGalleryStore = require('../backend/src/models/ExercisesGalleryStore');
  const { trainerIdFromEmail } = require('../backend/src/utils/coachScope');

  await userDB.hydrate?.();
  await TrainersDatabase.hydrate?.();
  await ExercisesGalleryStore.hydrate?.();

  let trainerId = trainerIdFromEmail(COACH_EMAIL);
  if (trainerId == null) {
    const coachUser = userDB.getByEmail(COACH_EMAIL);
    trainerId = coachUser?.trainer_id ?? null;
  }
  if (trainerId == null) {
    console.error('ERROR: No se encontró trainer_id para', COACH_EMAIL, '— ejecuta npm run seed:coach-nicolas');
    process.exit(1);
  }

  const report = {
    found: parsed.exercises.length,
    urls: parsed.exercises.filter((e) => e.video_url).length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [...parsed.errors],
    categories: parsed.categories.length,
  };

  for (const ex of parsed.exercises) {
    try {
      const result = ExercisesGalleryStore.upsert({
        name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        youtube_url: ex.video_url,
        notes: ex.notes,
        trainer_id: trainerId,
        is_global: false,
        created_by: COACH_EMAIL,
      });
      if (result.action === 'created') report.created += 1;
      else if (result.action === 'updated') report.updated += 1;
      else report.skipped += 1;
    } catch (e) {
      report.errors.push({ type: 'import', exercise_name: ex.exercise_name, message: e.message });
    }
  }

  await ExercisesGalleryStore.hydrate?.();

  console.log('\n--- Reporte posterior ---');
  console.log('Total ejercicios en Excel:', report.found);
  console.log('Total URLs en Excel:', report.urls);
  console.log('Registros creados:', report.created);
  console.log('Registros actualizados:', report.updated);
  console.log('Duplicados evitados / sin cambios:', report.skipped);
  console.log('Errores:', report.errors.length);
  console.log('Categorías detectadas:', report.categories);
  console.log('Galería coach (trainer_id=%s):', trainerId, ExercisesGalleryStore.getAll().filter((r) => Number(r.trainer_id) === Number(trainerId)).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
