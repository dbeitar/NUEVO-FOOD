import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_mensual: 0,
    max_users: 0,
    features: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/accounts/plans');
      // Ensure we get an array
      const plansData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setPlans(plansData);
    } catch (err) {
      setError('Error cargando planes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        // Edit logic
        await api.put(`/accounts/plans/${editingPlan.nombre}`, {
          ...formData,
          features: formData.features.split(',').map(f => f.trim())
        });
      } else {
        // Create logic
        await api.post('/accounts/plans', {
          ...formData,
          features: formData.features.split(',').map(f => f.trim())
        });
      }
      setEditingPlan(null);
      setFormData({ nombre: '', descripcion: '', precio_mensual: 0, max_users: 0, features: '' });
      setShowForm(false);
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      precio_mensual: plan.precio_mensual,
      max_users: plan.max_users || 0,
      features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features
    });
    setShowForm(true);
  };

  const handleDelete = async (nombre) => {
    if (!window.confirm('¿Seguro que deseas eliminar este plan?')) return;
    try {
      await api.delete(`/accounts/plans/${nombre}`);
      fetchPlans();
    } catch (err) {
      setError('Error al eliminar plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-stone-900">Planes de Suscripción</h3>
        {!showForm && (
          <button 
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => {
              setEditingPlan(null);
              setFormData({ nombre: '', descripcion: '', precio_mensual: 0, max_users: 0, features: '' });
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Plan
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      {showForm ? (
        <div className="card">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
            <h4 className="text-md font-semibold text-stone-900">{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</h4>
            <button 
              className="text-sm text-stone-500 hover:text-stone-900" 
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre del Plan</label>
              <input 
                name="nombre" 
                value={formData.nombre} 
                onChange={handleInputChange} 
                disabled={!!editingPlan} 
                required 
                className="input disabled:bg-stone-100"
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea 
                name="descripcion" 
                value={formData.descripcion} 
                onChange={handleInputChange} 
                required 
                rows="3"
                className="input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Precio Mensual (COP)</label>
                <input 
                  name="precio_mensual" 
                  type="number" 
                  value={formData.precio_mensual} 
                  onChange={handleInputChange} 
                  required 
                  className="input"
                />
              </div>
              <div>
                <label className="label">Máximo de Usuarios</label>
                <input 
                  name="max_users" 
                  type="number" 
                  value={formData.max_users} 
                  onChange={handleInputChange} 
                  required 
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Características (separadas por coma)</label>
              <input 
                name="features" 
                value={formData.features} 
                onChange={handleInputChange} 
                placeholder="Ej: Acceso 24/7, Entrenador Personal"
                className="input"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary">
                Guardar Plan
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-stone-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Precio</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Cupo Máx</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Activos</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-400">Cargando planes...</td></tr>
                ) : plans.length > 0 ? (
                  plans.map(plan => (
                    <tr key={plan.nombre} className="hover:bg-stone-100 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{plan.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">${plan.precio_mensual?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{plan.max_users}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{plan.usuarios_activos || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="text-lime-700 hover:text-black bg-stone-100 hover:bg-lime-400 p-2 rounded-lg transition-colors"
                            onClick={() => handleEdit(plan)}
                            title="Editar plan"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                            onClick={() => handleDelete(plan.nombre)}
                            title="Eliminar plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-400">No hay planes disponibles. Crea uno nuevo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
