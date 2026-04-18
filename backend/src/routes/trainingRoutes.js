const express = require('express');
const auth = require('../middleware/auth');
const { generatePlanJson } = require('../controllers/trainingController');

const router = express.Router();

router.use(auth);
router.post('/plan-json', generatePlanJson);

module.exports = router;
