const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, programController.getAllPrograms);
router.get('/:id', authMiddleware, programController.getProgramById);
router.put('/:id', authMiddleware, programController.updateProgram);

module.exports = router;
