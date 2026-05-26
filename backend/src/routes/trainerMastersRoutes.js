const express = require('express');
const authenticateToken = require('../middleware/auth');
const controller = require('../controllers/trainerMastersController');

const router = express.Router();

router.use(authenticateToken);
router.get('/', controller.getAll);
router.get('/:trainerId', controller.getByTrainerId);
router.put('/:trainerId', controller.update);
router.post('/:trainerId/users', controller.assignUser);

module.exports = router;
