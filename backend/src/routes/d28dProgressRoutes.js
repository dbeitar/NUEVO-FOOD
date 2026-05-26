const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/d28dProgressController');

const router = express.Router();
router.use(auth);
router.get('/me', ctrl.getMyProgress);
router.get('/overview', ctrl.getAdminOverview);
router.get('/user/:userId', ctrl.getUserProgress);
router.post('/recompute', ctrl.recompute);

module.exports = router;
