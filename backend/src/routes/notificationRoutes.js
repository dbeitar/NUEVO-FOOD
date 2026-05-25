const express = require('express');
const authMiddleware = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();
router.use(authMiddleware);
router.get('/', ctrl.listMine);
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
