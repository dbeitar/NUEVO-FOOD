/**
 * Alcance de clases en vivo D28D vs gimnasios marca blanca.
 * Los gimnasios consumen plantillas D28D (source_module=d28d), no módulo gym independiente.
 */
const { hasRole } = require('./accessControl');
const { isPlatformAdmin, getUserGymId, isGymAdmin } = require('./tenantScope');

function isD28dLiveClass(classItem) {
  if (!classItem) return false;
  return classItem.source_module === 'd28d' || classItem.locked === true;
}

/** Usuario final / staff de gym: solo clases D28D globales o asignadas a su gym. */
function canUserAccessD28dLiveClass(classItem, user) {
  if (!classItem?.active) return false;
  if (!isD28dLiveClass(classItem)) return false;
  if (isPlatformAdmin(user)) return true;
  const userGym = getUserGymId(user);
  if (classItem.gym_id === null || classItem.gym_id === undefined) return true;
  if (userGym == null) return false;
  return String(userGym) === String(classItem.gym_id);
}

function filterConsumerLiveClasses(classes, user) {
  return (classes || []).filter((item) => canUserAccessD28dLiveClass(item, user));
}

/** Admin de gym: clases y asistencia acotadas a su sede. */
function filterAdminLiveClasses(classes, user) {
  if (isPlatformAdmin(user) || hasRole(user, ['super_admin'])) {
    return classes || [];
  }
  const userGym = getUserGymId(user);
  if (!isGymAdmin(user) || userGym == null) {
    return filterConsumerLiveClasses(classes, user);
  }
  return (classes || []).filter((item) => {
    if (!isD28dLiveClass(item)) return false;
    if (item.gym_id === null || item.gym_id === undefined) return true;
    return String(item.gym_id) === String(userGym);
  });
}

function filterAttendanceReport(rows, user) {
  const userGym = getUserGymId(user);
  if (isPlatformAdmin(user) || hasRole(user, ['super_admin']) || userGym == null) {
    return rows || [];
  }
  return (rows || [])
    .map((row) => {
      const attendees = (row.by_gym || []).find(
        (g) => g.gym_id != null && String(g.gym_id) === String(userGym),
      );
      const flatAttendees = attendees?.attendees || [];
      return {
        ...row,
        total_attendees: flatAttendees.length,
        by_gym: attendees ? [attendees] : [],
        scope_gym: true,
      };
    })
    .filter((row) => row.total_attendees > 0 || (row.gym_id != null && String(row.gym_id) === String(userGym)));
}

module.exports = {
  isD28dLiveClass,
  canUserAccessD28dLiveClass,
  filterConsumerLiveClasses,
  filterAdminLiveClasses,
  filterAttendanceReport,
};
