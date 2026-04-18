const express = require('express');
const authenticateToken = require('../middleware/auth');
const { getOverview } = require('../controllers/adminController');

const router = express.Router();

router.get('/overview', authenticateToken, getOverview);

module.exports = router;
