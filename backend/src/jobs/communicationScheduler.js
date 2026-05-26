const { getPrisma } = require('../lib/prisma');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

async function runDailyCommunicationJobs() {
  const comms = require('../services/communicationCenterService');
  const prisma = getPrisma();

  const now = new Date();
  const today = startOfDay(now);

  // 1) Licencias por vencer / vencidas (source of truth: module_licenses)
  const licenses = await prisma.moduleLicense.findMany({
    where: { active: true, validUntil: { not: null } },
    select: { userId: true, moduleCode: true, validUntil: true },
  });

  for (const lic of licenses) {
    const until = new Date(lic.validUntil);
    const dleft = daysBetween(today, until);

    // expiring: 14 o 7 días
    if (dleft === 14 || dleft === 7) {
      const user = await prisma.user.findUnique({ where: { id: lic.userId }, select: { id: true, nombre: true, email: true } });
      await comms.dispatchEvent({
        evento: 'license.expiring',
        modulo: lic.moduleCode === 'training' ? 'training' : lic.moduleCode === 'food' ? 'food' : 'd28d',
        userId: lic.userId,
        targetEmail: user?.email || null,
        vars: {
          user,
          license: { module_code: lic.moduleCode, valid_until: until.toISOString(), days_left: dleft },
        },
      });
    }

    // expired: hoy o antes (dleft < 0) — solo primera vez del día
    if (dleft === 0 || dleft === -1) {
      const user = await prisma.user.findUnique({ where: { id: lic.userId }, select: { id: true, nombre: true, email: true } });
      await comms.dispatchEvent({
        evento: 'license.expired',
        modulo: lic.moduleCode === 'training' ? 'training' : lic.moduleCode === 'food' ? 'food' : 'd28d',
        userId: lic.userId,
        targetEmail: user?.email || null,
        vars: {
          user,
          license: { module_code: lic.moduleCode, valid_until: until.toISOString(), days_left: dleft },
        },
      });
    }
  }

  // 2) Ciclos que inician hoy (cycles.startDate)
  const cycles = await prisma.cycle.findMany({ select: { id: true, name: true, startDate: true } });
  for (const c of cycles) {
    const sd = startOfDay(new Date(c.startDate));
    if (sd.getTime() !== today.getTime()) continue;
    // Usuarios con cuentas vinculadas a ese ciclo
    const accounts = await prisma.userAccount.findMany({
      where: { cycleId: c.id, estado: 'activo' },
      select: { userId: true, plan: true },
    });
    for (const acc of accounts) {
      const user = await prisma.user.findUnique({ where: { id: acc.userId }, select: { id: true, nombre: true, email: true } });
      await comms.dispatchEvent({
        evento: 'cycle.started',
        modulo: 'd28d',
        userId: acc.userId,
        targetEmail: user?.email || null,
        vars: {
          user,
          cycle: { id: c.id, name: c.name, start_date: new Date(c.startDate).toISOString() },
          account: { plan: acc.plan },
        },
      });
    }
  }

  return { ok: true, ran_at: now.toISOString(), licenses_checked: licenses.length, cycles_checked: cycles.length };
}

function startCommunicationScheduler() {
  const enabled = String(process.env.COMM_SCHEDULER_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) return { started: false, reason: 'COMM_SCHEDULER_ENABLED=false' };

  // Ejecución diaria con setInterval + guard por fecha (evita múltiples en cluster simple).
  const hour = Number(process.env.COMM_SCHEDULER_HOUR || 3);
  let lastRunDay = null;

  async function tick() {
    const now = new Date();
    if (now.getHours() !== hour) return;
    const dayKey = now.toISOString().slice(0, 10);
    if (lastRunDay === dayKey) return;
    lastRunDay = dayKey;
    try {
      // eslint-disable-next-line no-console
      console.log('[comm.scheduler] running daily jobs…');
      const out = await runDailyCommunicationJobs();
      // eslint-disable-next-line no-console
      console.log('[comm.scheduler] done', out);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[comm.scheduler] error', e.message);
    }
  }

  // run quick tick at boot, then every minute
  tick();
  const timer = setInterval(tick, 60 * 1000);
  return { started: true, every_ms: 60 * 1000, hour };
}

module.exports = { startCommunicationScheduler, runDailyCommunicationJobs };

