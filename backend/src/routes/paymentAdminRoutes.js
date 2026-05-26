const express = require('express');
const auth = require('../middleware/auth');
const paymentAdminController = require('../controllers/paymentAdminController');

const router = express.Router();

router.get('/overview', auth, paymentAdminController.getOverview);
router.post('/confirm/:accountId', auth, paymentAdminController.confirmPayment);
router.post('/extend/:userId', auth, paymentAdminController.extendVigencia);

module.exports = router;
