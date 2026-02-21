const foodItems = require("../models/FoodItems");
const DailyFoodLog = require("../models/DailyFoodLog");

const foodLogController = {
  // Buscar alimentos por nombre o categoría
  searchFoods: (req, res) => {
    try {
      const { query, categoria } = req.query;

      let results = foodItems;

      if (query) {
        results = results.filter((food) =>
          food.nombre.toLowerCase().includes(query.toLowerCase())
        );
      }

      if (categoria) {
        results = results.filter(
          (food) =>
            food.categoria.toLowerCase() === categoria.toLowerCase()
        );
      }

      res.json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al buscar alimentos",
      });
    }
  },

  // Obtener categorías disponibles
  getCategories: (req, res) => {
    try {
      const categories = [...new Set(foodItems.map((food) => food.categoria))];
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener categorías",
      });
    }
  },

  // Obtener todos los alimentos
  getAllFoods: (req, res) => {
    try {
      res.json({
        success: true,
        count: foodItems.length,
        data: foodItems,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener alimentos",
      });
    }
  },

  // Agregar alimento consumido al log
  addFoodToLog: (req, res) => {
    try {
      const userId = req.user.id;
      const { foodId, cantidadConsumida, comida, fecha } = req.body;

      // Validar datos
      if (!foodId || !cantidadConsumida || !comida || !fecha) {
        return res.status(400).json({
          success: false,
          error: "Faltan campos requeridos",
        });
      }

      // Buscar el alimento
      const food = foodItems.find((f) => f.id === foodId);
      if (!food) {
        return res.status(404).json({
          success: false,
          error: "Alimento no encontrado",
        });
      }

      // Agregar al log
      const entrada = DailyFoodLog.addFoodEntry(
        userId,
        food,
        cantidadConsumida,
        comida,
        fecha
      );

      res.json({
        success: true,
        message: "Alimento agregado al log",
        data: entrada,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al agregar alimento al log",
      });
    }
  },

  // Obtener registros del día
  getDayLogs: (req, res) => {
    try {
      const userId = req.user.id;
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({
          success: false,
          error: "Fecha requerida (YYYY-MM-DD)",
        });
      }

      const logs = DailyFoodLog.getDayLogs(userId, fecha);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener registros del día",
      });
    }
  },

  // Obtener totales del día
  getDayTotals: (req, res) => {
    try {
      const userId = req.user.id;
      const { fecha } = req.query;

      if (!fecha) {
        return res.status(400).json({
          success: false,
          error: "Fecha requerida (YYYY-MM-DD)",
        });
      }

      const totals = DailyFoodLog.getDayTotals(userId, fecha);

      res.json({
        success: true,
        data: totals,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener totales del día",
      });
    }
  },

  // Eliminar entrada del log
  removeFromLog: (req, res) => {
    try {
      const userId = req.user.id;
      const { entryId } = req.params;

      const removed = DailyFoodLog.removeEntry(parseInt(entryId), userId);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: "Entrada no encontrada",
        });
      }

      res.json({
        success: true,
        message: "Entrada eliminada",
        data: removed,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al eliminar entrada",
      });
    }
  },

  // Obtener histórico del usuario
  getUserHistory: (req, res) => {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.query;

      const history = DailyFoodLog.getUserHistory(userId, parseInt(days));

      res.json({
        success: true,
        days: parseInt(days),
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener histórico",
      });
    }
  },

  // Actualizar entrada del log
  updateLogEntry: (req, res) => {
    try {
      const userId = req.user.id;
      const { entryId } = req.params;
      const updates = req.body;

      const updated = DailyFoodLog.updateEntry(
        parseInt(entryId),
        userId,
        updates
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Entrada no encontrada",
        });
      }

      res.json({
        success: true,
        message: "Entrada actualizada",
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al actualizar entrada",
      });
    }
  },
};

module.exports = foodLogController;
