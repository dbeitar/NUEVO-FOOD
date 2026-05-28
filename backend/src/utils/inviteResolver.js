const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const { useRelationalStorage } = require('./storageMode');

const D28D_CODES = new Set(
  String(process.env.D28D_INVITE_CODE || 'D28D,D28D-PILOTO,D28D-PILOTO-2026')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

/** Presets de módulos según tipo de invitación (claves usadas por userServices). */
const MODULE_PRESETS = {
  trainer: {
    gym: false,
    d28d: false,
    training: true,
    nutrition: true,
    food_plan: true,
    live_classes: false,
  },
  gym: {
    gym: true,
    d28d: true,
    training: false,
    nutrition: false,
    food_plan: false,
    live_classes: true,
  },
  d28d: {
    d28d: true,
    training: true,
    nutrition: true,
    food_plan: true,
    live_classes: true,
  },
};

const PLAN_SCOPES = {
  trainer: (plan) => {
    const name = String(plan.nombre || '').toLowerCase();
    const pid = String(plan.program_id || '').toLowerCase();
    return pid === 'virtual_d28d' || pid === 'vital' || name.includes('virtual') || name.includes('vital');
  },
  gym: (plan) => {
    const pid = String(plan.program_id || '').toLowerCase();
    return ['virtual_d28d', 'pancitas', 'vital'].includes(pid);
  },
  d28d: (plan) => {
    const pid = String(plan.program_id || '').toLowerCase();
    return ['virtual_d28d', 'pancitas', 'vital'].includes(pid) || String(plan.nombre || '').toLowerCase().includes('d28d');
  },
};

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

async function findProgramInviteCodeAsync(code) {
  if (!useRelationalStorage()) return null;
  const { getPrisma } = require('../lib/prisma');
  const row = await getPrisma().programInviteCode.findFirst({
    where: { code, active: true },
  });
  if (!row) return null;
  return {
    code: row.code,
    program_id: row.programId,
    label: row.label || null,
    suggested_plan_nombre: row.suggestedPlanNombre || null,
    module_preset: row.modulePreset || {},
  };
}

async function findCoupleInviteAsync(code) {
  if (!useRelationalStorage()) return null;
  const { getPrisma } = require('../lib/prisma');
  const prisma = getPrisma();
  const acc = await prisma.userAccount.findFirst({
    where: {
      coupleInviteCode: code,
      activo: true,
      coupleInviteUsedByUserId: null,
    },
  });
  if (!acc) return null;
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { nombre: acc.planNombre },
  });
  return {
    primary_account_id: acc.id,
    plan_nombre: acc.planNombre,
    program_id: plan?.programId || 'virtual_d28d',
    module_access: plan?.moduleAccess || {},
    gym_id: acc.gymId || null,
    trainer_id: acc.trainerId || null,
    cycle_id: acc.cycleId || null,
  };
}

