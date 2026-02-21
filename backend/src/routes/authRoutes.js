const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Registro
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Obtener perfil (requiere autenticación)
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
