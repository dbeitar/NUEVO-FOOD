const { getPrisma } = require('../../lib/prisma');
const { toLegacy, toPrisma } = require('../mappers/userMapper');

async function findAllLegacy() {
  const rows = await getPrisma().user.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toLegacy);
}

async function findByEmail(email) {
  const row = await getPrisma().user.findUnique({ where: { email } });
  return toLegacy(row);
}

async function findById(id) {
  const row = await getPrisma().user.findUnique({ where: { id: Number(id) } });
  return toLegacy(row);
}

async function createLegacy(legacy) {
  const data = toPrisma(legacy);
  const row = await getPrisma().user.create({ data });
  return toLegacy(row);
}

async function updateLegacy(id, updates) {
  const existing = await findById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, id: Number(id) };
  const data = toPrisma(merged);
  const row = await getPrisma().user.update({
    where: { id: Number(id) },
    data,
  });
  return toLegacy(row);
}

async function deleteSoft(id) {
  await getPrisma().user.update({
    where: { id: Number(id) },
    data: { activo: false },
  });
  return true;
}

module.exports = {
  findAllLegacy,
  findByEmail,
  findById,
  createLegacy,
  updateLegacy,
  deleteSoft,
};
