const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// Todas las rutas necesitan autenticación
router.use(auth);

// GET: Verificar si IA (OpenAI) está habilitada
router.get('/enabled', aiController.isEnabled);

// POST: Obtener sugerencias de alimentos con IA (OpenAI)
router.post('/suggestions', aiController.getSuggestedFoods);

// POST: Obtener sugerencias rápidas (sin IA)
router.post('/quick-suggestions', aiController.getQuickSuggestions);

// POST: Analizar balance nutricional del día
router.post('/analyze-balance', aiController.analyzeDayBalance);

module.exports = router;
