const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiController = require('../controllers/aiController');
const { requireModuleLicense } = require('../middleware/requireModuleLicense');

// Todas las rutas necesitan autenticación
router.use(auth);
router.use(requireModuleLicense('food'));

// GET: Verificar si IA (local) está habilitada
router.get('/enabled', aiController.isEnabled);

// GET: Sistema de equivalentes por grupo (para UI)
router.get('/equivalentes', aiController.getEquivalentes);

// POST: Obtener sugerencias de alimentos con IA (local o fallback)
router.post('/suggestions', aiController.getSuggestedFoods);

// POST: Generar receta con IA o simulada
router.post('/generate-recipe', aiController.generateRecipe);

// POST: Obtener sugerencias rápidas (sin IA)
router.post('/quick-suggestions', aiController.getQuickSuggestions);

// POST: Analizar balance nutricional del día
router.post('/analyze-balance', aiController.analyzeDayBalance);

module.exports = router;
