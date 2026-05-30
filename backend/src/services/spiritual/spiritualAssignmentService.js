const { getUserGymId, getUserTrainerId, isSuperAdmin } = require('../../utils/tenantScope');

function matchesScope(row, user) {
  if (isSuperAdmin(user)) return true;
  const scope = String(row.scopeType || row.scope_type || 'global').toLowerCase();
  if (scope === 'global') return true;
  if (scope === 'gym') {
    const gymId = getUserGymId(user);
    const target = row.scopeGymId ?? row.scope_gym_id;
    return gymId != null && Number(gymId) === Number(target);
  }
  if (scope === 'trainer') {
    const trainerId = getUserTrainerId(user);
    const target = row.scopeTrainerId ?? row.scope_trainer_id;
    return trainerId != null && Number(trainerId) === Number(target);
  }
  return false;
}

function filterByScope(rows, user) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => matchesScope(row, user));
}

function pickBest(rows, user) {
  const scoped = filterByScope(rows, user);
  if (!scoped.length) return null;
  const priority = { trainer: 3, gym: 2, global: 1 };
  return scoped.sort((a, b) => {
    const sa = priority[String(a.scopeType || a.scope_type || 'global').toLowerCase()] || 0;
    const sb = priority[String(b.scopeType || b.scope_type || 'global').toLowerCase()] || 0;
    return sb - sa;
  })[0];
}

module.exports = { matchesScope, filterByScope, pickBest };
