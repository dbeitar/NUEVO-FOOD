const express = require('express');
const authenticateToken = require('../middleware/auth');
const trainersController = require('../controllers/trainersController');

const router = express.Router();

// Todas las rutas de /api/trainers requieren autenticación.
// El controlador aplica filtro multi-tenant según el JWT.
router.use(authenticateToken);

router.get('/', trainersController.getAllTrainers);
router.get('/search/specialty', trainersController.searchBySpecialty);
router.get('/search/general', trainersController.searchTrainers);
router.get('/gym/:gymId', trainersController.getTrainersByGym);
router.get('/:id', trainersController.getTrainerById);

router.post('/', trainersController.createTrainer);
router.put('/:id', trainersController.updateTrainer);
router.delete('/:id', trainersController.deleteTrainer);

module.exports = router;
