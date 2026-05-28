const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/faqController');

const router = express.Router();
router.get('/:modulo/search', ctrl.search);
router.get('/:modulo', ctrl.list);
router.post('/:modulo/categories', auth, ctrl.createCategory);
router.post('/:modulo/items', auth, ctrl.createItem);
router.put('/:modulo/items/:itemId', auth, ctrl.updateItem);
router.delete('/:modulo/items/:itemId', auth, ctrl.deleteItem);
router.post('/:modulo/items/:itemId/rate', auth, ctrl.rate);

module.exports = router;
