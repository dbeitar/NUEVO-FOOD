const express = require('express');
const authMiddleware = require('../middleware/auth');
const fitnessTestController = require('../controllers/fitnessTestController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', fitnessTestController.listTests);
router.post('/:id/enroll', fitnessTestController.enrollTest);
router.post('/:id/results', fitnessTestController.recordResult);

module.exports = router;
