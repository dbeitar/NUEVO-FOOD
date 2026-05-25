const NotificationDatabase = require('../models/NotificationDatabase');
const userDB = require('../models/UserDatabase');

function notifyD28dHostAssigned({
  hostUserId,
  classTitle,
  startTime,
  zoomLink,
  startUrl,
  programId,
  hostZoomEmail,
}) {
  if (!hostUserId) return null;
  const host = userDB.getById(Number(hostUserId));
  const when = startTime ? new Date(startTime).toLocaleString('es-MX') : 'por confirmar';
  const lines = [
    `Te asignaron como anfitrión de la clase «${classTitle || 'D28D'}».`,
    `Inicio: ${when}.`,
    programId ? `Programa: ${programId}.` : '',
    hostZoomEmail ? `Cuenta Zoom de la sala: ${hostZoomEmail}.` : '',
    zoomLink ? `Enlace participantes: ${zoomLink}` : '',
    startUrl && startUrl !== zoomLink ? `Enlace anfitrión (iniciar reunión): ${startUrl}` : '',
    'Entra al panel → Clases en vivo para ver la rutina y registrar observaciones.',
  ].filter(Boolean);
  return NotificationDatabase.create({
    user_id: hostUserId,
    tipo: 'live_class_host',
    mensaje: lines.join('\n'),
    meta: {
      class_title: classTitle,
      start_time: startTime,
      zoom_link: zoomLink,
      start_url: startUrl,
      program_id: programId,
      host_zoom_email: hostZoomEmail,
    },
  });
}

module.exports = { notifyD28dHostAssigned };
