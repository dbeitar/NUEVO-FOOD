const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  getAllConcepts,
  getConceptsByType,
  createConcept,
  updateConcept,
  deleteConcept,
} = require('../controllers/calculatorController');

const canAdjustCalculator = [
  'super_admin',
  'admin_marca',
  'admin_gimnasio',
  'entrenador',
  'nutricionista',
];

// Obtener todos los conceptos
router.get('/concepts', getAllConcepts);

// Obtener conceptos por tipo
router.get('/concepts/tipo/:tipo', getConceptsByType);

// Crear concepto (admin)
router.post('/concepts', auth, requireRole(canAdjustCalculator), createConcept);

// Actualizar concepto (admin)
router.put('/concepts/:id', auth, requireRole(canAdjustCalculator), updateConcept);

// Eliminar concepto (admin)
router.delete('/concepts/:id', auth, requireRole(canAdjustCalculator), deleteConcept);

module.exports = router;
