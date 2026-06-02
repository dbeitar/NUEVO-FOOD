const LiveClassDatabase = require('../models/LiveClassDatabase');
const userDB = require('../models/UserDatabase');
const GymDatabase = require('../models/GymDatabase');
const { hasRole } = require('../utils/accessControl');
const { isPlatformAdmin, getUserGymId, isGymAdmin } = require('../utils/tenantScope');
const { filterClassesForD28dHost, isClassAssignedToHost } = require('../utils/d28dHostUtils');
const {
  canUserAccessD28dLiveClass,
  filterConsumerLiveClasses,
  filterAdminLiveClasses,
  filterAttendanceReport,
} = require('../utils/liveClassScope');
const {
  buildRoutineLinkFields,
  enrichMany,
  enrichClassWithRoutine,
} = require('../utils/d28dLiveClassRoutine');
const zoomMeetingService = require('../services/zoomMeetingService');
const { notifyD28dHostAssigned } = require('../utils/d28dHostNotification');

const TZ_D28D = process.env.D28D_ZOOM_TIMEZONE || 'America/Bogota';

function normalizeApiDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function deriveDayLabelFromIso(iso) {
  if (!iso) return '';
  try {
    const name = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: TZ_D28D }).format(new Date(iso));
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return '';
  }
}

function resolveSessionTitle(body, routineLink = {}) {
  const custom = String(body.title || '').trim();
  if (custom) return custom;
  if (routineLink.title) return routineLink.title;
  return 'Sesión D28D';
}

const LIVE_ADMIN_ROLES = ['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d'];
const LIVE_PLATFORM_WRITE_ROLES = ['super_admin', 'admin_d28d'];
const D28D_HOST_ROLE = 'entrenador_d28d';

const isLiveAdmin = (req) => req.user && hasRole(req.user, LIVE_ADMIN_ROLES);
const isD28dHostOnly = (req) => {
  if (!req.user) return false;
  return hasRole(req.user, [D28D_HOST_ROLE]) && !isLiveAdmin(req);
};
/** Crear/editar plantillas: solo plataforma D28D (no admin de gym). */
const canManageLiveTemplates = (req) => req.user && hasRole(req.user, LIVE_PLATFORM_WRITE_ROLES);

const canEditClass = (req, classItem = null) => {
  if (!req.user) return false;
  if (isD28dHostOnly(req)) return false;
  return canManageLiveTemplates(req);
};

const canAccessClass = (classItem, user) => canUserAccessD28dLiveClass(classItem, user);

const matchesProgram = (item, programId) => {
  if (!programId) return true;
  return String(item.program_id || '') === String(programId);
};

function userRoles(user) {
  if (!user) return [];
  return Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol].filter(Boolean);
}

function resolveD28dHostFields(body = {}) {
  const rawId = body.d28d_host_user_id;
  if (rawId === '' || rawId === undefined || rawId === null) {
    return {
      d28d_host_user_id: null,
      coach: String(body.coach || '').trim(),
    };
  }
  const hostId = Number(rawId);
  const host = userDB.getById(hostId);
  if (!host || !userRoles(host).includes(D28D_HOST_ROLE)) {
    return {
      d28d_host_user_id: null,
      coach: String(body.coach || '').trim(),
    };
  }
  const coachLabel = String(host.nombre || host.email || '').trim();
  return { d28d_host_user_id: hostId, coach: coachLabel };
}

