const LiveClassDatabase = require('../models/LiveClassDatabase');
const challengeStore = require('../models/D28dChallengeStore');
const AccountsDatabase = require('../models/AccountsDatabase');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');

function trafficLight(pct) {
  if (pct >= 70) return 'green';
  if (pct >= 40) return 'yellow';
  return 'red';
}

function computeForUser(userId, programId = null) {
  const uid = Number(userId);
  const classes = LiveClassDatabase.getAll().filter((c) => {
    if (programId && c.program_id && String(c.program_id) !== String(programId)) return false;
    return true;
  });
  let scheduled = 0;
  let attended = 0;
  const activeDates = new Set();
  for (const cls of classes) {
    scheduled += 1;
    const ids = cls.attendance_user_ids || [];
    const events = cls.attendance_events || [];
    const wasThere = ids.includes(uid) || events.some((e) => Number(e.user_id) === uid);
    if (wasThere) {
      attended += 1;
      const d = (cls.start_time || cls.scheduled_at || '').slice(0, 10);
      if (d) activeDates.add(d);
    }
  }
  const attendancePct = scheduled ? Math.round((attended / scheduled) * 100) : 0;

  const entries = challengeStore.entries.filter((e) => Number(e.user_id) === uid);
  const joined = entries.filter((e) => e.estado !== 'withdrawn').length;
  const done = entries.filter((e) => ['submitted', 'reviewed'].includes(e.estado)).length;
  let won = 0;
  for (const p of challengeStore.podiums) {
    const entry = challengeStore.entries.find((e) => Number(e.id) === Number(p.entry_id));
    if (entry && Number(entry.user_id) === uid) won += 1;
  }

  const account = AccountsDatabase.getByUserId(uid);
  const vigenciaActiva = account && account.estado === 'activo';

  const composite = Math.round((attendancePct * 0.6) + (joined ? (done / joined) * 40 : 0));

  return {
    user_id: uid,
    program_id: programId || account?.plan ? null : null,
    classes_scheduled: scheduled,
    classes_attended: attended,
    attendance_pct: attendancePct,
    challenges_joined: joined,
    challenges_completed: done,
    challenges_won: won,
    participations: joined,
    active_days: activeDates.size,
    vigencia_activa: !!vigenciaActiva,
    adherence_pct: composite,
    traffic_light: trafficLight(composite),
    computed_at: new Date().toISOString(),
  };
}

async function saveSnapshot(data) {
  if (!useRelationalStorage()) return data;
  try {
    await getPrisma().d28dUserProgressSnapshot.create({
      data: {
        userId: data.user_id,
        programId: data.program_id,
        classesScheduled: data.classes_scheduled,
        classesAttended: data.classes_attended,
        attendancePct: data.attendance_pct,
        challengesJoined: data.challenges_joined,
        challengesDone: data.challenges_completed,
        challengesWon: data.challenges_won,
        activeDays: data.active_days,
        trafficLight: data.traffic_light,
      },
    });
  } catch (e) {
    console.warn('[d28dProgress] snapshot:', e.message);
  }
  return data;
}

function adminOverview() {
  const userIds = new Set();
  for (const cls of LiveClassDatabase.getAll()) {
    for (const uid of cls.attendance_user_ids || []) userIds.add(Number(uid));
    for (const ev of cls.attendance_events || []) {
      if (ev?.user_id) userIds.add(Number(ev.user_id));
    }
  }
  for (const e of challengeStore.entries) userIds.add(Number(e.user_id));

  const users = [...userIds].map((uid) => computeForUser(uid));
  const avgAttendance = users.length
    ? Math.round(users.reduce((s, u) => s + u.attendance_pct, 0) / users.length)
    : 0;
  const atRisk = users.filter((u) => u.traffic_light === 'red');
  const highlighted = users.filter((u) => u.traffic_light === 'green');
  const inactive = users.filter((u) => u.active_days === 0);

  return {
    users_total: users.length,
    avg_attendance_pct: avgAttendance,
    challenge_participations: challengeStore.entries.filter((e) => e.estado !== 'withdrawn').length,
    users_at_risk: atRisk.slice(0, 20),
    users_highlighted: highlighted.slice(0, 20),
    users_inactive: inactive.slice(0, 20),
    historical_winners: challengeStore.podiums,
  };
}

module.exports = { computeForUser, saveSnapshot, adminOverview, trafficLight };
