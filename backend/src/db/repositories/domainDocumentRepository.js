const { getPrisma } = require('../../lib/prisma');

/** Colecciones almacenadas como un documento JSON (array u objeto). */
const COLLECTIONS = [
  'training_plans',
  'training_log',
  'daily_food_logs',
  'exercises_gallery',
  'fitness_tests',
  'trainer_masters',
  'ecosystem_modules',
  'coach_notifications',
  'body_measurements',
];

async function getPayload(collection, docKey = 'default') {
  const row = await getPrisma().domainDocument.findUnique({
    where: { collection_docKey: { collection, docKey } },
  });
  return row?.payload ?? null;
}

async function setPayload(collection, payload, docKey = 'default') {
  await getPrisma().domainDocument.upsert({
    where: { collection_docKey: { collection, docKey } },
    create: { collection, docKey, payload },
    update: { payload },
  });
}

async function getArray(collection) {
  const p = await getPayload(collection);
  return Array.isArray(p) ? p : [];
}

async function setArray(collection, arr) {
  await setPayload(collection, arr);
}

module.exports = {
  COLLECTIONS,
  getPayload,
  setPayload,
  getArray,
  setArray,
};
