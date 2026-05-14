const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, programController.getAllPrograms);
router.get('/:id', authMiddleware, programController.getProgramById);
router.post('/', authMiddleware, programController.createProgram);
router.put('/:id', authMiddleware, programController.updateProgram);
router.delete('/:id', authMiddleware, programController.deleteProgram);

module.exports = router;
