const express = require('express');
const authenticateToken = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/overview', authenticateToken, adminController.getOverview);
router.get('/audit-logs', authenticateToken, adminController.getAuditLogs);

module.exports = router;
