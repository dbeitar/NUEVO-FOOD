const express = require('express');
const authMiddleware = require('../middleware/auth');
const liveClassController = require('../controllers/liveClassController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', liveClassController.getPublicClasses);
router.get('/admin', liveClassController.getAdminClasses);
router.post('/admin', liveClassController.createClass);
router.put('/admin/:id', liveClassController.updateClass);
router.delete('/admin/:id', liveClassController.deleteClass);

module.exports = router;
