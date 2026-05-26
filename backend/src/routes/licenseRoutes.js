const express = require('express');
const authMiddleware = require('../middleware/auth');
const licenseController = require('../controllers/licenseController');

const router = express.Router();

router.get('/me', authMiddleware, licenseController.getMyLicenses);
router.get('/user/:userId', authMiddleware, licenseController.getUserLicenses);
router.put('/user/:userId', authMiddleware, licenseController.putUserLicenses);

module.exports = router;
