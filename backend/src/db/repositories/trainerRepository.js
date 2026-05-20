const { getPrisma } = require('../../lib/prisma');
const { toLegacy, toPrisma } = require('../mappers/trainerMapper');

async function findAllLegacy() {
  const rows = await getPrisma().trainer.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toLegacy);
}

async function createLegacy(legacy) {
  const row = await getPrisma().trainer.create({ data: toPrisma(legacy) });
  return toLegacy(row);
}

async function updateLegacy(id, updates) {
  const existing = await getPrisma().trainer.findUnique({ where: { id: Number(id) } });
  if (!existing) return null;
  const merged = toLegacy({ ...existing, ...updates, id: Number(id) });
  const row = await getPrisma().trainer.update({
    where: { id: Number(id) },
    data: toPrisma(merged),
  });
  return toLegacy(row);
}

async function deleteSoft(id) {
  await getPrisma().trainer.update({
    where: { id: Number(id) },
    data: { activo: false },
  });
  return true;
}

module.exports = { findAllLegacy, createLegacy, updateLegacy, deleteSoft };
