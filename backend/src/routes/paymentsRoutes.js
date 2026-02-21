const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paymentsController = require('../controllers/paymentsController');

router.use(auth);

router.post('/checkout', paymentsController.createCheckout);
router.post('/:id/confirm', paymentsController.confirm);
router.get('/mine', paymentsController.myPayments);

module.exports = router;
