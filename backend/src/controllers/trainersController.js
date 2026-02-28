const pool = require('../config/database');

// Obtener todos los entrenadores
const getAllTrainers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trainers ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo entrenadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener entrenador por ID
const getTrainerById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener entrenadores por gimnasio
const getTrainersByGym = async (req, res) => {
  try {
    const { gymId } = req.params;
    const result = await pool.query('SELECT * FROM trainers WHERE id_gimnasio = $1', [gymId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo entrenadores del gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar entrenadores por especialidad
const searchBySpecialty = async (req, res) => {
  try {
    const { specialty } = req.query;
    
    if (!specialty) {
      return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    }
    
    const result = await pool.query('SELECT * FROM trainers WHERE especialidad ILIKE $1', [`%${specialty}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error buscando entrenadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear entrenador (Admin)
const createTrainer = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { nombre, email, telefono, id_gimnasio, especialidad } = req.body;
    
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    const result = await pool.query(
      'INSERT INTO trainers (nombre, email, telefono, id_gimnasio, especialidad) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, email, telefono, id_gimnasio, especialidad]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar entrenador (Admin)
const updateTrainer = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    const { nombre, email, telefono, id_gimnasio, especialidad } = req.body;

    const result = await pool.query(
      'UPDATE trainers SET nombre = $1, email = $2, telefono = $3, id_gimnasio = $4, especialidad = $5 WHERE id = $6 RETURNING *',
      [nombre, email, telefono, id_gimnasio, especialidad, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando entrenador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar entrenador (Admin)
const deleteTrainer = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM trainers WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    res.json({ message: 'Entrenador eliminado' });
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
  createTrainer,
  updateTrainer,
  deleteTrainer
};
