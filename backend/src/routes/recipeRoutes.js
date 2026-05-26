const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const auth = require('../middleware/auth'); // Asegúrate de tener este middleware
const requireRole = require('../middleware/requireRole');

// Rutas Públicas
router.get('/', recipeController.getAllRecipes);
router.get('/search', recipeController.searchRecipes);
router.get('/:id', recipeController.getRecipeById);

// Rutas Protegidas (Admin)
router.post('/', auth, requireRole(['super_admin']), recipeController.createRecipe);
router.put('/:id', auth, requireRole(['super_admin']), recipeController.updateRecipe);
router.delete('/:id', auth, requireRole(['super_admin']), recipeController.deleteRecipe);
router.post('/import', auth, requireRole(['super_admin']), recipeController.importRecipes);

module.exports = router;
