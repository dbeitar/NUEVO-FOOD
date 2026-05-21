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
    d28d: false,
    training: true,
    nutrition: true,
    food_plan: true,
    live_classes: true,
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
