import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { Pencil, UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import InviteCodeCell from './admin/InviteCodeCell';
import TrainerBrandingModal from './admin/TrainerBrandingModal';

const EMPTY_MODULE_ACCESS = {
  gym: false,
  d28d: false,
  training: false,
  nutrition: false,
  food_plan: false,
  live_classes: false,
};

const MODULE_OPTIONS = [
  { key: 'gym', label: 'Gimnasio (producto)' },
  { key: 'd28d', label: 'Programas D28D' },
  { key: 'training', label: 'Entrenamiento' },
  { key: 'food_plan', label: 'Plan de alimentación' },
  { key: 'live_classes', label: 'Clases en vivo' },
];

const emptyForm = () => ({
  nombre: '',
  email: '',
  password: '',
  roles: ['usuario_final'],
  gym_id: '',
  trainer_id: '',
  planId: '',
  module_access: { ...EMPTY_MODULE_ACCESS },
});

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
  const [brandingTrainer, setBrandingTrainer] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [d28dCodes, setD28dCodes] = useState([]);

  // Form state
  const [formData, setFormData] = useState(emptyForm);

  const actorRoles = useMemo(
    () => (Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : [currentUser?.rol].filter(Boolean)),
    [currentUser],
  );
  const isCoachActor = useMemo(
    () => actorRoles.includes('entrenador')
      && !actorRoles.some((r) => ['super_admin', 'admin_d28d', 'admin_gimnasio', 'admin_marca'].includes(r)),
    [actorRoles],
  );
  const coachModuleOptions = useMemo(
    () => MODULE_OPTIONS.filter((m) => !['gym', 'd28d', 'live_classes'].includes(m.key)),
    [],
  );

  const gymById = useMemo(
    () => Object.fromEntries(gyms.map((g) => [Number(g.id), g])),
    [gyms],
  );
  const trainerById = useMemo(
    () => Object.fromEntries(trainers.map((t) => [Number(t.id), t])),
    [trainers],
  );

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

  useEffect(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : [currentUser?.rol].filter(Boolean);
    if (!roles.some((r) => ['super_admin', 'admin_d28d'].includes(r))) return;
    api.get('/admin/invite-codes')
      .then((res) => setD28dCodes(res.data?.d28d_codes || []))
      .catch(() => setD28dCodes(['D28D-PILOTO', 'D28D-PILOTO-2026', 'D28D']));
  }, [currentUser]);

  const saveGymInviteCode = async (gymId, code) => {
    const { data } = await api.put(`/gyms/${gymId}`, { invite_code: code });
    const updated = data.gym || data;
    setGyms((prev) => prev.map((g) => (g.id === gymId ? { ...g, invite_code: updated.invite_code } : g)));
    return updated.invite_code;
  };

  const saveTrainerInviteCode = async (trainerId, code) => {
    const { data } = await api.put(`/trainers/${trainerId}`, { invite_code: code });
    const updated = data.trainer || data;
    setTrainers((prev) => prev.map((t) => (t.id === trainerId ? { ...t, invite_code: updated.invite_code } : t)));
    return updated.invite_code;
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
        await api.put(`/admin/users/${editingUser.id}/role`, {
          roles: formData.roles,
          module_access: formData.module_access,
        });
        await api.put(`/admin/users/${editingUser.id}/assign`, { 
          gym_id: formData.roles.includes('usuario_final') ? (formData.gym_id || null) : null, 
          trainer_id: formData.trainer_id || null 
        });
      } else {
        // Validaciones obligatorias para nuevo usuario
        const needsPlan = !isCoachActor
          && formData.roles.includes('usuario_final')
          && !formData.roles.includes('entrenador');
        if (needsPlan && !formData.planId) {
          setError(t('plans.subscription', 'Plan de Suscripción') + ' ' + t('common.name_required', 'Nombre *').replace('Nombre *','es obligatorio'));
          return;
        }
        if (!isCoachActor && formData.roles.includes('usuario_final') && !formData.gym_id) {
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
          gym_id: isCoachActor ? null : (formData.roles.includes('usuario_final') && formData.gym_id ? parseInt(formData.gym_id, 10) : undefined),
          gymId: isCoachActor ? null : (formData.roles.includes('usuario_final') && formData.gym_id ? parseInt(formData.gym_id, 10) : undefined),
          trainer_id: isCoachActor ? (currentUser?.trainer_id || formData.trainer_id) : (formData.trainer_id || null),
          planId: isCoachActor || formData.roles.includes('entrenador') ? null : formData.planId,
          module_access: formData.module_access,
        });
      }
      setEditingUser(null);
      setFormData(emptyForm());
      fetchUsers();
    } catch {
      setError(t('trainers.save_error', 'Error al guardar'));
    }
  };

  const startEdit = async (user) => {
    setEditingUser(user);
    setShowForm(true);
    let module_access = { ...EMPTY_MODULE_ACCESS, ...(user.module_access || {}) };
    try {
      const licRes = await api.get(`/licenses/user/${user.id}`);
      const resolved = licRes.data?.data?.module_access;
      if (resolved && typeof resolved === 'object') {
        module_access = { ...EMPTY_MODULE_ACCESS, ...resolved };
      }
    } catch {
      /* fallback module_access del listado */
    }
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '',
      roles: user.roles && user.roles.length ? user.roles : [user.rol || 'usuario_final'],
      gym_id: user.gym_id || '',
      trainer_id: user.trainer_id || '',
      planId: user.planId || '',
      module_access,
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
      case 'admin_marca':
      case 'admin_gym':
      case 'admin_gimnasio': return 'badge-blue';
      case 'admin_d28d': return 'badge-orange';
      case 'admin_food':
      case 'admin_food_plan': return 'badge-lime';
      case 'admin_training':
      case 'admin_entrenador': return 'badge-amber';
      case 'entrenador': return 'badge-green';
      case 'entrenador_d28d': return 'badge-orange';
      case 'nutricionista': return 'badge-teal';
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
          {(() => {
            const role = currentUser?.rol;
            const allRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length
              ? currentUser.roles
              : [role].filter(Boolean);
            const isSuper = allRoles.includes('super_admin');
            const isD28d = allRoles.includes('admin_d28d');
            // Tabs disponibles según rol:
            //   super_admin      → Usuarios + Gimnasios + Entrenadores
            //   admin_d28d       → Usuarios + Gimnasios
            //   admin_training/  → Usuarios + Entrenadores
            //     admin_entrenador
            //   resto            → solo Usuarios (sin tabs visibles)
            if (!isSuper && !isD28d && !allRoles.some((r) => ['admin_training', 'admin_entrenador'].includes(r))) {
              return null;
            }
            return (
              <div className="mt-3 inline-flex gap-2 bg-stone-100 p-1 rounded-2xl">
                <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='users'?'bg-white shadow':''}`} onClick={() => setViewTab('users')}>{t('users.tabs.users', 'Usuarios')}</button>
                {(isSuper || isD28d) && (
                  <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='gyms'?'bg-white shadow':''}`} onClick={() => setViewTab('gyms')}>{t('users.tabs.gyms', 'Gimnasios')}</button>
                )}
                {(isSuper || allRoles.some((r) => ['admin_training', 'admin_entrenador'].includes(r))) && (
                  <button className={`px-3 py-1.5 rounded-2xl ${viewTab==='trainers'?'bg-white shadow':''}`} onClick={() => setViewTab('trainers')}>{t('users.tabs.trainers', 'Entrenadores')}</button>
                )}
              </div>
            );
          })()}
        </div>
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors"
          onClick={() => {
            setEditingUser(null);
            setFormData(emptyForm());
            setShowForm(true);
          }}
        >
          <UserPlus className="w-4 h-4" />
          {t('users.new_user', 'Nuevo Usuario')}
        </button>
      </div>

      {d28dCodes.length > 0 && !isCoachActor && (
        <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-stone-900">{t('users.d28d_invite_codes', 'Códigos D28D (registro público)')}</p>
          <p className="text-stone-600 mt-1">{t('users.d28d_invite_hint', 'Comparte estos códigos con usuarios que entren directo a la plataforma D28D:')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {d28dCodes.map((code) => (
              <code key={code} className="text-xs font-mono bg-white border border-lime-300 text-lime-900 px-2 py-1 rounded">
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

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
              setFormData(emptyForm());
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
          {!isCoachActor && !formData.roles.includes('entrenador') && formData.roles.includes('usuario_final') && (
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
          )}
          <div className="md:col-span-2">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <label className="label">{t('common.roles', 'Roles')}</label>
              <p className="text-xs text-stone-500">
                {t('users.multi_role_hint', 'Puedes asignar varios roles a la misma persona (ej: Entrenador + Admin Food).')}
              </p>
            </div>
            {formData.roles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {formData.roles.map((r) => (
                  <span key={r} className="badge badge-blue text-xs px-2 py-0.5 whitespace-nowrap">
                    {formatRole(r)}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {[
                { value: 'usuario_final', label: 'Usuario Final' },
                { value: 'entrenador', label: 'Entrenador' },
                { value: 'entrenador_d28d', label: 'Entrenador D28D (solo clases)' },
                { value: 'nutricionista', label: 'Nutricionista' },
                { value: 'admin_gimnasio', label: 'Admin Gimnasio' },
                { value: 'admin_food_plan', label: 'Admin Food Plan' },
                { value: 'admin_d28d', label: 'Admin D28D' },
                { value: 'admin_training', label: 'Admin Entrenadores' },
                { value: 'admin_gym', label: 'Admin Gym (multi-gimnasio)' },
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
                  {trainers.map(tr => <option key={tr.id} value={tr.id}>{tr.nombre}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">{t('users.modules', 'Módulos activos')}</label>
                <p className="text-xs text-stone-500 mb-2">
                  {isCoachActor
                    ? t('users.modules_hint_coach', 'Solo entrenamiento y plan de alimentación para tus clientes (sin D28D).')
                    : t('users.modules_hint', 'Activa o desactiva acceso a D28D, entrenamiento, food y clases en vivo.')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(isCoachActor ? coachModuleOptions : MODULE_OPTIONS).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-100">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.module_access?.[key])}
                        onChange={() => {
                          setFormData((prev) => ({
                            ...prev,
                            module_access: {
                              ...prev.module_access,
                              [key]: !prev.module_access?.[key],
                            },
                          }));
                        }}
                        className="rounded border-stone-300 text-lime-600 focus:ring-lime-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
                  (!isCoachActor && formData.roles.includes('usuario_final') && !formData.roles.includes('entrenador') && !formData.planId) ||
                  (formData.roles.includes('usuario_final') && !isCoachActor && !formData.gym_id) ||
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('users.invite_code', 'Código invitación')}</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <InviteCodeCell
                        value={g.invite_code}
                        onSave={(code) => saveGymInviteCode(g.id, code)}
                      />
                    </td>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('users.invite_code', 'Código invitación')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('plans.capacity', 'Cupo Máx')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {trainers.map(tr => (
                  <tr key={tr.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">#{tr.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{tr.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{tr.especialidad || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <InviteCodeCell
                        value={tr.invite_code}
                        onSave={(code) => saveTrainerInviteCode(tr.id, code)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-stone-600">{tr.capacidad_usuarios ?? 50}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-lime-300 text-stone-800 bg-lime-50 hover:bg-lime-100 transition-colors"
                          onClick={() => setBrandingTrainer(tr)}
                        >
                          {t('wl.brand_btn', 'Marca')}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-100 transition-colors"
                          onClick={() => {
                            const list = users.filter(u => u.trainer_id === tr.id);
                            setAssignedTitle(t('companies.users_of_trainer', 'Usuarios del Entrenador: {name}').replace('{name}', tr.nombre));
                            setAssignedList(list);
                            setShowAssignedModal(true);
                          }}
                        >
                          {t('users.view_users', 'Ver usuarios')}
                        </button>
                      </div>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('users.invite_code', 'Código invitación')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Programa</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                    <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-stone-600">{t('users.loading', 'Cargando usuarios...')}</td></tr>
              ) : users.length === 0 ? (
                 <tr><td colSpan="7" className="px-6 py-4 text-center text-sm text-stone-600">{t('users.none', 'No hay usuarios registrados.')}</td></tr>
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
                      {user.gym_id ? (gymById[Number(user.gym_id)]?.nombre || user.gym_id) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      <div className="flex flex-col gap-1">
                        {user.gym_id && gymById[Number(user.gym_id)]?.invite_code && (
                          <span className="text-xs">
                            <span className="text-stone-500">Gym:</span>{' '}
                            <InviteCodeCell value={gymById[Number(user.gym_id)].invite_code} readOnly />
                          </span>
                        )}
                        {user.trainer_id && trainerById[Number(user.trainer_id)]?.invite_code && (
                          <span className="text-xs">
                            <span className="text-stone-500">Coach:</span>{' '}
                            <InviteCodeCell value={trainerById[Number(user.trainer_id)].invite_code} readOnly />
                          </span>
                        )}
                        {!user.gym_id && !user.trainer_id && user.module_access?.d28d && d28dCodes[0] && (
                          <InviteCodeCell value={d28dCodes[0]} readOnly placeholder="D28D" />
                        )}
                        {!user.gym_id && !user.trainer_id && !user.module_access?.d28d && (
                          <span className="text-stone-400">—</span>
                        )}
                      </div>
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

      {brandingTrainer && (
        <TrainerBrandingModal
          trainer={brandingTrainer}
          onClose={() => setBrandingTrainer(null)}
          onSaved={fetchResources}
        />
      )}
    </div>
  );
}
