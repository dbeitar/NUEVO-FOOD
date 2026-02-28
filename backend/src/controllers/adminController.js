const pool = require('../config/database');
const bcryptjs = require('bcryptjs');

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Mapeamos id_gimnasio -> gym_id, id_entrenador -> trainer_id para compatibilidad con frontend
    const result = await pool.query(`
      SELECT id, nombre, email, rol, 
             id_gimnasio AS gym_id, 
             id_entrenador AS trainer_id, 
             created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear usuario (Admin)
const createUser = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { nombre, email, password, rol, gym_id, trainer_id } = req.body;
    
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    // Verificar email único
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (nombre, email, clave_hash, rol, id_gimnasio, id_entrenador) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, nombre, email, rol, id_gimnasio AS gym_id, id_entrenador AS trainer_id`,
      [nombre, email, hash, rol || 'usuario_final', gym_id || null, trainer_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar rol
const updateUserRole = async (req, res) => {
  try {
    if (!req.user || !['super_admin'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    const { rol } = req.body;

    const result = await pool.query(
      'UPDATE users SET rol = $1 WHERE id = $2 RETURNING id, nombre, email, rol',
      [rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Asignar gimnasio/entrenador/plan
const assignUser = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;
    const { gym_id, trainer_id, plan_id } = req.body;

    // Construir query dinámica para users
    const updates = [];
    const values = [];
    let queryIdx = 1;

    if (gym_id !== undefined) {
      updates.push(`id_gimnasio = $${queryIdx++}`);
      values.push(gym_id);
    }
    if (trainer_id !== undefined) {
      updates.push(`id_entrenador = $${queryIdx++}`);
      values.push(trainer_id);
    }

    let userUpdated = null;
    if (updates.length > 0) {
      values.push(id);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${queryIdx} RETURNING id, id_gimnasio AS gym_id, id_entrenador AS trainer_id`;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      userUpdated = result.rows[0];
    }

    // Manejar asignación de plan (si se proporciona)
    // Esto requiere insertar en meal_plans
    if (plan_id) {
       // Verificar si ya tiene plan activo? O crear uno nuevo?
       // Por simplicidad, creamos uno nuevo por 30 días
       await pool.query(
         `INSERT INTO meal_plans (id_plan, id_usuario, fecha_inicio, fecha_fin, calorias_diarias, proteinas, carbohidratos, grasas, configuracion_calculadora)
          VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 2000, 150, 200, 60, '{}')`,
         [plan_id, id]
       );
    }

    res.json({ 
      success: true, 
      data: userUpdated || { id, message: 'Solo plan actualizado' } 
    });
  } catch (error) {
    console.error('Error asignando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar contraseña
const updateUserPassword = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para cambiar contraseñas' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Contraseña mínima de 6 caracteres' });
    }

    const hash = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      'UPDATE users SET clave_hash = $1 WHERE id = $2 RETURNING id',
      [hash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  assignUser,
  updateUserPassword,
  deleteUser
};
