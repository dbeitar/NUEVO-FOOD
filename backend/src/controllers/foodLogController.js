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

  getMealCombos: (req, res) => {
    try {
      const { comida = "Desayuno" } = req.query;
      // Sugerencias curadas por comida (ajustables)
      const map = {
        Desayuno: [
          2,   // Huevo
          10,  // Avena
          8,   // Pan integral
          24,  // Yogurt griego
          23,  // Fresas
          26,  // Leche descremada
          21,  // Manzana
          16,  // Almendras
        ],
        Almuerzo: [
          1,   // Pechuga de pollo
          7,   // Arroz
          18,  // Brócoli
          20,  // Zanahoria
          14,  // Aguacate
          13,  // Aceite de oliva
          22,  // Naranja (postre)
          11,  // Batata
        ],
        Cena: [
          4,   // Salmón
          3,   // Atún
          9,   // Pasta
          19,  // Espinaca
          25,  // Queso fresco
          13,  // Aceite de oliva
          7,   // Arroz
        ],
        Snack: [
          16,  // Almendras
          15,  // Nueces
          12,  // Plátano
          24,  // Yogurt griego
          21,  // Manzana
          23,  // Fresas
          17,  // Mantequilla de maní
          22,  // Naranja
        ],
      };
      const ids = map[comida] || map["Desayuno"];
      const data = ids
        .map((id) => foodItems.find((f) => f.id === id))
        .filter(Boolean);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: "Error al obtener combos" });
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

  bulkAddFoods: (req, res) => {
    try {
      const userId = req.user.id;
      const { comida, fecha, items } = req.body || {};
      if (!comida || !fecha || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "Datos inválidos" });
      }
      const created = [];
      for (const it of items) {
        const { foodId, porciones } = it || {};
        const food = foodItems.find((f) => f.id === foodId);
        if (!food) continue;
        const pors = parseInt(porciones, 10);
        if (!Number.isInteger(pors) || pors <= 0) continue;
        const cantidadConsumida = pors * food.cantidad;
        const entrada = DailyFoodLog.addFoodEntry(userId, food, cantidadConsumida, comida, fecha);
        created.push(entrada);
      }
      const totals = DailyFoodLog.getDayTotals(userId, fecha);
      res.json({ success: true, message: "Registro guardado", data: created, totals });
    } catch (e) {
      res.status(500).json({ success: false, error: "Error en guardado masivo" });
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
