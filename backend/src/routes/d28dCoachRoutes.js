const express = require('express');
const authMiddleware = require('../middleware/auth');
const ctrl = require('../controllers/d28dCoachController');

const router = express.Router();
router.use(authMiddleware);

router.get('/overview', ctrl.getOverview);
router.get('/training-logs', ctrl.getTrainingLogs);
router.put('/training-logs/:id', ctrl.updateTrainingLogNotes);

module.exports = router;
