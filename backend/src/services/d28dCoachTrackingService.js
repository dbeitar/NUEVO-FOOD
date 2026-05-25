const routineRepo = require('../db/repositories/d28dRoutineRepository');
const TrainingLogStore = require('../models/TrainingLogStore');
const UserDatabase = require('../models/UserDatabase');
const { buildTrackingOverview, getAttendeeUserIds } = require('../utils/d28dCoachTracking');

async function getOverview(hostUser, query = {}) {
  const { start_date: startDate = null, end_date: endDate = null } = query;
  const overview = buildTrackingOverview(hostUser, {
    startDate: startDate || null,
    endDate: endDate || null,
  });
  const notes = await routineRepo.listHostNotesForHost({
    hostUserId: hostUser.id,
    liveClassIds: overview.class_ids,
  });
  return { ...overview, host_notes: notes };
}

function getTrainingLogsForHost(hostUser, { user_id: userId = null } = {}) {
  const allowed = getAttendeeUserIds(hostUser);
  let logs = TrainingLogStore.getAll().filter((l) => allowed.has(Number(l.user_id)));
  if (userId != null && userId !== '') {
    const uid = Number(userId);
    if (!allowed.has(uid)) return [];
    logs = logs.filter((l) => Number(l.user_id) === uid);
  }
  return logs
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    .map((l) => {
      const u = UserDatabase.getById(l.user_id);
      return {
        ...l,
        user_name: u ? u.nombre : 'Usuario desconocido',
      };
    });
}

module.exports = {
  getOverview,
  getTrainingLogsForHost,
};