const getD28dHosts = (req, res) => {
  try {
    if (!isLiveAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    const data = userDB.getAll()
      .filter((u) => userRoles(u).includes(D28D_HOST_ROLE))
      .map((u) => ({ id: u.id, nombre: u.nombre, email: u.email }))
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error listando hosts D28D:', error);
    return res.status(500).json({ error: 'Error listando entrenadores D28D' });
  }
};

const getPublicClasses = (req, res) => {
  try {
    const programId = req.query.program_id || null;
    const classes = filterConsumerLiveClasses(
      LiveClassDatabase.getAll().filter((item) => item.active),
      req.user,
    ).filter((item) => matchesProgram(item, programId));
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error obteniendo clases en vivo:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const getAdminClasses = async (req, res) => {
  try {
    if (!isLiveAdmin(req) && !isD28dHostOnly(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las clases' });
    }
    const programId = req.query.program_id || null;
    let classes = LiveClassDatabase.getAll().filter((item) => matchesProgram(item, programId));
    if (isD28dHostOnly(req)) {
      classes = filterClassesForD28dHost(classes, req.user);
    } else if (isGymAdmin(req.user) && !isPlatformAdmin(req.user)) {
      classes = filterAdminLiveClasses(classes, req.user);
    }
    const enriched = await enrichMany(classes);
    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error obteniendo clases admin:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const getAttendanceReport = (req, res) => {
  try {
    if (!isLiveAdmin(req) && !isD28dHostOnly(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver asistencia' });
    }
    const gyms = GymDatabase.getAll();
    let classList = LiveClassDatabase.getAll();
    if (isD28dHostOnly(req)) {
      classList = filterClassesForD28dHost(classList, req.user);
    } else if (isGymAdmin(req.user) && !isPlatformAdmin(req.user)) {
      classList = filterAdminLiveClasses(classList, req.user);
    }
    const scopeGymId = isGymAdmin(req.user) && !isPlatformAdmin(req.user)
      ? getUserGymId(req.user)
      : null;
    let rows = classList.map((classItem) => {
      const attendedIds = Array.isArray(classItem.attendance_user_ids) ? classItem.attendance_user_ids : [];
      const attendees = attendedIds
        .map((id) => userDB.getById(id))
        .filter(Boolean)
        .filter((user) => {
          if (scopeGymId == null) return true;
          const ug = user.gym_id || user.gymId || null;
          return ug != null && String(ug) === String(scopeGymId);
        })
        .map((user) => {
          const gymId = user.gym_id || user.gymId || classItem.gym_id || null;
          const gym = gyms.find((item) => item.id === Number(gymId));
          return {
            user_id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            gym_id: gymId,
            gym_name: gym?.nombre || (gymId ? `Gym ${gymId}` : 'Sin gym'),
          };
        });
      const byGym = attendees.reduce((acc, attendee) => {
        const key = attendee.gym_name || 'Sin gym';
        if (!acc[key]) acc[key] = { gym_id: attendee.gym_id, gym_name: key, count: 0, attendees: [] };
        acc[key].count += 1;
        acc[key].attendees.push(attendee);
        return acc;
      }, {});
      return {
        class_id: classItem.id,
        title: classItem.title,
        start_time: classItem.start_time,
        end_time: classItem.end_time,
        scope: classItem.is_global ? 'Global D28D' : classItem.gym_id ? `Gym ${classItem.gym_id}` : 'Privado',
        source_module: classItem.source_module || 'gym',
        locked: !!classItem.locked,
        total_attendees: attendees.length,
        by_gym: Object.values(byGym).sort((a, b) => b.count - a.count),
        gym_id: classItem.gym_id,
      };
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error generando reporte de asistencia:', error);
    return res.status(500).json({ error: 'Error generando reporte de asistencia' });
  }
};

function pickZoomAccountId(body) {
  const programId = body.program_id || body.programId || null;
  const raw = body.zoom_account_id || body.zoomAccountId || null;
  if (programId === 'virtual_d28d') return raw || 'virtual_d28d_1';
  if (programId === 'vital' || programId === 'pancitas') return programId;
  return raw;
}

async function resolveZoomLinkForClass(body, hostFields, resolvedTitle, options = {}) {
  const { allowEmptyOnAutoFail = false } = options;
  let zoomLink = String(body.zoom_link || '').trim();
  let zoomMeta = null;
  let warning = null;
  const wantsAuto = body.auto_zoom === true || body.auto_zoom === 'true';
  const programId = body.program_id || body.programId || null;
  const zoomAccountId = pickZoomAccountId(body);

  if (zoomLink && !zoomMeetingService.isValidZoomJoinUrl(zoomLink)) {
    if (!wantsAuto) {
      return {
        error: 'El enlace Zoom no es válido (debe ser https://zoom.us/j/ seguido del ID numérico de la reunión). Genera uno nuevo con «Generar Zoom».',
        status: 400,
      };
    }
    zoomLink = '';
  }

  if (wantsAuto && programId) {
    const hostUser = hostFields.d28d_host_user_id
      ? userDB.getById(Number(hostFields.d28d_host_user_id))
      : null;
    const hostZoomEmail = zoomMeetingService.getZoomHostEmail(programId, zoomAccountId);
    const zoomResult = await zoomMeetingService.createScheduledMeeting({
      programId,
      zoomAccountId,
      topic: resolvedTitle,
      startTime: body.start_time,
      endTime: body.end_time,
      alternativeHostEmail: hostUser?.email || '',
    });
    if (zoomResult.ok) {
      zoomLink = zoomResult.join_url;
      zoomMeta = zoomResult;
    } else if (allowEmptyOnAutoFail) {
      warning = zoomResult.message || 'No se pudo generar Zoom automático; la clase se guardó sin enlace.';
      zoomMeta = { ...zoomResult, pending: true, host_email: zoomResult.host_email || hostZoomEmail };
    } else {
      return {
        error: zoomResult.message || 'No se pudo generar el enlace Zoom',
        status: 400,
        zoomMeta: { ...zoomResult, host_email: zoomResult.host_email || hostZoomEmail },
      };
    }
  } else if (wantsAuto && !programId && !zoomLink) {
    if (allowEmptyOnAutoFail) {
      warning = 'program_id es requerido para generar Zoom automático; la clase se guardó sin enlace.';
    } else {
      return { error: 'program_id es requerido para generar Zoom automático', status: 400 };
    }
  }

  if (!zoomLink) {
    if (allowEmptyOnAutoFail) {
      return { zoomLink: '', zoomMeta, warning };
    }
    return { error: 'zoom_link es requerido (o activa generar enlace Zoom)', status: 400 };
  }
  if (!zoomMeetingService.isValidZoomJoinUrl(zoomLink)) {
    if (allowEmptyOnAutoFail) {
      return {
        zoomLink: '',
        zoomMeta,
        warning: warning || 'Enlace Zoom inválido; la clase se guardó sin enlace. Usa «Generar Zoom» después.',
      };
    }
    return {
      error: 'Enlace Zoom inválido. Usa «Generar Zoom» con programa y cuenta del maestro configurados.',
      status: 400,
    };
  }
  return { zoomLink, zoomMeta, warning };
}

const createZoomMeeting = async (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede generar enlaces Zoom' });
    }
    const routineLink = await buildRoutineLinkFields(req.body || {});
    const hostFields = resolveD28dHostFields(req.body || {});
    const title = resolveSessionTitle(req.body, routineLink);
    const startNorm = normalizeApiDateTime(req.body.start_time);
    const endNorm = normalizeApiDateTime(req.body.end_time);
    if (!startNorm || !endNorm || !req.body.program_id) {
      return res.status(400).json({
        error: 'Selecciona programa, fecha/hora de inicio y fin antes de generar Zoom.',
      });
    }
    const resolved = await resolveZoomLinkForClass(
      { ...req.body, start_time: startNorm, end_time: endNorm },
      hostFields,
      title,
    );
    if (resolved.error) {
      return res.status(resolved.status || 400).json({
        error: resolved.error,
        zoom: resolved.zoomMeta,
        host_email: resolved.zoomMeta?.host_email,
        alternative_host: resolved.zoomMeta?.alternative_host,
      });
    }
    return res.json({
      success: true,
      message: resolved.zoomMeta?.message || 'Enlace Zoom listo',
      data: {
        zoom_link: resolved.zoomLink,
        zoom: resolved.zoomMeta,
        title,
      },
    });
  } catch (error) {
    console.error('Error generando Zoom:', error);
    return res.status(500).json({ error: 'Error generando enlace Zoom' });
  }
};

const createClass = async (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede crear o programar clases en vivo' });
    }
    const { title, description = '', start_time, end_time, gym_id: bodyGymId = null, active = true, is_global = true, day_label = '', class_type = 'METODO D28D', coach = '', capacity = 40, source_module = 'd28d' } = req.body || {};
    const routineLink = await buildRoutineLinkFields(req.body || {});
    const hostFields = resolveD28dHostFields(req.body || {});
    const startNorm = normalizeApiDateTime(start_time);
    const endNorm = normalizeApiDateTime(end_time);
    const resolvedTitle = resolveSessionTitle(req.body, routineLink);
    if (!startNorm || !endNorm) {
      return res.status(400).json({ error: 'start_time y end_time válidos son requeridos' });
    }
    const zoomResolved = await resolveZoomLinkForClass(
      { ...req.body, start_time: startNorm, end_time: endNorm },
      hostFields,
      resolvedTitle,
      { allowEmptyOnAutoFail: true },
    );
    if (zoomResolved.error) {
      return res.status(zoomResolved.status || 400).json({
        error: zoomResolved.error,
        zoom: zoomResolved.zoomMeta || null,
      });
    }
    const zoom_link = zoomResolved.zoomLink || '';
    const zoomWarning = zoomResolved.warning || null;
    if (source_module === 'd28d' && !hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Solo D28D puede crear clases globales' });
    }

    const finalGymId = bodyGymId === '' || bodyGymId === undefined || bodyGymId === null
      ? null
      : bodyGymId;

    const dayLabel = String(day_label || '').trim() || deriveDayLabelFromIso(startNorm);

    const created = LiveClassDatabase.create({
      title: resolvedTitle,
      description: description || routineLink.description || '',
      zoom_link,
      start_time: startNorm,
      end_time: endNorm,
      gym_id: finalGymId,
      active,
      is_global,
      day_label: dayLabel,
      class_type,
      coach: hostFields.coach || coach,
      capacity,
      source_module,
      locked: source_module === 'd28d',
      program_id: req.body.program_id || null,
      ...routineLink,
      d28d_host_user_id: hostFields.d28d_host_user_id,
    });
    const enriched = await enrichClassWithRoutine(created);
    if (hostFields.d28d_host_user_id) {
      notifyD28dHostAssigned({
        hostUserId: hostFields.d28d_host_user_id,
        classTitle: resolvedTitle,
        startTime: start_time,
        zoomLink: zoom_link,
        startUrl: zoomResolved.zoomMeta?.start_url || zoom_link,
        programId: req.body.program_id || null,
        hostZoomEmail: zoomResolved.zoomMeta?.host_email || null,
      });
    }
    // Communication Center: evento de clase programada (plantillas + auditoría).
    try {
      const comms = require('../services/communicationCenterService');
      await comms.dispatchEvent({
        evento: 'd28d.class.scheduled',
        modulo: 'd28d',
        userId: req.user?.id || null,
        targetEmail: req.user?.email || null,
        vars: {
          class: {
            id: created?.id,
            title: resolvedTitle,
            start_time,
            end_time,
            program_id: created?.program_id || null,
            gym_id: finalGymId,
            zoom_link,
          },
          user: { id: req.user?.id, email: req.user?.email, nombre: req.user?.nombre || null },
        },
      });
    } catch (e) {
      console.warn('comm.class.scheduled:', e.message);
    }
    return res.status(201).json({
      success: true,
      message: zoomWarning
        ? `Clase creada correctamente. ${zoomWarning}`
        : 'Clase creada correctamente',
      data: enriched,
      zoom_link: zoom_link || null,
      zoom: zoomResolved.zoomMeta || null,
      zoom_warning: zoomWarning,
    });
  } catch (error) {
    console.error('Error creando clase en vivo:', error);
    return res.status(500).json({ error: 'Error creando clase en vivo' });
  }
};

const seedD28DWeek = (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede crear plantilla D28D' });
    }
    const created = LiveClassDatabase.seedD28DWeek(req.body?.base_date ? new Date(req.body.base_date) : new Date());
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creando plantilla D28D:', error);
    return res.status(500).json({ error: 'Error creando plantilla D28D' });
  }
};

const enrollClass = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const classItem = LiveClassDatabase.getById(id);
    if (!canAccessClass(classItem, req.user)) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const updated = LiveClassDatabase.enroll(id, req.user.id);
    if (!updated) return res.status(404).json({ error: 'Clase no encontrada' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error.code === 'CLASS_FULL') return res.status(409).json({ error: 'Clase llena' });
    console.error('Error inscribiendo clase:', error);
    return res.status(500).json({ error: 'Error inscribiendo clase' });
  }
};

const unenrollClass = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = LiveClassDatabase.unenroll(id, req.user.id);
    if (!updated) return res.status(404).json({ error: 'Clase no encontrada' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error cancelando inscripcion:', error);
    return res.status(500).json({ error: 'Error cancelando inscripcion' });
  }
};

const updateClass = async (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede actualizar clases en vivo' });
    }
    const id = parseInt(req.params.id, 10);
    const current = LiveClassDatabase.getById(id);
    if (!canEditClass(req, current)) {
      return res.status(403).json({ error: 'No puedes editar clases D28D bloqueadas' });
    }
    const routineLink = await buildRoutineLinkFields(req.body || {}, current);
    const hostFields = resolveD28dHostFields(req.body || {});
    const resolvedTitle = resolveSessionTitle(req.body, routineLink) || current.title;
    const prevStart = String(current.start_time || '');
    const prevEnd = String(current.end_time || '');
    const nextStartRaw = req.body.start_time !== undefined ? req.body.start_time : prevStart;
    const nextEndRaw = req.body.end_time !== undefined ? req.body.end_time : prevEnd;
    const nextStart = normalizeApiDateTime(nextStartRaw) || prevStart;
    const nextEnd = normalizeApiDateTime(nextEndRaw) || prevEnd;
    const timeChanged = nextStart !== prevStart || nextEnd !== prevEnd;
    let zoom_link = req.body.zoom_link !== undefined ? req.body.zoom_link : current.zoom_link;
    let zoomMeta = null;
    const wantsAuto = req.body.auto_zoom === true || req.body.auto_zoom === 'true';
    if (wantsAuto && (req.body.program_id || current.program_id)) {
      const zoomResolved = await resolveZoomLinkForClass(
        {
          ...req.body,
          program_id: req.body.program_id || current.program_id,
          start_time: nextStart,
          end_time: nextEnd,
          auto_zoom: true,
        },
        hostFields,
        resolvedTitle,
        { allowEmptyOnAutoFail: true },
      );
      if (zoomResolved.error && !zoom_link) {
        return res.status(zoomResolved.status || 400).json({ error: zoomResolved.error });
      }
      if (zoomResolved.zoomLink) {
        zoom_link = zoomResolved.zoomLink;
        zoomMeta = zoomResolved.zoomMeta;
      }
    }
    const updated = LiveClassDatabase.update(id, {
      ...(req.body || {}),
      ...routineLink,
      title: resolvedTitle,
      start_time: nextStart,
      end_time: nextEnd,
      day_label: req.body.day_label !== undefined
        ? String(req.body.day_label || '').trim()
        : (timeChanged ? deriveDayLabelFromIso(nextStart) : current.day_label),
      zoom_link,
      coach: hostFields.coach !== undefined ? hostFields.coach : req.body?.coach,
      d28d_host_user_id: hostFields.d28d_host_user_id,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const enriched = await enrichClassWithRoutine(updated);
    const hostChanged = hostFields.d28d_host_user_id != null
      && Number(hostFields.d28d_host_user_id) !== Number(current.d28d_host_user_id);
    if (hostChanged || wantsAuto) {
      notifyD28dHostAssigned({
        hostUserId: hostFields.d28d_host_user_id || updated.d28d_host_user_id,
        classTitle: resolvedTitle,
        startTime: updated.start_time,
        zoomLink: zoom_link,
        startUrl: zoomMeta?.start_url || zoom_link,
        programId: updated.program_id,
        hostZoomEmail: zoomMeta?.host_email || null,
      });
    }
    // Communication Center: evento cambio horario / actualización (plantillas + auditoría).
    try {
      const comms = require('../services/communicationCenterService');
      await comms.dispatchEvent({
        evento: timeChanged ? 'd28d.class.time_changed' : 'd28d.class.updated',
        modulo: 'd28d',
        userId: req.user?.id || null,
        targetEmail: req.user?.email || null,
        vars: {
          class: {
            id: updated?.id,
            title: resolvedTitle,
            start_time: updated?.start_time,
            end_time: updated?.end_time,
            program_id: updated?.program_id || null,
            auto_zoom: wantsAuto || null,
            zoom_link,
          },
          user: { id: req.user?.id, email: req.user?.email, nombre: req.user?.nombre || null },
        },
      });
    } catch (e) {
      console.warn('comm.class.updated:', e.message);
    }
    return res.json({
      success: true,
      message: 'Clase actualizada correctamente',
      data: enriched,
      zoom: zoomMeta || null,
    });
  } catch (error) {
    console.error('Error actualizando clase en vivo:', error);
    return res.status(500).json({ error: 'Error actualizando clase en vivo' });
  }
};

const deleteClass = (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede eliminar clases en vivo' });
    }
    const id = parseInt(req.params.id, 10);
    const current = LiveClassDatabase.getById(id);
    if (!canEditClass(req, current)) {
      return res.status(403).json({ error: 'No puedes eliminar clases D28D bloqueadas' });
    }
    const deleted = LiveClassDatabase.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando clase en vivo:', error);
    return res.status(500).json({ error: 'Error eliminando clase en vivo' });
  }
};

const joinClass = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const classItem = LiveClassDatabase.getById(id);
    const hostAccess = isD28dHostOnly(req) && isClassAssignedToHost(classItem, req.user);
    if (!hostAccess && !canAccessClass(classItem, req.user)) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const updated = LiveClassDatabase.attend(id, req.user);
    if (!updated) return res.status(404).json({ error: 'Clase no encontrada' });
    const enriched = await enrichClassWithRoutine(updated);
    return res.json({ success: true, data: { zoom_link: updated.zoom_link, class: enriched } });
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    return res.status(500).json({ error: 'Error registrando asistencia' });
  }
};

module.exports = {
  getPublicClasses,
  getAdminClasses,
  getAttendanceReport,
  getD28dHosts,
  createZoomMeeting,
  createClass,
  updateClass,
  deleteClass,
  seedD28DWeek,
  enrollClass,
  unenrollClass,
  joinClass,
};
