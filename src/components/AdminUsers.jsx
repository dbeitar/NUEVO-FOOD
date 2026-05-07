import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Pencil, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewTab, setViewTab] = useState('users'); // 'users' | 'gyms' | 'trainers'
  const [showAssignedModal, setShowAssignedModal] = useState(false);
  const [assignedTitle, setAssignedTitle] = useState('');
  const [assignedList, setAssignedList] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    roles: ['usuario_final'],
    gym_id: '',
    trainer_id: '',
    planId: ''
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || []);
    } catch {
      setError(t('users.error_loading', 'Error cargando usuarios'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchResources = useCallback(async () => {
    try {
      const [gymRes, trainerRes, plansRes, progRes] = await Promise.all([
        api.get('/gyms'),
        api.get('/trainers'),
        api.get('/accounts/plans'),
        api.get('/programs')
      ]);
      setGyms(gymRes.data || []);
      setTrainers(trainerRes.data || []);
      const plansData = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data.data || []);
      setPlans(plansData);
      setPrograms(progRes.data.data || []);
    } catch {
      console.error('Error loading resources');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchResources();
  }, [fetchUsers, fetchResources]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Edit logic (assign/role)
        await api.put(`/admin/users/${editingUser.id}/role`, { roles: formData.roles });
        await api.put(`/admin/users/${editingUser.id}/assign`, { 
          gym_id: formData.roles.includes('usuario_final') ? (formData.gym_id || null) : null, 
          trainer_id: formData.trainer_id || null 
        });
      } else {
        // Validaciones obligatorias para nuevo usuario
        if (!formData.planId) {
          setError(t('plans.subscription', 'Plan de Suscripción') + ' ' + t('common.name_required', 'Nombre *').replace('Nombre *','es obligatorio'));
          return;
        }
        if (formData.roles.includes('usuario_final') && !formData.gym_id) {
          setError(t('common.gym', 'Gimnasio') + ' ' + t('common.name_required', 'Nombre *').replace('Nombre *','es obligatorio') + ' ' + '(Usuario Final)');
          return;
        }
        // Validar email duplicado en cliente
        const exists = users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase());
        if (exists) {
          setError(t('users.email_exists', 'Este email ya está registrado'));
          return;
        }
        // Create logic
        await api.post('/admin/users', {
          ...formData,
          rol: formData.roles[0] || 'usuario_final',
          roles: formData.roles,
          gym_id: formData.roles.includes('usuario_final') && formData.gym_id ? parseInt(formData.gym_id, 10) : undefined,
          gymId: formData.roles.includes('usuario_final') && formData.gym_id ? parseInt(formData.gym_id, 10) : undefined,
          planId: formData.planId
        });
      }
      setEditingUser(null);
      setFormData({ nombre: '', email: '', password: '', roles: ['usuario_final'], gym_id: '', trainer_id: '', planId: '' });
      fetchUsers();
    } catch {
      setError(t('trainers.save_error', 'Error al guardar'));
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '', // Password not shown
      roles: user.roles && user.roles.length ? user.roles : [user.rol || 'usuario_final'],
      gym_id: user.gym_id || '',
      trainer_id: user.trainer_id || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('users.delete_confirm', '¿Estás seguro de eliminar este usuario?'))) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch {
      setError(t('users.delete_error', 'Error al eliminar usuario'));
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
    if (!rol) return '-';
    return String(rol).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 font-['Playfair_Display']">{t('users.title', 'Usuarios')}</h2>
          <p className="text-stone-600">{t('users.subtitle', 'Gestiona usuarios y configuraciones del sistema.')}</p>
          {(currentUser?.rol === 'super_admin') && (
            <div className="mt-3 inline-flex gap-2 bg-stone-100 p-1 rounded-2xl">
              <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='users'?'bg-white shadow':''}`} onClick={() => setViewTab('users')}>{t('users.tabs.users', 'Usuarios')}</button>
              <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='gyms'?'bg-white shadow':''}`} onClick={() => setViewTab('gyms')}>{t('users.tabs.gyms', 'Gimnasios')}</button>
              <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='trainers'?'bg-white shadow':''}`} onClick={() => setViewTab('trainers')}>{t('users.tabs.trainers', 'Entrenadores')}</button>
            </div>
          )}
        </div>
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors"
          onClick={() => {
            setEditingUser(null);
            setFormData({ nombre: '', email: '', password: '', roles: ['usuario_final'], gym_id: '', trainer_id: '', planId: '' });
            setShowForm(true);
          }}
        >
          <UserPlus className="w-4 h-4" />
          {t('users.new_user', 'Nuevo Usuario')}
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
            {editingUser ? t('users.edit_user', 'Editar Usuario') : t('users.create_user', 'Crear Nuevo Usuario')}
          </h4>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowForm(false);
              setEditingUser(null);
              setFormData({ nombre: '', email: '', password: '', roles: ['usuario_final'], gym_id: '', trainer_id: '', planId: '' });
            }}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">{t('common.name', 'Nombre')}</label>
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
            <label className="label">{t('common.email', 'Email')}</label>
            <input 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              disabled={!!editingUser}
              required 
              className="input disabled:bg-stone-100 disabled:text-stone-500"
            />
            {!editingUser && users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase()) && (
              <p className="mt-1 text-sm text-red-600">{t('users.email_exists', 'Este email ya está registrado')}</p>
            )}
          </div>
          {!editingUser && (
            <div>
              <label className="label">{t('auth.password', 'Contraseña')}</label>
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
            <label className="label">{t('plans.subscription', 'Plan de Suscripción')}</label>
            <select 
              name="planId" 
              value={formData.planId} 
              onChange={handleInputChange}
              required={!editingUser}
              className="input"
            >
              <option value="">{t('common.none', 'Ninguno')}</option>
              {plans.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('common.roles', 'Roles')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {[
                { value: 'usuario_final', label: 'Usuario Final' },
                { value: 'entrenador', label: 'Entrenador' },
                { value: 'nutricionista', label: 'Nutricionista' },
                { value: 'admin_gimnasio', label: 'Admin Gimnasio' },
                { value: 'admin_food_plan', label: 'Admin Food Plan' },
                { value: 'admin_d28d', label: 'Admin D28D' },
                { value: 'admin_training', label: 'Admin Entrenadores' },
                { value: 'admin_gym', label: 'Admin Maestro Gym' },
                { value: 'super_admin', label: 'Super Admin' }
              ].map(role => (
                <label key={role.value} className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-100">
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role.value)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        roles: checked 
                          ? [...prev.roles, role.value] 
                          : prev.roles.filter(r => r !== role.value)
                      }));
                    }}
                    className="rounded border-stone-300 text-lime-600 focus:ring-lime-500"
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
          {formData.roles.includes('usuario_final') && (
            <>
              <div>
                <label className="label">{t('common.gym', 'Gimnasio')}</label>
                <select 
                  name="gym_id" 
                  value={formData.gym_id} 
                  onChange={handleInputChange}
                  required={!editingUser}
                  className="input"
                >
                  <option value="">{t('common.none', 'Ninguno')}</option>
                  {gyms.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('common.trainer', 'Entrenador')}</label>
                <select 
                  name="trainer_id" 
                  value={formData.trainer_id} 
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">{t('common.none', 'Ninguno')}</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button 
              type="submit" 
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={
                (!editingUser && (
                  !formData.nombre ||
                  !formData.email ||
                  !formData.password ||
                  !formData.planId ||
                  (formData.roles.includes('usuario_final') && !formData.gym_id) ||
                  users.some(u => String(u.email).toLowerCase() === String(formData.email).toLowerCase())
                )) || formData.roles.length === 0
              }
            >
              {t('common.save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Gyms Summary */}
      {viewTab === 'gyms' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-md font-semibold text-stone-900">{t('users.gyms_summary', 'Resumen de Gimnasios')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.id', 'ID')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.name', 'Nombre')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.city', 'Ciudad')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('plans.capacity', 'Cupo Máx')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {gyms.map(g => (
                  <tr key={g.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">#{g.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{g.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{g.ciudad || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600">{g.capacidad_usuarios ?? 50}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-100 transition-colors"
                        onClick={() => {
                          const list = users.filter(u => (u.gym_id || u.gymId) === g.id);
                          setAssignedTitle(t('companies.users_of_gym', 'Usuarios del Gimnasio: {name}').replace('{name}', g.nombre));
                          setAssignedList(list);
                          setShowAssignedModal(true);
                        }}
                      >
                        {t('users.view_users', 'Ver usuarios')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trainers Summary */}
      {viewTab === 'trainers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-md font-semibold text-stone-900">{t('users.trainers_summary', 'Resumen de Entrenadores')}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.id', 'ID')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.name', 'Nombre')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('trainers.specialty', 'Especialidad')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('plans.capacity', 'Cupo Máx')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {trainers.map(t => (
                  <tr key={t.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">#{t.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{t.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{t.especialidad || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600">{t.capacidad_usuarios ?? 50}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-100 transition-colors"
                        onClick={() => {
                          const list = users.filter(u => u.trainer_id === t.id);
                          setAssignedTitle(t('companies.users_of_trainer', 'Usuarios del Entrenador: {name}').replace('{name}', t.nombre));
                          setAssignedList(list);
                          setShowAssignedModal(true);
                        }}
                      >
                        {t('users.view_users', 'Ver usuarios')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table Section */}
      {viewTab === 'users' && (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.id', 'ID')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.name', 'Nombre')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.email', 'Email')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.role', 'Rol')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.gym', 'Gimnasio')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Programa</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                    <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-stone-600">{t('users.loading', 'Cargando usuarios...')}</td></tr>
              ) : users.length === 0 ? (
                 <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-stone-600">{t('users.none', 'No hay usuarios registrados.')}</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">#{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{user.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles && user.roles.length ? user.roles : [user.rol]).map(r => (
                          <span key={r} className={`badge ${getRoleBadgeClass(r)} text-xs px-2 py-0.5 whitespace-nowrap`}>
                            {formatRole(r)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      {user.gym_id ? (gyms.find(g => g.id === user.gym_id)?.nombre || user.gym_id) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      {(() => {
                        const plan = plans.find(p => p.nombre === user.planId);
                        const program = programs.find(p => p.id === plan?.program_id);
                        return program ? <span className="font-bold text-stone-900 capitalize">{program.name}</span> : '-';
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-100 transition-colors"
                          onClick={() => startEdit(user)}
                          title={t('common.edit', 'Editar')}
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
                        </button>
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-amber-300 text-amber-700 bg-white hover:bg-amber-100 transition-colors"
                          onClick={async () => {
                            const pwd = window.prompt(t('users.new_password_prompt', 'Nueva contraseña (mín. 6 caracteres):'));
                            if (!pwd) return;
                            if (pwd.length < 6) {
                              setError(t('users.password_min', 'La contraseña debe tener al menos 6 caracteres'));
                              return;
                            }
                            try {
                              await api.put(`/admin/users/${user.id}/password`, { password: pwd });
                              alert(t('users.password_updated', 'Contraseña actualizada'));
                            } catch {
                              setError(t('users.password_update_error', 'Error actualizando contraseña'));
                            }
                          }}
                          title={t('users.reset_password', 'Resetear contraseña')}
                        >
                          <span className="hidden sm:inline">{t('users.reset_password_short', 'Reset Clave')}</span>
                        </button>
                        <button 
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                          onClick={() => handleDelete(user.id)}
                          disabled={currentUser && currentUser.id === user.id}
                          title={t('common.delete', 'Eliminar')}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('common.delete', 'Eliminar')}</span>
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
      )}
      
      {/* Assigned Users Modal */}
      {showAssignedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-3xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-stone-900">{assignedTitle}</h4>
              <button className="btn-secondary" onClick={() => setShowAssignedModal(false)}>{t('common.close', 'Cerrar')}</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {assignedList.length === 0 ? (
                <p className="text-sm text-stone-600">{t('users.no_assigned', 'No hay usuarios asociados.')}</p>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.id', 'ID')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.name', 'Nombre')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.email', 'Email')}</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.plan', 'Plan')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {assignedList.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2 text-sm text-stone-700">#{u.id}</td>
                        <td className="px-4 py-2 text-sm text-stone-900">{u.nombre}</td>
                        <td className="px-4 py-2 text-sm text-stone-700">{u.email}</td>
                        <td className="px-4 py-2 text-sm text-stone-700">{u.planId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button className="btn-primary" onClick={() => setShowAssignedModal(false)}>{t('common.close', 'Cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
