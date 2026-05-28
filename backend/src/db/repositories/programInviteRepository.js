const { getPrisma } = require('../../lib/prisma');

function toLegacy(row) {
  return {
    code: row.code,
    program_id: row.programId,
    label: row.label || '',
    suggested_plan_nombre: row.suggestedPlanNombre || '',
    module_preset: row.modulePreset || {},
    active: !!row.active,
    created_at: row.createdAt,
  };
}

const DEFAULT_INVITES = [
  {
    code: 'VIRTUAL-INVITE',
    program_id: 'virtual_d28d',
    label: 'Registro Virtual D28D',
    suggested_plan_nombre: 'D28D Virtual - Básico',
    module_preset: { d28d: true, live_classes: true, d28d_program: 'virtual_d28d' },
  },
  {
    code: 'VITAL-INVITE',
    program_id: 'vital',
    label: 'Registro Vital',
    suggested_plan_nombre: 'D28D Vital - Bienestar',
    module_preset: { d28d: true, live_classes: true, d28d_program: 'vital' },
  },
  {
    code: 'PANCITAS-INVITE',
    program_id: 'pancitas',
    label: 'Registro Pancitas',
    suggested_plan_nombre: 'Pancitas Fit - Gestación',
    module_preset: { d28d: true, live_classes: true, d28d_program: 'pancitas' },
  },
];

async function list({ programId = null, activeOnly = false } = {}) {
  const where = {};
  if (programId) where.programId = String(programId);
  if (activeOnly) where.active = true;
  const rows = await getPrisma().programInviteCode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toLegacy);
}

async function create(invite) {
  const code = String(invite.code || '').trim().toUpperCase();
  if (!code) throw new Error('code requerido');
  const row = await getPrisma().programInviteCode.create({
    data: {
      code,
      programId: String(invite.program_id || 'virtual_d28d'),
      label: invite.label || null,
      suggestedPlanNombre: invite.suggested_plan_nombre || null,
      modulePreset: invite.module_preset && typeof invite.module_preset === 'object'
        ? invite.module_preset
        : {},
      active: invite.active !== false,
    },
  });
  return toLegacy(row);
}

async function update(code, updates) {
  const data = {};
  if (updates.program_id !== undefined) data.programId = String(updates.program_id);
  if (updates.label !== undefined) data.label = updates.label || null;
  if (updates.suggested_plan_nombre !== undefined) {
    data.suggestedPlanNombre = updates.suggested_plan_nombre || null;
  }
  if (updates.module_preset !== undefined) {
    data.modulePreset = updates.module_preset && typeof updates.module_preset === 'object'
      ? updates.module_preset
      : {};
  }
  if (updates.active !== undefined) data.active = !!updates.active;
  const row = await getPrisma().programInviteCode.update({
    where: { code: String(code).toUpperCase() },
    data,
  });
  return toLegacy(row);
}

async function remove(code) {
  await getPrisma().programInviteCode.delete({
    where: { code: String(code).toUpperCase() },
  });
  return true;
}

async function seedDefaultsIfEmpty() {
  const count = await getPrisma().programInviteCode.count();
  if (count > 0) return 0;
  for (const inv of DEFAULT_INVITES) {
    await create(inv);
  }
  return DEFAULT_INVITES.length;
}

module.exports = {
  list,
  create,
  update,
  remove,
  seedDefaultsIfEmpty,
  toLegacy,
};
