const express = require('express');
const authenticateToken = require('../middleware/auth');
const ecosystemController = require('../controllers/ecosystemController');

const router = express.Router();

router.get('/overview', authenticateToken, ecosystemController.getOverview);

module.exports = router;
