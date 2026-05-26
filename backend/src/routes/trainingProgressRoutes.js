const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/trainingProgressController');

const router = express.Router();
router.use(auth);
router.get('/me', ctrl.getMyProgress);
router.get('/traffic-light/me', ctrl.getMyTrafficLight);
router.get('/traffic-light/clients', ctrl.getCoachClients);

module.exports = router;
