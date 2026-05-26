const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');

function normalizeInviteCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

function isValidInviteCode(code) {
  return code.length >= 3 && code.length <= 64 && /^[A-Z0-9][A-Z0-9_-]*$/.test(code);
}

/**
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function assertInviteCodeAvailable({ code, excludeGymId = null, excludeTrainerId = null }) {
  const normalized = normalizeInviteCode(code);
  if (!isValidInviteCode(normalized)) {
    return { ok: false, error: 'Código inválido (3–64 caracteres, letras, números, guión)' };
  }

  const gymConflict = GymDatabase.getAll().find(
    (g) => String(g.invite_code || '').toUpperCase() === normalized
      && String(g.id) !== String(excludeGymId ?? ''),
  );
  if (gymConflict) {
    return { ok: false, error: `Código ya usado por el gimnasio "${gymConflict.nombre}"` };
  }

  const trainerConflict = TrainersDatabase.getAll().find(
    (t) => String(t.invite_code || '').toUpperCase() === normalized
      && String(t.id) !== String(excludeTrainerId ?? ''),
  );
  if (trainerConflict) {
    return { ok: false, error: `Código ya usado por el entrenador "${trainerConflict.nombre}"` };
  }

  return { ok: true, code: normalized };
}

function suggestGymInviteCode(id, nombre) {
  const slug = String(nombre || 'GYM')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toUpperCase()
    .slice(0, 12) || 'GYM';
  return `GYM-${slug}-${String(id).padStart(3, '0')}`;
}

function suggestTrainerInviteCode(id, nombre) {
  const slug = String(nombre || 'COACH')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toUpperCase()
    .slice(0, 10) || 'COACH';
  return `COACH-${slug}-${String(id).padStart(3, '0')}`;
}

function getD28dInviteCodes() {
  return String(process.env.D28D_INVITE_CODE || 'D28D,D28D-PILOTO,D28D-PILOTO-2026')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

module.exports = {
  normalizeInviteCode,
  isValidInviteCode,
  assertInviteCodeAvailable,
  suggestGymInviteCode,
  suggestTrainerInviteCode,
  getD28dInviteCodes,
};
