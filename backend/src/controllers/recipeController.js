const RecipeDatabase = require('../models/RecipeDatabase');

const recipeController = {
  // Obtener todas las recetas
  getAllRecipes: (req, res) => {
    try {
      const recipes = RecipeDatabase.getAll();
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
      res.json({ success: true, data: recipe });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error al obtener receta' });
    }
  },

  // Buscar recetas
  searchRecipes: (req, res) => {
    try {
      const { query } = req.query;
      const recipes = RecipeDatabase.search(query || '');
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
  }
};

module.exports = recipeController;
