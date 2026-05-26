const express = require('express');
const authenticateToken = require('../middleware/auth');
const gymController = require('../controllers/gymController');

const router = express.Router();

// Todas las rutas de /api/gyms requieren autenticación.
// El controlador aplica filtro multi-tenant según el JWT.
router.use(authenticateToken);

router.get('/', gymController.getAllGyms);
router.get('/search', gymController.searchGyms);
router.get('/ciudad/:ciudad', gymController.getGymsByCity);
router.get('/:id', gymController.getGymById);

router.post('/', gymController.createGym);
router.put('/:id', gymController.updateGym);
router.put('/:id/assign-plan', gymController.assignPlanToGym);
router.delete('/:id', gymController.deleteGym);

module.exports = router;
