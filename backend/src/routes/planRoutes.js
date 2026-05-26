const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const planController = require('../controllers/planController');
const { requireModuleLicense } = require('../middleware/requireModuleLicense');

router.use(auth);
router.use(requireModuleLicense('food'));

router.get('/mine', planController.getMine);
router.put('/:userId', planController.updateForUser);

module.exports = router;
