const concepts = require('../models/CalculatorConcepts');

// Obtener todos los conceptos
const getAllConcepts = (req, res) => {
  try {
    res.json(concepts);
  } catch (error) {
    console.error('Error obteniendo conceptos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener conceptos por tipo
const getConceptsByType = (req, res) => {
  try {
    const { tipo } = req.params;
    const filtered = concepts.filter(c => c.tipo === tipo && c.activo);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo concepto
const createConcept = (req, res) => {
  try {
    const { nombre, tipo, valor, descripcion } = req.body;

    if (!nombre || !tipo || valor === undefined) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, tipo, valor' });
    }

    const newConcept = {
      id: Math.max(...concepts.map(c => c.id), 0) + 1,
      nombre,
      tipo,
      valor: parseFloat(valor),
      descripcion: descripcion || '',
      activo: true,
    };

    concepts.push(newConcept);
    res.status(201).json(newConcept);
  } catch (error) {
    console.error('Error creando concepto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar concepto
const updateConcept = (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, valor, descripcion, activo } = req.body;

    const concept = concepts.find(c => c.id === parseInt(id));
    if (!concept) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    if (nombre) concept.nombre = nombre;
    if (tipo) concept.tipo = tipo;
    if (valor !== undefined) concept.valor = parseFloat(valor);
    if (descripcion !== undefined) concept.descripcion = descripcion;
    if (activo !== undefined) concept.activo = activo;

    res.json(concept);
  } catch (error) {
    console.error('Error actualizando concepto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar concepto
const deleteConcept = (req, res) => {
  try {
    const { id } = req.params;
    const index = concepts.findIndex(c => c.id === parseInt(id));

    if (index === -1) {
      return res.status(404).json({ error: 'Concepto no encontrado' });
    }

    const deleted = concepts.splice(index, 1);
    res.json({ message: 'Concepto eliminado', deleted: deleted[0] });
  } catch (error) {
    console.error('Error eliminando concepto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllConcepts,
  getConceptsByType,
  createConcept,
  updateConcept,
  deleteConcept,
};
