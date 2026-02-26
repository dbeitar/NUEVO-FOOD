const GymDatabase = require('../models/GymDatabase');

// Middleware para verificar si es admin
const checkAdminRole = (req, res, next) => {
  if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  }
  next();
};

// Obtener todos los gimnasios
const getAllGyms = (req, res) => {
  try {
    const gyms = GymDatabase.getAll();
    res.json(gyms);
  } catch (error) {
    console.error('Error obteniendo gimnasios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener gimnasio por ID
const getGymById = (req, res) => {
  try {
    const { id } = req.params;
    const gym = GymDatabase.getById(parseInt(id));
    
    if (!gym) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }
    
    res.json(gym);
  } catch (error) {
    console.error('Error obteniendo gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener gimnasios por ciudad
const getGymsByCity = (req, res) => {
  try {
    const { ciudad } = req.params;
    const gyms = GymDatabase.getByCiudad(ciudad);
    res.json(gyms);
  } catch (error) {
    console.error('Error obteniendo gimnasios por ciudad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar gimnasios
const searchGyms = (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }
    
    const gyms = GymDatabase.search(q);
    res.json(gyms);
  } catch (error) {
    console.error('Error buscando gimnasios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo gimnasio (solo admin)
const createGym = (req, res) => {
  try {
    checkAdminRole(req, res, () => {
      const { nombre, direccion, teléfono, email, ciudad, país, Basico, latitude, longitude, capacidad_usuarios } = req.body;
      
      // Validaciones
      if (!nombre || !email || !ciudad) {
        return res.status(400).json({ error: 'Nombre, email y ciudad son requeridos' });
      }
      
      const newGym = GymDatabase.create({
        nombre,
        direccion,
        teléfono,
        email,
        ciudad,
        país,
        capacidad_usuarios: capacidad_usuarios ?? 50,
        latitude: latitude || null,
        longitude: longitude || null,
      });
      
      res.status(201).json({ message: 'Gimnasio creado exitosamente', gym: newGym });
    });
  } catch (error) {
    console.error('Error creando gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar gimnasio (solo admin)
const updateGym = (req, res) => {
  try {
    checkAdminRole(req, res, () => {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedGym = GymDatabase.update(parseInt(id), updates);
      
      if (!updatedGym) {
        return res.status(404).json({ error: 'Gimnasio no encontrado' });
      }
      
      res.json({ message: 'Gimnasio actualizado exitosamente', gym: updatedGym });
    });
  } catch (error) {
    console.error('Error actualizando gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar gimnasio (solo admin)
const deleteGym = (req, res) => {
  try {
    checkAdminRole(req, res, () => {
      const { id } = req.params;
      
      const deleted = GymDatabase.delete(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ error: 'Gimnasio no encontrado' });
      }
      
      res.json({ message: 'Gimnasio eliminado exitosamente' });
    });
  } catch (error) {
    console.error('Error eliminando gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  checkAdminRole,
  getAllGyms,
  getGymById,
  getGymsByCity,
  searchGyms,
  createGym,
  updateGym,
  deleteGym,
};
