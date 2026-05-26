/**
 * Utilidades para el rol entrenador_d28d (host operativo D28D).
 * Filtra clases asignadas por campo `coach` (nombre o prefijo de email).
 */

function normalizeCoachKey(value) {
  return String(value || '').trim().toLowerCase();
}

function coachKeysForUser(user) {
  if (!user) return [];
  const keys = new Set();
  const name = normalizeCoachKey(user.nombre);
  const email = normalizeCoachKey(user.email);
  if (name) keys.add(name);
  if (email) {
    keys.add(email);
    const local = email.split('@')[0];
    if (local) keys.add(local);
  }
  return Array.from(keys);
}

function classCoachKey(classItem) {
  return normalizeCoachKey(classItem?.coach);
}

function isD28dOperationalClass(classItem) {
  if (!classItem) return false;
  return classItem.source_module === 'd28d' || classItem.locked === true || classItem.is_global === true;
}

function isClassAssignedToHost(classItem, user) {
  if (!classItem || !user) return false;
  if (!isD28dOperationalClass(classItem)) return false;
  if (classItem.d28d_host_user_id != null && Number(classItem.d28d_host_user_id) === Number(user.id)) {
    return true;
  }
  const coachKey = classCoachKey(classItem);
  if (!coachKey) return false;
  const keys = coachKeysForUser(user);
  return keys.some((k) => coachKey === k || coachKey.includes(k) || k.includes(coachKey));
}

function filterClassesForD28dHost(classes, user) {
  return (Array.isArray(classes) ? classes : []).filter(
    (item) => isD28dOperationalClass(item) && isClassAssignedToHost(item, user),
  );
}

module.exports = {
  coachKeysForUser,
  isClassAssignedToHost,
  isD28dOperationalClass,
  filterClassesForD28dHost,
};