async function findGymByCodeAsync(code) {
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const row = await getPrisma().gym.findFirst({
      where: { inviteCode: code, activo: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre,
      brand_slug: row.brandSlug,
      invite_code: row.inviteCode,
    };
  }
  const gyms = GymDatabase.getAll();
  return gyms.find((g) => normalizeCode(g.invite_code) === code) || null;
}

function findGymByCode(code) {
  const gyms = GymDatabase.getAll();
  return gyms.find((g) => normalizeCode(g.invite_code) === code) || null;
}

async function findTrainerByCodeAsync(code) {
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const row = await getPrisma().trainer.findFirst({
      where: { inviteCode: code, activo: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre,
      gym_id: row.gymId,
      invite_code: row.inviteCode,
    };
  }
  const trainers = TrainersDatabase.getAll();
  return trainers.find((t) => normalizeCode(t.invite_code) === code) || null;
}

function findTrainerByCode(code) {
  const trainers = TrainersDatabase.getAll();
  return trainers.find((t) => normalizeCode(t.invite_code) === code) || null;
}

/**
 * Resuelve un código de invitación (entrenador, gimnasio o D28D).
 * @returns {{ ok: true, data } | { ok: false, status, error }}
 */
async function resolveInviteCodeAsync(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code || code.length < 3) {
    return { ok: false, status: 400, error: 'Ingresa un código válido (mínimo 3 caracteres)' };
  }

  // 0) Invitación de pareja: el 2º usuario hereda plan/programa del titular
  const couple = await findCoupleInviteAsync(code);
  if (couple) {
    const module_access = {
      ...(couple.module_access && typeof couple.module_access === 'object' ? couple.module_access : {}),
      d28d_program: couple.program_id,
    };
    if (typeof module_access.d28d === 'undefined') module_access.d28d = true;
    return {
      ok: true,
      data: {
        type: 'couple',
        label: 'Invitación — Plan de pareja',
        program_id: couple.program_id,
        gym_id: couple.gym_id,
        trainer_id: couple.trainer_id,
        cycle_id: couple.cycle_id,
        module_access,
        plan_scope: 'd28d',
        suggested_plan: couple.plan_nombre,
        couple_code: code,
        primary_account_id: couple.primary_account_id,
      },
    };
  }

  // 0) Código por programa (nuevo): asigna programa y preset de módulos
  const program = await findProgramInviteCodeAsync(code);
  if (program) {
    const preset = (program.module_preset && typeof program.module_preset === 'object')
      ? program.module_preset
      : {};
    const module_access = { ...preset, d28d_program: program.program_id };
    if (typeof module_access.d28d === 'undefined') module_access.d28d = true;
    return {
      ok: true,
      data: {
        type: 'program',
        label: program.label || `Programa: ${program.program_id}`,
        program_id: program.program_id,
        gym_id: null,
        trainer_id: null,
        module_access,
        plan_scope: 'd28d',
        suggested_plan: program.suggested_plan_nombre,
      },
    };
  }

  if (D28D_CODES.has(code)) {
    return {
      ok: true,
      data: {
        type: 'd28d',
        label: 'Código D28D — programas y plan de alimentación',
        gym_id: null,
        trainer_id: null,
        module_access: { ...MODULE_PRESETS.d28d },
        plan_scope: 'd28d',
      },
    };
  }

  const trainer = await findTrainerByCodeAsync(code);
  if (trainer) {
    return {
      ok: true,
      data: {
        type: 'trainer',
        label: `Entrenador: ${trainer.nombre}`,
        gym_id: trainer.gym_id || null,
        trainer_id: trainer.id,
        module_access: { ...MODULE_PRESETS.trainer },
        plan_scope: 'trainer',
      },
    };
  }

  const gym = await findGymByCodeAsync(code);
  if (gym) {
    return {
      ok: true,
      data: {
        type: 'gym',
        label: `Gimnasio: ${gym.nombre}`,
        gym_id: gym.id,
        trainer_id: null,
        module_access: { ...MODULE_PRESETS.gym },
        plan_scope: 'gym',
      },
    };
  }

  return {
    ok: false,
    status: 404,
    error: 'Código no reconocido. Verifica con tu entrenador, gimnasio o el equipo D28D.',
  };
}

function resolveInviteCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code || code.length < 3) {
    return { ok: false, status: 400, error: 'Ingresa un código válido (mínimo 3 caracteres)' };
  }

  if (D28D_CODES.has(code)) {
    return {
      ok: true,
      data: {
        type: 'd28d',
        label: 'Código D28D — programas y plan de alimentación',
        gym_id: null,
        trainer_id: null,
        module_access: { ...MODULE_PRESETS.d28d },
        plan_scope: 'd28d',
      },
    };
  }

  const trainer = findTrainerByCode(code);
  if (trainer) {
    return {
      ok: true,
      data: {
        type: 'trainer',
        label: `Entrenador: ${trainer.nombre}`,
        gym_id: trainer.gym_id || null,
        trainer_id: trainer.id,
        module_access: { ...MODULE_PRESETS.trainer },
        plan_scope: 'trainer',
      },
    };
  }

  const gym = findGymByCode(code);
  if (gym) {
    const isD28dGym = gym.brand_slug === 'd28d-marca-blanca' || String(gym.nombre || '').toLowerCase().includes('d28d');
    return {
      ok: true,
      data: {
        type: isD28dGym ? 'gym' : 'gym',
        label: `Gimnasio: ${gym.nombre}`,
        gym_id: gym.id,
        trainer_id: null,
        module_access: { ...MODULE_PRESETS.gym },
        plan_scope: 'gym',
      },
    };
  }

  return {
    ok: false,
    status: 404,
    error: 'Código no reconocido. Verifica con tu entrenador, gimnasio o el equipo D28D.',
  };
}

function filterPlansByScope(plans, scope) {
  const fn = PLAN_SCOPES[scope];
  if (!fn) return plans;
  const filtered = (plans || []).filter(fn);
  return filtered.length > 0 ? filtered : plans;
}

module.exports = {
  resolveInviteCode,
  resolveInviteCodeAsync,
  filterPlansByScope,
  MODULE_PRESETS,
};
