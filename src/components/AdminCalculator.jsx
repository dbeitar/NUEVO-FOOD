import { useState, useEffect } from 'react';
import api from '../services/api';

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
    } catch {
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 font-['Playfair_Display']">Gestión de Conceptos de Calculadora</h2>
          <p className="text-stone-600">Factores de actividad y reglas para el cálculo.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors">
          {showForm ? 'Cancelar' : '+ Agregar Concepto'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="concept-form bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors">
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
                className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
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
              className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
            />
          </div>

          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors">
            {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
          </button>
        </form>
      )}

      <div className="concepts-table bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="min-w-full">
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
                <td><span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-stone-700 text-xs">{concept.tipo}</span></td>
                <td><strong>{concept.valor}</strong></td>
                <td>{concept.descripcion}</td>
                <td>
                  <button onClick={() => handleEdit(concept)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-100 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(concept.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-colors">
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
