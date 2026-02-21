import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminCalculator.css';

export default function AdminCalculator() {
  const [concepts, setConcepts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    valor: '',
    descripcion: '',
  });

  // Cargar conceptos
  useEffect(() => {
    loadConcepts();
  }, []);

  const loadConcepts = async () => {
    try {
      const response = await api.get('/calculator/concepts');
      setConcepts(response.data);
    } catch (err) {
      setError('Error cargando conceptos');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/calculator/concepts/${editingId}`, formData);
        setSuccess('Concepto actualizado');
      } else {
        await api.post('/calculator/concepts', formData);
        setSuccess('Concepto creado');
      }
      resetForm();
      loadConcepts();
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando concepto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (concept) => {
    setFormData({
      nombre: concept.nombre,
      tipo: concept.tipo,
      valor: concept.valor,
      descripcion: concept.descripcion,
    });
    setEditingId(concept.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este concepto?')) return;

    try {
      await api.delete(`/calculator/concepts/${id}`);
      setSuccess('Concepto eliminado');
      loadConcepts();
    } catch (err) {
      setError(err.response?.data?.error || 'Error eliminando');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', tipo: '', valor: '', descripcion: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="admin-calculator">
      <div className="admin-header">
        <h2>Gestión de Conceptos de Calculadora</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-add">
          {showForm ? 'Cancelar' : '+ Agregar Concepto'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="concept-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecciona tipo</option>
                <option value="factor_actividad">Factor Actividad</option>
                <option value="distribucion_macro">Distribución Macros</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Valor</label>
              <input
                type="number"
                name="valor"
                step="0.01"
                value={formData.valor}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
          </button>
        </form>
      )}

      <div className="concepts-table">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {concepts.map(concept => (
              <tr key={concept.id}>
                <td>{concept.nombre}</td>
                <td><span className="badge">{concept.tipo}</span></td>
                <td><strong>{concept.valor}</strong></td>
                <td>{concept.descripcion}</td>
                <td>
                  <button onClick={() => handleEdit(concept)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(concept.id)} className="btn-delete">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
