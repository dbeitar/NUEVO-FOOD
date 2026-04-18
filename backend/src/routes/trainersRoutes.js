const express = require('express');
const authenticateToken = require('../middleware/auth');
const trainersController = require('../controllers/trainersController');

const router = express.Router();

// Rutas públicas
router.get('/', trainersController.getAllTrainers);
router.get('/:id', trainersController.getTrainerById);
router.get('/gym/:gymId', trainersController.getTrainersByGym);
router.get('/search/specialty', trainersController.searchBySpecialty);
router.get('/search/general', trainersController.searchTrainers);

// Rutas protegidas (admin)
router.post('/', authenticateToken, trainersController.createTrainer);
router.put('/:id', authenticateToken, trainersController.updateTrainer);
router.delete('/:id', authenticateToken, trainersController.deleteTrainer);

module.exports = router;
