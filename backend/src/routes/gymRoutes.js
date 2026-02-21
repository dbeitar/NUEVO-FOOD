const express = require('express');
const authenticateToken = require('../middleware/auth');
const gymController = require('../controllers/gymController');

const router = express.Router();

// Rutas públicas
router.get('/', gymController.getAllGyms);
router.get('/:id', gymController.getGymById);
router.get('/ciudad/:ciudad', gymController.getGymsByCity);
router.get('/search', gymController.searchGyms);

// Rutas protegidas (admin)
router.post('/', authenticateToken, gymController.createGym);
router.put('/:id', authenticateToken, gymController.updateGym);
router.delete('/:id', authenticateToken, gymController.deleteGym);

module.exports = router;
