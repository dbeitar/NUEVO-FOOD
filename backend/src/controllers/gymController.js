const pool = require('../config/database');

// Obtener todos los gimnasios
const getAllGyms = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gyms ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo gimnasios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener gimnasio por ID
const getGymById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM gyms WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener gimnasios por ciudad
const getGymsByCity = async (req, res) => {
  try {
    const { ciudad } = req.params;
    // Asumiendo que la dirección contiene la ciudad
    const result = await pool.query('SELECT * FROM gyms WHERE direccion ILIKE $1', [`%${ciudad}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo gimnasios por ciudad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Buscar gimnasios
const searchGyms = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const result = await pool.query(
      'SELECT * FROM gyms WHERE nombre ILIKE $1 OR direccion ILIKE $1 OR email ILIKE $1', 
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error buscando gimnasios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear gimnasio (Admin)
const createGym = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { nombre, direccion, telefono, email, plan_contratado } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await pool.query(
      'INSERT INTO gyms (nombre, direccion, telefono, email, plan_contratado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, direccion, telefono, email, plan_contratado]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar gimnasio (Admin)
const updateGym = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    const { nombre, direccion, telefono, email, plan_contratado } = req.body;

    const result = await pool.query(
      'UPDATE gyms SET nombre = $1, direccion = $2, telefono = $3, email = $4, plan_contratado = $5 WHERE id = $6 RETURNING *',
      [nombre, direccion, telefono, email, plan_contratado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar gimnasio (Admin)
const deleteGym = async (req, res) => {
  try {
    if (!req.user || !['super_admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    
    // Verificar si tiene entrenadores asociados? O usuarios?
    // Por simplicidad, intentamos borrar. Si hay FK, fallará.
    
    const result = await pool.query('DELETE FROM gyms WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gimnasio no encontrado' });
    }

    res.json({ message: 'Gimnasio eliminado' });
  } catch (error) {
    console.error('Error eliminando gimnasio:', error);
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'No se puede eliminar el gimnasio porque tiene registros asociados (entrenadores o usuarios)' });
    }
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
  deleteGym
};
