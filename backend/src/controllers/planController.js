const pool = require('../config/database');

const allowedEditors = new Set(['super_admin', 'admin_gimnasio', 'entrenador']);

const planController = {
  // Obtener el plan nutricional (macros) del usuario autenticado
  getMine: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Obtener el último plan asignado
      const result = await pool.query(
        `SELECT * FROM meal_plans WHERE id_usuario = $1 ORDER BY creado_en DESC LIMIT 1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        // Retornar valores por defecto si no hay plan
        return res.json({
          success: true,
          data: {
            calorias: 2000,
            proteina: 150,
            carbohidratos: 250,
            grasas: 65,
            objetivo: 'Mantenimiento',
            nivelActividad: 'Moderado'
          }
        });
      }

      const plan = result.rows[0];
      // Mapear columnas DB a formato esperado por frontend
      const data = {
        calorias: parseFloat(plan.calorias_diarias),
        proteina: parseFloat(plan.proteinas),
        carbohidratos: parseFloat(plan.carbohidratos),
        grasas: parseFloat(plan.grasas),
        ...(plan.configuracion_calculadora || {}) // objetivo, nivelActividad, etc.
      };
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error obteniendo plan:', error);
      res.status(500).json({ success: false, error: 'Error al obtener plan' });
    }
  },

  // Actualizar (o crear) el plan nutricional para un usuario específico
  updateForUser: async (req, res) => {
    try {
      if (!allowedEditors.has(req.user.rol)) {
        return res.status(403).json({ success: false, error: 'Sin permisos para actualizar plan' });
      }
      
      const { userId } = req.params;
      const { calorias, proteina, carbohidratos, grasas, objetivo, nivelActividad } = req.body;

      // Guardar configuración extra en JSONB
      const config = { objetivo, nivelActividad };
      
      // Insertar nuevo registro para mantener historial (o podría ser UPDATE del último)
      // Por ahora insertamos uno nuevo que será el vigente por ser el más reciente
      const result = await pool.query(
        `INSERT INTO meal_plans (
          id_usuario, fecha_inicio, calorias_diarias, proteinas, carbohidratos, grasas, configuracion_calculadora
         ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, calorias, proteina, carbohidratos, grasas, config]
      );

      // Formatear respuesta
      const plan = result.rows[0];
      const data = {
        calorias: parseFloat(plan.calorias_diarias),
        proteina: parseFloat(plan.proteinas),
        carbohidratos: parseFloat(plan.carbohidratos),
        grasas: parseFloat(plan.grasas),
        ...(plan.configuracion_calculadora || {})
      };

      res.json({ success: true, data });
    } catch (error) {
      console.error('Error actualizando plan:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar plan' });
    }
  },
};

module.exports = planController;
