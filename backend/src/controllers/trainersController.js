const TrainersDatabase = require('../models/TrainersDatabase');

// Obtener todos los entrenadores
const getAllTrainers = (req, res) => {
  try {
    const trainers = TrainersDatabase.getAll();
    res.json(trainers);
  } catch (error) {
    console.error('Error obteniendo entrenadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener entrenador por ID
const getTrainerById = (req, res) => {
  try {
    const { id } = req.params;
    const trainer = TrainersDatabase.getById(parseInt(id));
    
    if (!trainer) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    
    res.json(trainer);
  } catch (error) {
    console.error('Error obteniendo entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener entrenadores por gimnasio
const getTrainersByGym = (req, res) => {
  try {
    const { gymId } = req.params;
    const trainers = TrainersDatabase.getByGymId(parseInt(gymId));
    res.json(trainers);
  } catch (error) {
    console.error('Error obteniendo entrenadores del gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar entrenadores por especialidad
const searchBySpecialty = (req, res) => {
  try {
    const { specialty } = req.query;
    
    if (!specialty) {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }
    
    const trainers = TrainersDatabase.searchBySpecialty(specialty);
    res.json(trainers);
  } catch (error) {
    console.error('Error buscando entrenadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar entrenadores general
const searchTrainers = (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }
    
    const trainers = TrainersDatabase.search(q);
    res.json(trainers);
  } catch (error) {
    console.error('Error buscando entrenadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo entrenador (solo admin)
const createTrainer = (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const { nombre, email, teléfono, especialidad, certificaciones, experiencia_años, gym_id, horario_disponible, tarifa_sesion, capacidad_usuarios } = req.body;
    
    // Validaciones
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    
    const newTrainer = TrainersDatabase.create({
      nombre,
      email,
      teléfono,
      especialidad,
      certificaciones: certificaciones || [],
      experiencia_años: experiencia_años || 0,
      gym_id: gym_id ?? null,
      horario_disponible,
      tarifa_sesion: tarifa_sesion || 0,
      capacidad_usuarios: capacidad_usuarios ?? 50,
    });
    
    res.status(201).json({ message: 'Entrenador creado exitosamente', trainer: newTrainer });
  } catch (error) {
    console.error('Error creando entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar entrenador (solo admin)
const updateTrainer = (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const { id } = req.params;
    const updates = req.body;
    
    const updatedTrainer = TrainersDatabase.update(parseInt(id), updates);
    
    if (!updatedTrainer) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    
    res.json({ message: 'Entrenador actualizado exitosamente', trainer: updatedTrainer });
  } catch (error) {
    console.error('Error actualizando entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar entrenador (solo admin)
const deleteTrainer = (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const { id } = req.params;
    
    const deleted = TrainersDatabase.delete(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    
    res.json({ message: 'Entrenador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllTrainers,
  getTrainerById,
  getTrainersByGym,
  searchBySpecialty,
  searchTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
};
