const RecipeDatabase = require('../models/RecipeDatabase');
const { hasRole } = require('../utils/accessControl');

// Filtra recetas marcadas como `incompleta:true` cuando el solicitante no es
// admin. Mantiene el catálogo limpio frente al usuario final mientras seguimos
// poblando ingredientes y pasos reales.
const filterByAudience = (recipes, user) => {
  if (hasRole(user, ['super_admin', 'admin_gimnasio', 'admin_marca', 'admin_food', 'admin_food_plan'])) {
    return recipes;
  }
  return recipes.filter((r) => !r.incompleta);
};

const recipeController = {
  // Obtener todas las recetas
  getAllRecipes: (req, res) => {
    try {
      const recipes = filterByAudience(RecipeDatabase.getAll(), req.user);
      res.json({
        success: true,
        count: recipes.length,
        data: recipes,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener recetas' });
    }
  },

  // Obtener receta por ID
  getRecipeById: (req, res) => {
    try {
      const { id } = req.params;
      const recipe = RecipeDatabase.getById(parseInt(id));
      if (!recipe) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }
      if (recipe.incompleta && !hasRole(req.user, ['super_admin', 'admin_gimnasio', 'admin_marca', 'admin_food', 'admin_food_plan'])) {
        return res.status(404).json({ success: false, error: 'Receta no disponible' });
      }
      res.json({ success: true, data: recipe });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener receta' });
    }
  },

  // Buscar recetas
  searchRecipes: (req, res) => {
    try {
      const { query } = req.query;
      const recipes = filterByAudience(RecipeDatabase.search(query || ''), req.user);
      res.json({ success: true, count: recipes.length, data: recipes });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error en búsqueda' });
    }
  },

  // Crear receta (Admin)
  createRecipe: (req, res) => {
    try {
      const newRecipe = RecipeDatabase.create(req.body);
      res.status(201).json({ success: true, data: newRecipe });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al crear receta' });
    }
  },

  // Actualizar receta (Admin)
  updateRecipe: (req, res) => {
    try {
      const { id } = req.params;
      const updated = RecipeDatabase.update(parseInt(id), req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al actualizar receta' });
    }
  },

  // Eliminar receta (Admin)
  deleteRecipe: (req, res) => {
    try {
      const { id } = req.params;
      const success = RecipeDatabase.delete(parseInt(id));
      if (!success) {
        return res.status(404).json({ success: false, error: 'Receta no encontrada' });
      }
      res.json({ success: true, message: 'Receta eliminada' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al eliminar receta' });
    }
  },

  importRecipes: (req, res) => {
    try {
      if (!hasRole(req.user, ['super_admin', 'admin_gimnasio', 'admin_food', 'admin_food_plan'])) {
        return res.status(403).json({ success: false, error: 'No tienes permisos para importar recetas' });
      }
      const { items, mode = 'add' } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Se requiere items como array de recetas' });
      }
      const toNumber = (v) => {
        if (typeof v === 'number') return v;
        if (v == null) return 0;
        return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
      };
      const normalize = (it) => {
        const nombre = it.nombre || it.name || '';
        const ingredienteNombres = Array.isArray(it.ingredientes)
          ? it.ingredientes
          : typeof it.ingredientes === 'string'
            ? it.ingredientes.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const ingredientes = ingredienteNombres.map(n => ({
          nombre: n,
          cantidad: it.cantidad_default || 'al gusto'
        }));
        const macros = {
          calorias: toNumber(it.macros?.calorias ?? it.calorias ?? it.kcal ?? it.cal_totales),
          proteina: toNumber(it.macros?.proteina ?? it.proteina ?? it.proteina_t),
          carbohidratos: toNumber(it.macros?.carbohidratos ?? it.carbohidratos ?? it.carbos_t),
          grasas: toNumber(it.macros?.grasas ?? it.grasas ?? it.grasas_t),
        };
        return {
          codigo: it.codigo || it.id || null,
          nombre,
          descripcion: it.descripcion || '',
          ingredientes,
          instrucciones: it.instrucciones || [],
          macros,
          tiempo_preparacion: it.tiempo_preparacion || '15 min',
          dificultad: it.dificultad || 'Fácil',
          tags: Array.isArray(it.tags) ? it.tags : (it.tags ? [it.tags] : []),
          imagen: it.imagen || null,
        };
      };
      const list = items.map(normalize);
      if (mode === 'replace') {
        const count = RecipeDatabase.replaceAll(list);
        return res.json({ success: true, replaced: true, count });
      }
      let created = 0;
      const createdItems = [];
      for (const data of list) {
        const item = RecipeDatabase.create(data);
        created++;
        createdItems.push(item);
      }
      res.json({ success: true, replaced: false, created, data: createdItems });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al importar recetas' });
    }
  }
};

module.exports = recipeController;
