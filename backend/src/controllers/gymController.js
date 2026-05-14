const GymDatabase = require('../models/GymDatabase');
const {
  isSuperAdmin,
  isPlatformAdmin,
  getUserGymId,
  filterByGym,
  canAccessEntity,
} = require('../utils/tenantScope');

// Roles que pueden gestionar gyms en su scope.
// - super_admin / admin_d28d: toda la plataforma.
// - admin_marca / admin_gimnasio / admin_gym: solo su gym.
const GYM_MANAGE_ROLES = [
  'super_admin', 'admin_d28d',
  'admin_marca', 'admin_gimnasio', 'admin_gym',
];

const isGymManager = (user) => {
  if (!user) return false;
  const arr = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol];
  return arr.some((r) => GYM_MANAGE_ROLES.includes(r));
};

// GET /api/gyms — lista filtrada por scope del usuario
const getAllGyms = (req, res) => {
  try {
    const all = GymDatabase.getAll();
    if (isPlatformAdmin(req.user)) {
      return res.json(all);
    }
    // Para cualquier otro autenticado, solo su gym (1 elemento o ninguno).
    const myGymId = getUserGymId(req.user);
    if (myGymId == null) return res.json([]);
    return res.json(all.filter((g) => String(g.id) === String(myGymId)));
  } catch (error) {
    console.error('Error obteniendo gimnasios:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getGymById = (req, res) => {
  try {
    const { id } = req.params;
    const gym = GymDatabase.getById(parseInt(id, 10));
    if (!gym) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    if (!canAccessEntity(req.user, gym)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    res.json(gym);
  } catch (error) {
    console.error('Error obteniendo gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getGymsByCity = (req, res) => {
  try {
    const { ciudad } = req.params;
    const gyms = GymDatabase.getByCiudad(ciudad);
    res.json(filterByGym(gyms, req.user));
  } catch (error) {
    console.error('Error obteniendo gimnasios por ciudad:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const searchGyms = (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    const gyms = GymDatabase.search(q);
    res.json(filterByGym(gyms, req.user));
  } catch (error) {
    console.error('Error buscando gimnasios:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/gyms — super_admin y admin_d28d pueden dar de alta gimnasios
// marca blanca dentro de la plataforma D28D.
const createGym = (req, res) => {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo administradores de plataforma pueden crear gimnasios' });
    }
    const {
      nombre, direccion, teléfono, telefono, email, ciudad, país, pais,
      latitude, longitude, capacidad_usuarios, plan_id,
      logo_url, brand_name, brand_slug, white_label_enabled, welcome_message,
      support_whatsapp, primary_color, secondary_color, status,
    } = req.body || {};

    if (!nombre || !email || !ciudad) {
      return res.status(400).json({ error: 'Nombre, email y ciudad son requeridos' });
    }

    const newGym = GymDatabase.create({
      nombre,
      direccion,
      telefono: telefono || teléfono || '',
      email,
      ciudad,
      pais: pais || país || '',
      capacidad_usuarios: capacidad_usuarios ?? 50,
      latitude: latitude || null,
      longitude: longitude || null,
      plan_id: plan_id || null,
      logo_url: logo_url || '',
      brand_name: brand_name || nombre,
      brand_slug: brand_slug || '',
      white_label_enabled: white_label_enabled === true || white_label_enabled === 'true',
      welcome_message: welcome_message || '',
      support_whatsapp: support_whatsapp || '',
      primary_color: primary_color || '#2563eb',
      secondary_color: secondary_color || '#10b981',
      status: status || 'active',
    });

    res.status(201).json({ message: 'Gimnasio creado exitosamente', gym: newGym });
  } catch (error) {
    console.error('Error creando gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/gyms/:id — admin gym/marca solo puede actualizar SU gym.
// super_admin y admin_d28d pueden actualizar cualquier gym (plataforma).
const updateGym = (req, res) => {
  try {
    if (!isGymManager(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    const { id } = req.params;
    const target = GymDatabase.getById(parseInt(id, 10));
    if (!target) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    if (!isPlatformAdmin(req.user) && !canAccessEntity(req.user, target)) {
      return res.status(403).json({ error: 'Solo puedes modificar tu propio gimnasio' });
    }
    const updatedGym = GymDatabase.update(parseInt(id, 10), req.body);
    res.json({ message: 'Gimnasio actualizado exitosamente', gym: updatedGym });
  } catch (error) {
    console.error('Error actualizando gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/gyms/:id/assign-plan — solo super_admin asigna planes
const assignPlanToGym = (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo super_admin puede asignar planes' });
    }
    const { id } = req.params;
    const { plan_id } = req.body || {};
    if (!plan_id) return res.status(400).json({ error: 'plan_id es requerido' });
    const updatedGym = GymDatabase.update(parseInt(id, 10), { plan_id });
    if (!updatedGym) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    return res.json({ message: 'Plan asignado al gimnasio', gym: updatedGym });
  } catch (error) {
    console.error('Error asignando plan al gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// DELETE /api/gyms/:id — super_admin y admin_d28d pueden dar de baja
// gimnasios marca blanca de la plataforma. admin_gimnasio no.
const deleteGym = (req, res) => {
  try {
    if (!isPlatformAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo administradores de plataforma pueden eliminar gimnasios' });
    }
    const { id } = req.params;
    const deleted = GymDatabase.delete(parseInt(id, 10));
    if (!deleted) return res.status(404).json({ error: 'Gimnasio no encontrado' });
    res.json({ message: 'Gimnasio eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllGyms,
  getGymById,
  getGymsByCity,
  searchGyms,
  createGym,
  updateGym,
  assignPlanToGym,
  deleteGym,
  // exposed for backward compat (no-op para no romper imports antiguos)
  checkAdminRole: (_req, _res, next) => next(),
};
