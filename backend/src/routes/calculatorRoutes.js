const express = require('express');
const router = express.Router();
const {
  getAllConcepts,
  getConceptsByType,
  createConcept,
  updateConcept,
  deleteConcept,
} = require('../controllers/calculatorController');

// Obtener todos los conceptos
router.get('/concepts', getAllConcepts);

// Obtener conceptos por tipo
router.get('/concepts/tipo/:tipo', getConceptsByType);

// Crear concepto (admin)
router.post('/concepts', createConcept);

// Actualizar concepto (admin)
router.put('/concepts/:id', updateConcept);

// Eliminar concepto (admin)
router.delete('/concepts/:id', deleteConcept);

module.exports = router;
