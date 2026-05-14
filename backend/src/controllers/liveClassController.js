const LiveClassDatabase = require('../models/LiveClassDatabase');
const userDB = require('../models/UserDatabase');
const GymDatabase = require('../models/GymDatabase');
const { hasRole } = require('../utils/accessControl');

const isAdmin = (req) => req.user && hasRole(req.user, ['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']);
const canEditClass = (req, classItem = null) => {
  if (!req.user) return false;
  if (hasRole(req.user, ['super_admin'])) return true;
  if (classItem?.locked || classItem?.source_module === 'd28d') {
    return hasRole(req.user, ['admin_d28d']);
  }
  return hasRole(req.user, ['admin_marca', 'admin_gimnasio', 'entrenador']);
};
const canAccessClass = (classItem, user) => {
  if (!classItem || !classItem.active) return false;
  if (classItem.gym_id === null) return true;
  return user && (user.gym_id === classItem.gym_id || user.gymId === classItem.gym_id);
};

const matchesProgram = (item, programId) => {
  if (!programId) return true;
  return String(item.program_id || '') === String(programId);
};

const getPublicClasses = (req, res) => {
  try {
    const programId = req.query.program_id || null;
    const classes = LiveClassDatabase.getAll()
      .filter((item) => item.active && (item.gym_id === null || canAccessClass(item, req.user)))
      .filter((item) => matchesProgram(item, programId));
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error obteniendo clases en vivo:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const getAdminClasses = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las clases' });
    }
    const programId = req.query.program_id || null;
    const classes = LiveClassDatabase.getAll().filter((item) => matchesProgram(item, programId));
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error obteniendo clases admin:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const getAttendanceReport = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver asistencia' });
    }
    const gyms = GymDatabase.getAll();
    const rows = LiveClassDatabase.getAll().map((classItem) => {
      const attendedIds = Array.isArray(classItem.attendance_user_ids) ? classItem.attendance_user_ids : [];
      const attendees = attendedIds
        .map((id) => userDB.getById(id))
        .filter(Boolean)
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
      };
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error generando reporte de asistencia:', error);
    return res.status(500).json({ error: 'Error generando reporte de asistencia' });
  }
};

const createClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para crear clases' });
    }
    const { title, description = '', zoom_link, start_time, end_time, gym_id = null, active = true, is_global = true, day_label = '', class_type = 'METODO D28D', coach = '', capacity = 40, source_module = 'gym' } = req.body || {};
    if (!title || !zoom_link || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, zoom_link, start_time y end_time son requeridos' });
    }
    if (source_module === 'd28d' && !hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Solo D28D puede crear clases D28D bloqueadas' });
    }
    const created = LiveClassDatabase.create({
      title,
      description,
      zoom_link,
      start_time,
      end_time,
      gym_id: gym_id || null,
      active,
      is_global,
      day_label,
      class_type,
      coach,
      capacity,
      source_module,
      locked: source_module === 'd28d',
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creando clase en vivo:', error);
    return res.status(500).json({ error: 'Error creando clase en vivo' });
  }
};

const seedD28DWeek = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para crear plantilla D28D' });
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

const updateClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar clases' });
    }
    const id = parseInt(req.params.id, 10);
    const current = LiveClassDatabase.getById(id);
    if (!canEditClass(req, current)) {
      return res.status(403).json({ error: 'No puedes editar clases D28D bloqueadas' });
    }
    const updated = LiveClassDatabase.update(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error actualizando clase en vivo:', error);
    return res.status(500).json({ error: 'Error actualizando clase en vivo' });
  }
};

const deleteClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar clases' });
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

const joinClass = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const classItem = LiveClassDatabase.getById(id);
    if (!canAccessClass(classItem, req.user)) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    const updated = LiveClassDatabase.attend(id, req.user);
    if (!updated) return res.status(404).json({ error: 'Clase no encontrada' });
    return res.json({ success: true, data: { zoom_link: updated.zoom_link, class: updated } });
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    return res.status(500).json({ error: 'Error registrando asistencia' });
  }
};

module.exports = {
  getPublicClasses,
  getAdminClasses,
  getAttendanceReport,
  createClass,
  updateClass,
  deleteClass,
  seedD28DWeek,
  enrollClass,
  unenrollClass,
  joinClass,
};
