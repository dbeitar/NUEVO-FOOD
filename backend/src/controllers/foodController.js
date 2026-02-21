const FoodDatabase = require("../models/FoodDatabase");

const foodController = {
  // Obtener todos los alimentos
  getAllFoods: (req, res) => {
    try {
      const foods = FoodDatabase.getAll();
      res.json({
        success: true,
        count: foods.length,
        data: foods,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al obtener alimentos",
      });
    }
  },

  // Buscar alimento por código de barras
  getByBarcode: (req, res) => {
    try {
      const { barcode } = req.params;

      if (!barcode) {
        return res.status(400).json({
          success: false,
          error: "Código de barras requerido",
        });
      }

      const food = FoodDatabase.findByBarcode(barcode);

      if (!food) {
        return res.status(404).json({
          success: false,
          error: "Alimento no encontrado",
          barcode,
        });
      }

      res.json({
        success: true,
        data: food,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al buscar alimento",
      });
    }
  },

  // Buscar alimentos por nombre o marca
  searchFoods: (req, res) => {
    try {
      const { query, categoria } = req.query;

      let results = [];

      if (query) {
        results = FoodDatabase.search(query);
      } else {
        results = FoodDatabase.getAll();
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

  // Obtener categorías
  getCategories: (req, res) => {
    try {
      const categories = FoodDatabase.getCategories();
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

  importFoods: (req, res) => {
    try {
      if (req.user.rol !== "super_admin" && req.user.rol !== "admin_gimnasio") {
        return res.status(403).json({
          success: false,
          error: "No tienes permisos para importar alimentos",
        });
      }
      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Se requiere items como array de alimentos",
        });
      }
      const normalize = (it) => {
        const categoria = it.categoria || it.category || "";
        return {
          nombre: it.nombre || it.name,
          barcode: it.barcode || it.codigo || null,
          categoria: categoria
            .toLowerCase()
            .replace("carbohidrato", "Carbohidratos")
            .replace("carbohidratos", "Carbohidratos")
            .replace("proteinas", "Proteínas")
            .replace("proteína", "Proteínas")
            .replace("proteinas", "Proteínas")
            .replace("grasas", "Grasas")
            .replace("grasa", "Grasas")
            .replace(/^prote.*$/i, "Proteínas")
            .replace(/^carbo.*$/i, "Carbohidratos")
            .replace(/^gras.*$/i, "Grasas")
            .replace(/^$/i, "Proteínas")
            .replace(/^\w/, (c) => c.toUpperCase()),
          marca: it.marca || it.brand || "Genérica",
          cantidad: parseFloat(it.cantidad || it.portion || it.serving || 100),
          unidad: it.unidad || it.unit || "g",
          calorias:
            parseFloat(it.calorias ?? it.kcal ?? it.calories ?? it.energy) || 0,
          proteina:
            parseFloat(it.proteina ?? it.protein ?? it.proteins ?? 0) || 0,
          carbohidratos:
            parseFloat(
              it.carbohidratos ?? it.carbs ?? it.carbohydrates ?? 0
            ) || 0,
          grasas: parseFloat(it.grasas ?? it.fats ?? it.fat ?? 0) || 0,
        };
      };
      let created = 0;
      let skipped = 0;
      const createdItems = [];
      items.forEach((raw) => {
        const data = normalize(raw);
        if (!data.nombre || !data.categoria || !data.cantidad || !data.unidad) {
          skipped++;
          return;
        }
        if (data.barcode && FoodDatabase.findByBarcode(data.barcode)) {
          skipped++;
          return;
        }
        const item = FoodDatabase.create(data);
        created++;
        createdItems.push(item);
      });
      res.json({
        success: true,
        created,
        skipped,
        data: createdItems,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al importar alimentos",
      });
    }
  },

  // ADMIN: Crear nuevo alimento
  createFood: (req, res) => {
    try {
      // Verificar que sea admin
      if (req.user.rol !== "super_admin" && req.user.rol !== "admin_gimnasio") {
        return res.status(403).json({
          success: false,
          error: "No tienes permisos para crear alimentos",
        });
      }

      const {
        nombre,
        barcode,
        categoria,
        marca,
        cantidad,
        unidad,
        calorias,
        proteina,
        carbohidratos,
        grasas,
      } = req.body;

      // Validar campos requeridos
      if (!nombre || !categoria || !cantidad || !unidad) {
        return res.status(400).json({
          success: false,
          error: "Faltan campos requeridos",
        });
      }

      // Validar que no exista otro alimento con el mismo barcode
      if (barcode && FoodDatabase.findByBarcode(barcode)) {
        return res.status(409).json({
          success: false,
          error: "Ya existe un alimento con este código de barras",
        });
      }

      const newFood = FoodDatabase.create({
        nombre,
        barcode: barcode || null,
        categoria,
        marca: marca || "Genérica",
        cantidad: parseFloat(cantidad),
        unidad,
        calorias: parseFloat(calorias) || 0,
        proteina: parseFloat(proteina) || 0,
        carbohidratos: parseFloat(carbohidratos) || 0,
        grasas: parseFloat(grasas) || 0,
      });

      res.status(201).json({
        success: true,
        message: "Alimento creado exitosamente",
        data: newFood,
      });
    } catch (error) {
      console.error("Error creando alimento:", error);
      res.status(500).json({
        success: false,
        error: "Error al crear alimento",
      });
    }
  },

  // ADMIN: Actualizar alimento
  updateFood: (req, res) => {
    try {
      // Verificar que sea admin
      if (req.user.rol !== "super_admin" && req.user.rol !== "admin_gimnasio") {
        return res.status(403).json({
          success: false,
          error: "No tienes permisos para editar alimentos",
        });
      }

      const { foodId } = req.params;
      const updates = req.body;

      const updated = FoodDatabase.update(parseInt(foodId), {
        ...updates,
        cantidad: updates.cantidad ? parseFloat(updates.cantidad) : undefined,
        calorias: updates.calorias ? parseFloat(updates.calorias) : undefined,
        proteina: updates.proteina ? parseFloat(updates.proteina) : undefined,
        carbohidratos: updates.carbohidratos
          ? parseFloat(updates.carbohidratos)
          : undefined,
        grasas: updates.grasas ? parseFloat(updates.grasas) : undefined,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Alimento no encontrado",
        });
      }

      res.json({
        success: true,
        message: "Alimento actualizado exitosamente",
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al actualizar alimento",
      });
    }
  },

  // ADMIN: Eliminar alimento (soft delete)
  deleteFood: (req, res) => {
    try {
      // Verificar que sea admin
      if (req.user.rol !== "super_admin" && req.user.rol !== "admin_gimnasio") {
        return res.status(403).json({
          success: false,
          error: "No tienes permisos para eliminar alimentos",
        });
      }

      const { foodId } = req.params;

      const deleted = FoodDatabase.delete(parseInt(foodId));

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Alimento no encontrado",
        });
      }

      res.json({
        success: true,
        message: "Alimento eliminado exitosamente",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error al eliminar alimento",
      });
    }
  },
};

module.exports = foodController;
