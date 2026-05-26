const { getPrisma } = require('../../lib/prisma');

function toLegacy(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    label: row.label || '',
  };
}

async function findAllLegacy() {
  const rows = await getPrisma().cycle.findMany({ orderBy: { startDate: 'asc' } });
  return rows.map(toLegacy);
}

async function upsertLegacy(cycle) {
  const row = await getPrisma().cycle.upsert({
    where: { id: cycle.id },
    create: {
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate,
      label: cycle.label || '',
    },
    update: {
      name: cycle.name,
      startDate: cycle.startDate,
      label: cycle.label || '',
    },
  });
  return toLegacy(row);
}

async function deleteById(id) {
  await getPrisma().cycle.delete({ where: { id: Number(id) } });
  return true;
}

module.exports = { findAllLegacy, upsertLegacy, deleteById, toLegacy };
