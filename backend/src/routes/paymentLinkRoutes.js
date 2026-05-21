const express = require('express');
const authMiddleware = require('../middleware/auth');
const paymentLinkController = require('../controllers/paymentLinkController');

const router = express.Router();

router.get('/public', paymentLinkController.getPublicLinks);
router.get('/admin', authMiddleware, paymentLinkController.getAdminLinks);
router.put('/admin', authMiddleware, paymentLinkController.upsertLink);

module.exports = router;
