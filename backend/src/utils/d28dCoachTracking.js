/**
 * Seguimiento de usuarios para entrenador_d28d (hosts de clases D28D).
 * Alcance: asistentes a clases donde el host está asignado (d28d_host_user_id / coach).
 */
const LiveClassDatabase = require('../models/LiveClassDatabase');
const UserDatabase = require('../models/UserDatabase');
const { filterClassesForD28dHost } = require('./d28dHostUtils');

function getHostClasses(hostUser) {
  return filterClassesForD28dHost(LiveClassDatabase.getAll(), hostUser);
}

function getAttendeeUserIds(hostUser) {
  const ids = new Set();
  for (const cls of getHostClasses(hostUser)) {
    for (const uid of cls.attendance_user_ids || []) {
      if (uid != null) ids.add(Number(uid));
    }
    for (const ev of cls.attendance_events || []) {
      if (ev?.user_id != null) ids.add(Number(ev.user_id));
    }
  }
  return ids;
}

function canD28dHostAccessUser(hostUser, targetUserId) {
  if (!hostUser || targetUserId == null) return false;
  return getAttendeeUserIds(hostUser).has(Number(targetUserId));
}

function parseDateOnly(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function inDateRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function buildTrackingOverview(hostUser, { startDate = null, endDate = null } = {}) {
  const classes = getHostClasses(hostUser);
  const classById = new Map(classes.map((c) => [Number(c.id), c]));
  const userMap = new Map();
  const sessions = [];

  for (const cls of classes) {
    const classId = Number(cls.id);
    const events = Array.isArray(cls.attendance_events) ? cls.attendance_events : [];
    if (events.length > 0) {
      for (const ev of events) {
        const uid = Number(ev.user_id);
        if (!uid) continue;
        const joinedAt = ev.joined_at || cls.start_time || null;
        const dateKey = parseDateOnly(joinedAt);
        if (startDate || endDate) {
          if (!inDateRange(dateKey, startDate, endDate)) continue;
        }
        sessions.push({
          user_id: uid,
          class_id: classId,
          class_title: cls.title,
          joined_at: joinedAt,
          date: dateKey,
        });
        if (!userMap.has(uid)) {
          const u = UserDatabase.getById(uid);
          userMap.set(uid, {
            user_id: uid,
            nombre: u?.nombre || `Usuario ${uid}`,
            email: u?.email || '',
            program_id: u?.program_id || u?.module_access?.d28d_program || null,
            classes_attended: 0,
            last_attendance: null,
          });
        }
        const row = userMap.get(uid);
        row.classes_attended += 1;
        if (!row.last_attendance || (joinedAt && joinedAt > row.last_attendance)) {
          row.last_attendance = joinedAt;
        }
      }
    } else {
      for (const uidRaw of cls.attendance_user_ids || []) {
        const uid = Number(uidRaw);
        if (!uid) continue;
        const joinedAt = cls.start_time || null;
        const dateKey = parseDateOnly(joinedAt);
        if (startDate || endDate) {
          if (!inDateRange(dateKey, startDate, endDate)) continue;
        }
        sessions.push({
          user_id: uid,
          class_id: classId,
          class_title: cls.title,
          joined_at: joinedAt,
          date: dateKey,
        });
        if (!userMap.has(uid)) {
          const u = UserDatabase.getById(uid);
          userMap.set(uid, {
            user_id: uid,
            nombre: u?.nombre || `Usuario ${uid}`,
            email: u?.email || '',
            program_id: u?.program_id || u?.module_access?.d28d_program || null,
            classes_attended: 0,
            last_attendance: null,
          });
        }
        const row = userMap.get(uid);
        row.classes_attended += 1;
        if (!row.last_attendance || (joinedAt && joinedAt > row.last_attendance)) {
          row.last_attendance = joinedAt;
        }
      }
    }
  }

  sessions.sort((a, b) => String(b.joined_at || '').localeCompare(String(a.joined_at || '')));

  const users = Array.from(userMap.values()).sort((a, b) => b.classes_attended - a.classes_attended);

  const classesSummary = classes.map((c) => {
    const attendeeCount = new Set([
      ...(c.attendance_user_ids || []).map(Number),
      ...(c.attendance_events || []).map((e) => Number(e.user_id)).filter(Boolean),
    ]).size;
    return {
      class_id: c.id,
      title: c.title,
      start_time: c.start_time,
      d28d_routine_id: c.d28d_routine_id || null,
      attendee_count: attendeeCount,
    };
  });

  return {
    host_user_id: hostUser.id,
    kpis: {
      total_users: users.length,
      total_sessions: sessions.length,
      total_classes: classes.length,
      avg_attendees_per_class: classes.length
        ? Number((sessions.length / classes.length).toFixed(1))
        : 0,
    },
    users,
    sessions,
    classes: classesSummary,
    class_ids: Array.from(classById.keys()),
  };
}

module.exports = {
  getHostClasses,
  getAttendeeUserIds,
  canD28dHostAccessUser,
  buildTrackingOverview,
};
