const express = require('express');
const authMiddleware = require('../middleware/auth');
const { uploadFrontendImage } = require('../middleware/frontendUpload');
const frontendConfigController = require('../controllers/frontendConfigController');

const router = express.Router();

router.get('/public', frontendConfigController.getPublicConfig);
router.get('/admin', authMiddleware, frontendConfigController.getAdminConfig);
router.put('/admin', authMiddleware, frontendConfigController.updateAdminConfig);
router.post('/admin/upload', authMiddleware, (req, res, next) => {
  uploadFrontendImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error subiendo archivo' });
    return next();
  });
}, frontendConfigController.uploadAsset);
router.post('/admin/reset', authMiddleware, frontendConfigController.resetAdminConfig);

module.exports = router;
