const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  adminResetPassword,
  refreshSession,
  logoutUser,
} = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Registro
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Obtener perfil (requiere autenticación)
router.get('/profile', authenticateToken, getProfile);
router.post('/refresh-session', authenticateToken, refreshSession);
router.post('/logout', authenticateToken, logoutUser);

// Admin: reset de contraseña (requiere token admin)
router.post('/admin/reset-password', authenticateToken, adminResetPassword);

module.exports = router;
