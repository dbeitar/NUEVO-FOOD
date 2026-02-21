import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Pencil, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const { user: currentUser } = useAuth();
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'usuario_final',
    gym_id: '',
    trainer_id: '',
    planId: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchResources();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch (err) {
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const [gymRes, trainerRes, plansRes] = await Promise.all([
        api.get('/gyms'),
        api.get('/trainers'),
        api.get('/accounts/plans')
      ]);
      setGyms(gymRes.data || []);
      setTrainers(trainerRes.data || []);
      const plansData = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data.data || []);
      setPlans(plansData);
    } catch (err) {
      console.error('Error loading resources', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Edit logic (assign/role)
        await api.put(`/admin/users/${editingUser.id}/role`, { rol: formData.rol });
        await api.put(`/admin/users/${editingUser.id}/assign`, { 
          gym_id: formData.gym_id || null, 
          trainer_id: formData.trainer_id || null 
        });
      } else {
        // Validaciones obligatorias para nuevo usuario
        if (!formData.planId || !formData.gym_id) {
          setError('Plan de Suscripción y Gimnasio son obligatorios');
          return;
        }
        // Validar email duplicado en cliente
        const exists = users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase());
        if (exists) {
          setError('El email ya está registrado');
          return;
        }
        // Create logic
        await api.post('/admin/users', {
          ...formData,
          gym_id: parseInt(formData.gym_id, 10),
          gymId: parseInt(formData.gym_id, 10),
          planId: formData.planId
        });
      }
      setEditingUser(null);
      setFormData({ nombre: '', email: '', password: '', rol: 'usuario_final', gym_id: '', trainer_id: '', planId: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '', // Password not shown
      rol: user.rol,
      gym_id: user.gym_id || '',
      trainer_id: user.trainer_id || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  const getRoleBadgeClass = (rol) => {
    switch (rol) {
      case 'super_admin': return 'badge-purple';
      case 'admin_gimnasio': return 'badge-blue';
      case 'entrenador': return 'badge-green';
      default: return 'badge-slate';
    }
  };

  const formatRole = (rol) => {
    return rol.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Usuarios</h2>
          <p className="text-stone-600">Gestiona usuarios y configuraciones del sistema.</p>
        </div>
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors"
          onClick={() => {
            setEditingUser(null);
            setFormData({ nombre: '', email: '', password: '', rol: 'usuario_final', gym_id: '', trainer_id: '', planId: '' });
            setShowForm(true);
          }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Form Section */}
      {showForm && (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <h4 className="text-md font-semibold text-stone-900">
            {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h4>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setEditingUser(null);
              setFormData({ nombre: '', email: '', password: '', rol: 'usuario_final', gym_id: '', trainer_id: '', planId: '' });
            }}
          >
            Cerrar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Nombre</label>
            <input 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleInputChange} 
              disabled={!!editingUser} 
              required 
              className="input disabled:bg-stone-100 disabled:text-stone-500"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              disabled={!!editingUser}
              required 
              className="input disabled:bg-stone-100 disabled:text-stone-500"
            />
            {!editingUser && users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase()) && (
              <p className="mt-1 text-sm text-red-600">Este email ya está registrado</p>
            )}
          </div>
          {!editingUser && (
            <div>
              <label className="label">Contraseña</label>
              <input 
                name="password" 
                type="password" 
                value={formData.password} 
                onChange={handleInputChange} 
                required 
                className="input"
              />
            </div>
          )}
          <div>
            <label className="label">Plan de Suscripción</label>
            <select 
              name="planId" 
              value={formData.planId} 
              onChange={handleInputChange}
              required={!editingUser}
              className="input"
            >
              <option value="">Ninguno</option>
              {plans.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rol</label>
            <select 
              name="rol" 
              value={formData.rol} 
              onChange={handleInputChange}
              className="input"
            >
              <option value="usuario_final">Usuario Final</option>
              <option value="entrenador">Entrenador</option>
              <option value="admin_gimnasio">Admin Gimnasio</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Gimnasio</label>
            <select 
              name="gym_id" 
              value={formData.gym_id} 
              onChange={handleInputChange}
              required={!editingUser}
              className="input"
            >
              <option value="">Ninguno</option>
              {gyms.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Entrenador</label>
            <select 
              name="trainer_id" 
              value={formData.trainer_id} 
              onChange={handleInputChange}
              className="input"
            >
              <option value="">Ninguno</option>
              {trainers.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button 
              type="submit" 
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={
                !editingUser && (
                  !formData.nombre ||
                  !formData.email ||
                  !formData.password ||
                  !formData.planId ||
                  !formData.gym_id ||
                  users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase())
                )
              }
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Rol</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Gimnasio</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-stone-600">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                 <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-stone-600">No hay usuarios registrados.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">#{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{user.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getRoleBadgeClass(user.rol)}`}>
                        {formatRole(user.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      {user.gym_id ? (gyms.find(g => g.id === user.gym_id)?.nombre || user.gym_id) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-100 transition-colors"
                          onClick={() => startEdit(user)}
                          title="Editar usuario"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                          onClick={() => handleDelete(user.id)}
                          disabled={currentUser && currentUser.id === user.id}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
