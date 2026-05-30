const { sendEventReminders } = require('../services/spiritual/spiritualService');

function startSpiritualScheduler() {
  if (String(process.env.SPIRITUAL_CENTER_ENABLED || 'true').toLowerCase() === 'false') {
    return { started: false, reason: 'SPIRITUAL_CENTER_ENABLED=false' };
  }
  const intervalMs = Number(process.env.SPIRITUAL_REMINDER_INTERVAL_MS || 3600000);
  const tick = () => {
    sendEventReminders().catch((e) => console.warn('[spiritual.scheduler]', e.message));
  };
  tick();
  const handle = setInterval(tick, intervalMs);
  if (handle.unref) handle.unref();
  return { started: true, intervalMs };
}

module.exports = { startSpiritualScheduler };
