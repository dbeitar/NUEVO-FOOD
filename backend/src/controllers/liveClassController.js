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

async function resolveZoomLinkForClass(body, hostFields, resolvedTitle) {
  let zoomLink = String(body.zoom_link || '').trim();
  let zoomMeta = null;
  const wantsAuto = body.auto_zoom === true || body.auto_zoom === 'true';
  if (wantsAuto && body.program_id) {
    const hostUser = hostFields.d28d_host_user_id
      ? userDB.getById(Number(hostFields.d28d_host_user_id))
      : null;
    const zoomResult = await zoomMeetingService.createScheduledMeeting({
      programId: body.program_id,
      zoomAccountId: body.zoom_account_id || null,
      topic: resolvedTitle,
      startTime: body.start_time,
      endTime: body.end_time,
      alternativeHostEmail: hostUser?.email || '',
    });
    if (zoomResult.ok) {
      zoomLink = zoomResult.join_url;
      zoomMeta = zoomResult;
    } else if (!zoomLink) {
      return { error: zoomResult.message || 'No se pudo generar el enlace Zoom', status: 400, zoomMeta };
    }
  }
  if (!zoomLink) {
    return { error: 'zoom_link es requerido (o activa generar enlace Zoom)', status: 400 };
  }
  return { zoomLink, zoomMeta };
}

const createZoomMeeting = async (req, res) => {
  try {
    if (!canManageLiveTemplates(req)) {
      return res.status(403).json({ error: 'Solo D28D puede generar enlaces Zoom' });
    }
    const routineLink = await buildRoutineLinkFields(req.body || {});
    const hostFields = resolveD28dHostFields(req.body || {});
    const title = req.body.title || routineLink.title;
    if (!title || !req.body.start_time || !req.body.end_time || !req.body.program_id) {
      return res.status(400).json({ error: 'program_id, start_time, end_time y título (o rutina) son requeridos' });
    }
    const resolved = await resolveZoomLinkForClass(req.body, hostFields, title);
    if (resolved.error) {
      return res.status(resolved.status || 400).json({ error: resolved.error, zoom: resolved.zoomMeta });
    }
    return res.json({
      success: true,
      data: {
        zoom_link: resolved.zoomLink,
        zoom: resolved.zoomMeta,
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
    const resolvedTitle = title || routineLink.title;
    if (!resolvedTitle || !start_time || !end_time) {
      return res.status(400).json({ error: 'title (o rutina D28D), start_time y end_time son requeridos' });
    }
    const zoomResolved = await resolveZoomLinkForClass(req.body, hostFields, resolvedTitle);
    if (zoomResolved.error) {
      return res.status(zoomResolved.status || 400).json({ error: zoomResolved.error });
    }
    const zoom_link = zoomResolved.zoomLink;
    if (source_module === 'd28d' && !hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Solo D28D puede crear clases globales' });
    }

    const finalGymId = bodyGymId === '' || bodyGymId === undefined || bodyGymId === null
      ? null
      : bodyGymId;

    const created = LiveClassDatabase.create({
      title: resolvedTitle,
      description: description || routineLink.description || '',
      zoom_link,
      start_time,
      end_time,
      gym_id: finalGymId,
      active,
      is_global,
      day_label,
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
    return res.status(201).json({ success: true, data: enriched, zoom: zoomResolved.zoomMeta || null });
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
    const resolvedTitle = req.body.title || routineLink.title || current.title;
    let zoom_link = req.body.zoom_link !== undefined ? req.body.zoom_link : current.zoom_link;
    let zoomMeta = null;
    const wantsAuto = req.body.auto_zoom === true || req.body.auto_zoom === 'true';
    if (wantsAuto && (req.body.program_id || current.program_id)) {
      const zoomResolved = await resolveZoomLinkForClass(
        { ...req.body, program_id: req.body.program_id || current.program_id, start_time: req.body.start_time || current.start_time, end_time: req.body.end_time || current.end_time },
        hostFields,
        resolvedTitle,
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
    return res.json({ success: true, data: enriched, zoom: zoomMeta });
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
