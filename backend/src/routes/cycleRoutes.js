const express = require('express');
const router = express.Router();
const cycleController = require('../controllers/cycleController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, cycleController.getAllCycles);
router.get('/:id', authMiddleware, cycleController.getCycleById);
router.post('/', authMiddleware, cycleController.createCycle);
router.put('/:id', authMiddleware, cycleController.updateCycle);
router.delete('/:id', authMiddleware, cycleController.deleteCycle);

module.exports = router;
