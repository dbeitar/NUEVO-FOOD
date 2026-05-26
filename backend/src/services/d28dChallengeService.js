const platformAudit = require('./platformAuditService');
const communicationCenter = require('./communicationCenterService');
const challengeStore = require('../models/D28dChallengeStore');
const UserDatabase = require('../models/UserDatabase');
const { hasRole } = require('../utils/accessControl');

const ADMIN_ROLES = ['super_admin', 'admin_d28d'];

function isAdmin(user) {
  return hasRole(user, ADMIN_ROLES);
}

function enrichChallenge(c, { includeParticipants = false } = {}) {
  const entries = challengeStore.listEntries(c.id);
  const ranking = c.estado === 'published' ? challengeStore.getRanking(c.id) : [];
  const podium = c.estado === 'published' ? challengeStore.getPodium(c.id) : [];
  return {
    ...c,
    participants_count: entries.filter((e) => e.estado !== 'withdrawn').length,
    ranking: ranking.map((e, i) => ({
      position: i + 1,
      entry_id: e.id,
      user_id: e.user_id,
      user_name: UserDatabase.getById(e.user_id)?.nombre || `Usuario ${e.user_id}`,
      puntuacion: e.puntuacion,
    })),
    podium: podium.map((p) => {
      const entry = entries.find((e) => Number(e.id) === Number(p.entry_id));
      return {
        lugar: p.lugar,
        entry_id: p.entry_id,
        user_id: entry?.user_id,
        user_name: entry ? (UserDatabase.getById(entry.user_id)?.nombre || '') : '',
        puntuacion: entry?.puntuacion,
      };
    }),
    ...(includeParticipants ? {
      participants: entries.map((e) => ({
        ...e,
        user_name: UserDatabase.getById(e.user_id)?.nombre || '',
        evidences: challengeStore.listEvidences(e.id),
      })),
    } : {}),
  };
}

async function listChallenges(user, query = {}) {
  const admin = isAdmin(user);
  const programId = query.program_id || null;
  const list = challengeStore.list({ admin, programId });
  return list.map((c) => enrichChallenge(c));
}

async function getChallenge(user, id) {
  const c = challengeStore.getById(id);
  if (!c) return null;
  if (!isAdmin(user) && (!c.visible || !c.activo)) return null;
  return enrichChallenge(c, { includeParticipants: isAdmin(user) });
}

async function createChallenge(user, body) {
  const row = await challengeStore.create({
    nombre: body.nombre,
    descripcion: body.descripcion,
    objetivo: body.objetivo,
    premio: body.premio,
    imagen_url: body.imagen_url,
    program_id: body.program_id,
    cycle_id: body.cycle_id,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    reglas: body.reglas,
    cantidad_ganadores: body.cantidad_ganadores,
    creado_por_id: user.id,
  });
  await platformAudit.log(user.id, 'd28d', 'challenge.created', 'challenge', row.id);
  await communicationCenter.dispatchEvent({
    evento: 'd28d.challenge.created',
    modulo: 'd28d',
    userId: user.id,
    vars: { nombre: row.nombre, challenge_id: String(row.id) },
  }).catch(() => {});
  return enrichChallenge(row);
}

async function updateChallenge(user, id, body) {
  const updated = await challengeStore.update(id, body);
  if (!updated) return null;
  await platformAudit.log(user.id, 'd28d', 'challenge.updated', 'challenge', id, body);
  return enrichChallenge(updated);
}

async function duplicateChallenge(user, id) {
  const dup = await challengeStore.duplicate(id, user.id);
  if (!dup) return null;
  await platformAudit.log(user.id, 'd28d', 'challenge.duplicated', 'challenge', dup.id, { source_id: id });
  return enrichChallenge(dup);
}

async function setChallengeState(user, id, estado) {
  const patch = { estado };
  if (estado === 'published') patch.publicado_at = new Date().toISOString();
  const updated = await challengeStore.update(id, patch);
  if (!updated) return null;
  const eventMap = {
    active: 'd28d.challenge.started',
    closed: 'd28d.challenge.closed',
    published: 'd28d.challenge.published',
    cancelled: 'd28d.challenge.cancelled',
  };
  if (eventMap[estado]) {
    await communicationCenter.dispatchEvent({
      evento: eventMap[estado],
      modulo: 'd28d',
      userId: user.id,
      vars: { nombre: updated.nombre, challenge_id: String(id) },
    }).catch(() => {});
  }
  await platformAudit.log(user.id, 'd28d', `challenge.${estado}`, 'challenge', id);
  return enrichChallenge(updated);
}

async function enroll(user, challengeId) {
  const c = challengeStore.getById(challengeId);
  if (!c || c.estado !== 'active') return { error: 'Reto no disponible', status: 400 };
  const entry = await challengeStore.enroll(challengeId, user.id);
  if (entry.error) return entry;
  await platformAudit.log(user.id, 'd28d', 'challenge.enrolled', 'entry', entry.id);
  await communicationCenter.dispatchEvent({
    evento: 'd28d.challenge.participation',
    modulo: 'd28d',
    userId: user.id,
    vars: { nombre: c.nombre },
  }).catch(() => {});
  return entry;
}

async function withdraw(user, challengeId) {
  const entry = await challengeStore.withdraw(challengeId, user.id);
  if (entry?.error) return entry;
  await platformAudit.log(user.id, 'd28d', 'challenge.withdrawn', 'entry', entry?.id);
  return entry;
}

async function submitEvidence(user, challengeId, data) {
  const entry = challengeStore.getEntry(challengeId, user.id);
  if (!entry || entry.estado === 'withdrawn') return { error: 'Debes inscribirte primero', status: 400 };
  const ev = await challengeStore.addEvidence(entry.id, data);
  await platformAudit.log(user.id, 'd28d', 'challenge.evidence_submitted', 'evidence', ev.id);
  return ev;
}

async function updateEvidence(user, evidenceId, patch) {
  const result = challengeStore.updateEvidence(evidenceId, user.id, patch);
  if (result?.error) return result;
  await platformAudit.log(user.id, 'd28d', 'challenge.evidence_updated', 'evidence', evidenceId);
  return result;
}

async function scoreEntry(user, challengeId, entryId, puntuacion, comentario) {
  const entry = challengeStore.scoreEntry(entryId, puntuacion, comentario);
  if (!entry) return null;
  await platformAudit.log(user.id, 'd28d', 'challenge.scored', 'entry', entryId, { puntuacion });
  return entry;
}

async function setPodium(user, challengeId, places) {
  const podium = challengeStore.setPodium(challengeId, places);
  await platformAudit.log(user.id, 'd28d', 'challenge.podium_set', 'challenge', challengeId, places);
  await communicationCenter.dispatchEvent({
    evento: 'd28d.challenge.winner_selected',
    modulo: 'd28d',
    userId: user.id,
    vars: { challenge_id: String(challengeId) },
  }).catch(() => {});
  return podium;
}

module.exports = {
  isAdmin,
  listChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  duplicateChallenge,
  setChallengeState,
  enroll,
  withdraw,
  submitEvidence,
  updateEvidence,
  scoreEntry,
  setPodium,
};
