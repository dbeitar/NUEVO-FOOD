import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';
import { Building2, Dumbbell, Users, Search, Plus, Save } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';

export default function AdminCompanies() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [searchGym, setSearchGym] = useState('');
  const [searchTrainer, setSearchTrainer] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', planId: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [g, t, u, p] = await Promise.all([
        api.get('/gyms'),
        api.get('/trainers'),
        api.get('/admin/users'),
        api.get('/accounts/plans'),
      ]);
      setGyms(Array.isArray(g.data) ? g.data : []);
      setTrainers(Array.isArray(t.data) ? t.data : []);
      setUsers(u.data?.data || []);
      setPlans(p.data || []);
    } catch {
      setError(t('companies.error_loading', 'Error cargando datos'));
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]); 

  const filteredGyms = useMemo(() => {
    const q = searchGym.toLowerCase();
    return gyms.filter(g => g.nombre.toLowerCase().includes(q) || g.ciudad?.toLowerCase().includes(q));
  }, [gyms, searchGym]);

  const filteredTrainers = useMemo(() => {
    const q = searchTrainer.toLowerCase();
    return trainers.filter(t => t.nombre.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
  }, [trainers, searchTrainer]);

  const assignedUsers = useMemo(() => {
    return users.filter(u => {
      if (selectedGym) return (u.gym_id || u.gymId) === selectedGym.id;
      if (selectedTrainer) return u.trainer_id === selectedTrainer.id;
      return false;
    });
  }, [users, selectedGym, selectedTrainer]);

  const resetMsg = () => {
    setTimeout(() => {
      setMessage('');
      setError('');
    }, 2000);
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        password: form.password || undefined,
        rol: 'usuario_final',
        gym_id: selectedGym?.id ?? null,
        trainer_id: selectedTrainer?.id ?? null,
        planId: form.planId || undefined,
      };
      const res = await api.post('/admin/users', payload);
      const newId = res.data?.data?.id;
      if (newId && (payload.planId !== undefined || payload.gym_id !== null || payload.trainer_id !== null)) {
        await api.put(`/admin/users/${newId}/assign`, {
          gym_id: payload.gym_id,
          trainer_id: payload.trainer_id,
          planId: payload.planId,
        });
      }
      setMessage('Usuario creado');
      setForm({ nombre: '', email: '', password: '', planId: '' });
      setCreating(false);
      const updated = await api.get('/admin/users');
      setUsers(updated.data?.data || []);
      resetMsg();
    } catch (e2) {
      setError(e2.response?.data?.error || 'Error creando usuario');
      resetMsg();
    }
  };

  const updateUserPlan = async (userId, planId) => {
    try {
      await api.put(`/admin/users/${userId}/assign`, {
        gym_id: selectedGym?.id ?? null,
        trainer_id: selectedTrainer?.id ?? null,
        planId: planId || null,
      });
      const updated = await api.get('/admin/users');
      setUsers(updated.data?.data || []);
      setMessage('Plan actualizado');
      resetMsg();
    } catch {
      setError('Error actualizando plan');
      resetMsg();
    }
  };

  if (user?.rol !== 'super_admin') {
    return (
      <div className="card">
        <p className="text-stone-700">Solo super_admin puede ver Empresas.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Building2 className="text-lime-500" />
            {t('companies.gyms', 'Gimnasios')}
          </h3>
          <div className="relative w-40">
            <Search className="w-4 h-4 text-stone-500 absolute left-2 top-2.5" />
            <input className="input pl-7" placeholder={t('common.search', 'Buscar')} value={searchGym} onChange={e => setSearchGym(e.target.value)} />
          </div>
        </div>
        <ul className="divide-y divide-slate-200">
          {filteredGyms.map(g => (
            <li key={g.id} className={`py-2 px-2 rounded-lg hover:bg-stone-50 cursor-pointer ${selectedGym?.id === g.id ? 'bg-stone-100' : ''}`} onClick={() => { setSelectedGym(g); setSelectedTrainer(null); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-stone-600" />
                  <span className="text-sm text-stone-900">{g.nombre}</span>
                </div>
                <span className="text-xs text-stone-600">{g.ciudad || ''}</span>
              </div>
            </li>
          ))}
          {filteredGyms.length === 0 && <li className="text-sm text-stone-600">{t('companies.no_gyms', 'Sin gimnasios')}</li>}
        </ul>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Dumbbell className="text-lime-500" />
            {t('companies.trainers', 'Entrenadores')}
          </h3>
          <div className="relative w-40">
            <Search className="w-4 h-4 text-stone-500 absolute left-2 top-2.5" />
            <input className="input pl-7" placeholder={t('common.search', 'Buscar')} value={searchTrainer} onChange={e => setSearchTrainer(e.target.value)} />
          </div>
        </div>
        <ul className="divide-y divide-slate-200">
          {filteredTrainers.map(t => (
            <li key={t.id} className={`py-2 px-2 rounded-lg hover:bg-stone-50 cursor-pointer ${selectedTrainer?.id === t.id ? 'bg-stone-100' : ''}`} onClick={() => { setSelectedTrainer(t); setSelectedGym(null); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-stone-600" />
                  <span className="text-sm text-stone-900">{t.nombre}</span>
                </div>
                <span className="text-xs text-stone-600">{t.email || ''}</span>
              </div>
            </li>
          ))}
          {filteredTrainers.length === 0 && <li className="text-sm text-stone-600">{t('companies.no_trainers', 'Sin entrenadores')}</li>}
        </ul>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">
            {selectedGym ? t('companies.users_of_gym', 'Usuarios del Gimnasio: {name}').replace('{name}', selectedGym.nombre) : selectedTrainer ? t('companies.users_of_trainer', 'Usuarios del Entrenador: {name}').replace('{name}', selectedTrainer.nombre) : t('companies.select_prompt', 'Selecciona un gimnasio o entrenador')}
          </h3>
          {(selectedGym || selectedTrainer) && !creating && (
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => setCreating(true)}>
              <Plus size={16} />
              {t('companies.new_user', 'Nuevo usuario')}
            </button>
          )}
        </div>

        {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-2 mb-3">{message}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-2 mb-3">{error}</div>}

        {creating && (selectedGym || selectedTrainer) && (
          <form onSubmit={createUser} className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input" placeholder={t('common.name', 'Nombre')} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input" placeholder={t('common.email', 'Email')} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <input className="input" placeholder={t('companies.password_optional', 'Contraseña (opcional)')} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select className="input" value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })}>
              <option value="">{t('companies.no_plan', 'Sin plan')}</option>
              {plans.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary inline-flex items-center gap-2">
                <Save size={16} />
                {t('common.create', 'Crear')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>{t('common.cancel', 'Cancelar')}</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.user', 'Usuario')}</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.role', 'Rol')}</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase">{t('common.plan', 'Plan')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {assignedUsers.map(u => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2 text-sm text-stone-900">{u.nombre}<div className="text-xs text-stone-600">{u.email}</div></td>
                  <td className="px-4 py-2 text-sm text-stone-700">{u.rol}</td>
                  <td className="px-4 py-2 text-sm">
                    <select className="input text-sm py-1" defaultValue={u.planId || ''} onChange={e => updateUserPlan(u.id, e.target.value)}>
                      <option value="">{t('companies.no_plan', 'Sin plan')}</option>
                      {plans.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {assignedUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-sm text-stone-600 text-center">{t('companies.no_assigned', 'No hay usuarios asociados')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
