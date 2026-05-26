const db = require('../config/dbClient');
const DailyFoodLog = require('../models/DailyFoodLog');
const FoodDatabase = require('../models/FoodDatabase');
const logger = require('../utils/logger');

const USE_DB = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

const foodLogController = {
  // Agregar alimento consumido al log
  addFoodToLog: async (req, res) => {
    try {
      const userId = req.user.id;
      const { foodId, cantidadConsumida, comida, fecha } = req.body;
      const ip = req.ip || req.connection.remoteAddress;

      if (!foodId || !cantidadConsumida || !comida || !fecha) {
        return res.status(400).json({ success: false, error: "Faltan campos" });
      }

      if (USE_DB) {
        // Obtener datos del alimento desde SQL
        const foodRes = await db.query('SELECT * FROM food_items WHERE id = $1 AND activo = true', [foodId]);
        const food = foodRes.rows[0];

        if (!food) {
          return res.status(404).json({ success: false, error: "Alimento no encontrado" });
        }

        // Calcular macros
        const ratio = cantidadConsumida / food.cantidad;
        const macros = {
          calorias: food.calorias * ratio,
          proteinas: food.proteina * ratio,
          carbohidratos: food.carbohidratos * ratio,
          grasas: food.grasas * ratio
        };

        // Inserción atómica en SQL
        const insertSql = `
          INSERT INTO daily_logs (id_usuario, fecha, comida, calorias_consumidas, proteinas, carbohidratos, grasas)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const result = await db.query(insertSql, [
          userId, fecha, comida, macros.calorias, macros.proteinas, macros.carbohidratos, macros.grasas
        ]);

        logger.info(`Alimento registrado: ${food.nombre}`, { 
          user_id: userId, 
          event: 'food_logged', 
          ip, 
          comida, 
          calorias: macros.calorias 
        });

        return res.json({ success: true, data: result.rows[0] });
      } else {
        // Modo JSON
        const food = FoodDatabase.getById(foodId);
        if (!food) return res.status(404).json({ success: false, error: "Alimento no encontrado" });

        const entry = DailyFoodLog.addFoodEntry(userId, food, cantidadConsumida, comida, fecha);
        
        // Mapear para compatibilidad con el front que espera totalCalorias etc
        const compatEntry = {
          ...entry,
          calorias_consumidas: entry.calorias,
          proteinas: entry.proteina
        };

        return res.json({ success: true, data: compatEntry });
      }
    } catch (error) {
      logger.error('Error en addFoodToLog', { error: error.message, stack: error.stack, user_id: req.user.id });
      res.status(500).json({ success: false, error: "Error interno" });
    }
  },

  getDayTotals: async (req, res) => {
    try {
      const userId = req.user.id;
      const { fecha } = req.query;

      if (USE_DB) {
        const result = await db.query(
          `SELECT 
            SUM(calorias_consumidas) as totalCalorias,
            SUM(proteinas) as totalProteina,
            SUM(carbohidratos) as totalCarbohidratos,
            SUM(grasas) as totalGrasas,
            COUNT(*) as totalEntries
           FROM daily_logs WHERE id_usuario = $1 AND fecha = $2`,
          [userId, fecha]
        );
        return res.json({ success: true, data: result.rows[0] || {} });
      } else {
        const totals = DailyFoodLog.getDayTotals(userId, fecha);
        return res.json({ success: true, data: totals });
      }
    } catch (error) {
      console.error('Error en getDayTotals:', error);
      res.status(500).json({ success: false, error: "Error obteniendo totales" });
    }
  },

  getMealCombos: (req, res) => res.json({ success: true, data: [] }),
  bulkAddFoods: (req, res) => res.json({ success: true }),
  getDayLogs: (req, res) => {
    const userId = req.user.id;
    const { fecha } = req.query;
    if (USE_DB) return res.json({ success: true, data: [] });
    const logs = DailyFoodLog.getDayLogs(userId, fecha);
    res.json({ success: true, data: logs });
  },
  getUserHistory: (req, res) => res.json({ success: true, data: [] }),
  aggregateByGym: (req, res) => res.json({ success: true, data: {} }),
  aggregateByTrainer: (req, res) => res.json({ success: true, data: {} }),
  updateLogEntry: (req, res) => res.json({ success: true }),
  removeFromLog: (req, res) => res.json({ success: true })
};

module.exports = foodLogController;
