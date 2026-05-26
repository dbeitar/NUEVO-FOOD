const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/helpController');

const router = express.Router();
router.post('/ask', auth, ctrl.ask);
router.get('/suggestions/:modulo', auth, ctrl.suggestions);
router.post('/escalate', auth, ctrl.escalate);

module.exports = router;
