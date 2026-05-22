import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Building2, MapPin, Phone, Mail, Plus, Edit2, Trash2, X, Save, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '../context/useI18n';
import { useAuth } from '../context/useAuth';
import { getRolesArr } from './dashboard/userServices';
import InviteCodeCell from './admin/InviteCodeCell';

const emptyGymForm = {
  nombre: '',
  invite_code: '',
  ciudad: '',
  direccion: '',
  telefono: '',
  email: '',
  pais: 'Colombia',
  capacidad_usuarios: 50,
  plan_id: '',
  logo_url: '',
  brand_name: '',
  brand_slug: '',
  white_label_enabled: true,
  welcome_message: '',
  support_whatsapp: '',
  primary_color: '#2563eb',
  secondary_color: '#10b981',
  status: 'active',
  favicon_url: '',
  cover_url: '',
  social_links: {},
  custom_domain: '',
};

export default function AdminGyms() {
  const [gyms, setGyms] = useState([]);
  const [filteredGyms, setFilteredGyms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingGym, setEditingGym] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [plans, setPlans] = useState([]);
  const [assigningPlan, setAssigningPlan] = useState(null);
  const { t } = useI18n();
  const { user } = useAuth();
  const roles = getRolesArr(user);
  const canCreateGym = roles.includes('super_admin') || roles.includes('admin_d28d');
  const canDeleteGym = canCreateGym;

  // Form state
  const [formData, setFormData] = useState(emptyGymForm);

  const fetchGyms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/gyms');
      setGyms(res.data || []);
      setFilteredGyms(res.data || []);
    } catch {
      setError(t('gyms.error_loading', 'Error cargando gimnasios'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/accounts/plans');
      setPlans(res.data || []);
    } catch {
      console.error('Error cargando planes');
    }
  }, []);

  useEffect(() => {
    fetchGyms();
    fetchPlans();
  }, [fetchGyms, fetchPlans]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredGyms(gyms.filter(gym => 
        gym.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gym.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gym.direccion.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredGyms(gyms);
    }
  }, [searchTerm, gyms]);

  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (editingGym) {
        await api.put(`/gyms/${editingGym.id}`, formData);
      setSuccess(t('gyms.updated', 'Gimnasio actualizado correctamente'));
      } else {
        await api.post('/gyms', formData);
        setSuccess(t('gyms.created', 'Gimnasio creado exitosamente'));
      }
      setEditingGym(null);
      setFormData(emptyGymForm);
      setShowForm(false);
      fetchGyms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('gyms.save_error', 'Error al guardar gimnasio'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const startEdit = (gym) => {
    setEditingGym(gym);
    setFormData({
      nombre: gym.nombre,
      ciudad: gym.ciudad,
      direccion: gym.direccion,
      telefono: gym.telefono || gym.teléfono || '',
      email: gym.email || '',
      pais: gym.pais || gym.país || 'Colombia',
      capacidad_usuarios: gym.capacidad_usuarios || 50,
      plan_id: gym.plan_id || '',
      logo_url: gym.logo_url || '',
      brand_name: gym.brand_name || '',
      brand_slug: gym.brand_slug || '',
      white_label_enabled: gym.white_label_enabled !== false,
      welcome_message: gym.welcome_message || '',
      support_whatsapp: gym.support_whatsapp || '',
      primary_color: gym.primary_color || '#2563eb',
      secondary_color: gym.secondary_color || '#10b981',
      status: gym.status || 'active',
      invite_code: gym.invite_code || '',
      favicon_url: gym.favicon_url || '',
      cover_url: gym.cover_url || '',
      social_links: gym.social_links && typeof gym.social_links === 'object' ? gym.social_links : {},
      custom_domain: gym.custom_domain || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('gyms.delete_confirm', '¿Estás seguro de eliminar este gimnasio?'))) {
      try {
        await api.delete(`/gyms/${id}`);
        setSuccess(t('gyms.deleted', 'Gimnasio eliminado correctamente'));
        fetchGyms();
        setTimeout(() => setSuccess(''), 3000);
    } catch {
        setError(t('gyms.delete_error', 'Error al eliminar gimnasio'));
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleAssignPlan = async (gymId, planId) => {
    try {
      await api.put(`/gyms/${gymId}/assign-plan`, { plan_id: planId });
      setSuccess(t('gyms.plan_assigned', 'Plan asignado correctamente'));
      setAssigningPlan(null);
      fetchGyms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('gyms.assign_error', 'Error al asignar plan'));
      setTimeout(() => setError(''), 3000);
    }
  };

  const saveGymInviteCode = async (gymId, code) => {
    const { data } = await api.put(`/gyms/${gymId}`, { invite_code: code });
    const updated = data.gym || data;
    setGyms((prev) => prev.map((g) => (g.id === gymId ? { ...g, invite_code: updated.invite_code } : g)));
    setFilteredGyms((prev) => prev.map((g) => (g.id === gymId ? { ...g, invite_code: updated.invite_code } : g)));
    if (editingGym?.id === gymId) {
      setFormData((f) => ({ ...f, invite_code: updated.invite_code }));
    }
    return updated.invite_code;
  };

  const handleCancel = () => {
    setEditingGym(null);
    setFormData(emptyGymForm);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="text-lime-400" size={28} />
            {t('gyms.title', 'Gestión de Gimnasios')}
          </h3>
          <p className="text-stone-600 text-sm mt-1">
            {canCreateGym
              ? t('gyms.subtitle_platform', 'Solo D28D crea gimnasios. Cada sede recibe un código único de invitación.')
              : t('gyms.subtitle_gym_admin', 'Configura la marca de tu sede. El código de invitación lo asigna D28D.')}
          </p>
        </div>
        
        {!showForm && canCreateGym && (
          <button 
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => {
              setEditingGym(null);
              setFormData(emptyGymForm);
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            {t('gyms.new', 'Nuevo Gimnasio')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 animate-fade-in">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <p className="text-red-300 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border-l-4 border-emerald-500 p-4 rounded-r-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle className="text-emerald-400 flex-shrink-0" size={20} />
          <p className="text-emerald-300 font-medium">{success}</p>
        </div>
      )}

      {!showForm && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-500" />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder={t('gyms.search_ph', 'Buscar por nombre, ciudad o dirección...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {showForm ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
            <h4 className="text-md font-semibold text-stone-900">
              {editingGym ? t('gyms.edit', 'Editar Gimnasio') : t('gyms.create', 'Crear Nuevo Gimnasio')}
            </h4>
            <button 
              className="text-stone-500 hover:text-stone-900 transition-colors" 
              onClick={handleCancel}
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">{t('gyms.name', 'Nombre del Gimnasio')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    name="nombre" 
                    value={formData.nombre} 
                    onChange={handleInputChange} 
                    required 
                    placeholder={t('gyms.name_ph', 'Ej: Smart Fit Centro')}
                    className="input pl-10"
                  />
                </div>
              </div>

              {(canCreateGym || !editingGym) && (
              <div className="md:col-span-2">
                <label className="label">{t('users.invite_code', 'Código de invitación (registro)')}</label>
                {canCreateGym ? (
                  <input
                    name="invite_code"
                    value={formData.invite_code}
                    onChange={handleInputChange}
                    placeholder="Ej: GYM-D28D-004"
                    className="input font-mono uppercase"
                  />
                ) : (
                  <p className="input font-mono" style={{ background: 'var(--d28d-surface-2)' }}>
                    {formData.invite_code || t('gyms.code_pending', 'Asignado por D28D')}
                  </p>
                )}
                <p className="text-xs text-stone-500 mt-1">{t('gyms.invite_hint', 'Los usuarios finales usarán este código al registrarse.')}</p>
              </div>
              )}
              
              <div>
                <label className="label">{t('common.city', 'Ciudad')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    name="ciudad" 
                    value={formData.ciudad} 
                    onChange={handleInputChange} 
                    required 
                    placeholder={t('gyms.city_ph', 'Ej: Bogotá')}
                    className="input pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">{t('common.address', 'Dirección')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    name="direccion" 
                    value={formData.direccion} 
                    onChange={handleInputChange} 
                    placeholder={t('gyms.address_ph', 'Ej: Calle 123 # 45-67')}
                    className="input pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">{t('common.phone', 'Teléfono')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    name="telefono" 
                    value={formData.telefono} 
                    onChange={handleInputChange} 
                    placeholder={t('gyms.phone_ph', 'Ej: 300 123 4567')}
                    className="input pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="label">{t('gyms.contact_email', 'Email Contacto')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    placeholder={t('gyms.email_ph', 'Ej: contacto@gimnasio.com')}
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">País</label>
                <input
                  name="pais"
                  value={formData.pais}
                  onChange={handleInputChange}
                  placeholder="Colombia"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Capacidad usuarios</label>
                <input
                  name="capacidad_usuarios"
                  value={formData.capacidad_usuarios}
                  onChange={handleInputChange}
                  type="number"
                  min="1"
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('common.plan', 'Plan')}</label>
                <select
                  className="input"
                  name="plan_id"
                  value={formData.plan_id}
                  onChange={handleInputChange}
                >
                  <option value="">Sin plan</option>
                  {plans.map((plan) => (
                    <option key={plan.nombre} value={plan.nombre}>{plan.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <div>
                <label className="label">{t('gyms.logo_url', 'Logo URL')}</label>
                <input
                  className="input"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  placeholder={t('gyms.logo_url_ph', 'https://...')}
                />
              </div>
              <div>
                <label className="label">Nombre marca blanca</label>
                <input
                  className="input"
                  name="brand_name"
                  value={formData.brand_name}
                  onChange={handleInputChange}
                  placeholder="Ej: D28D Chapinero"
                />
              </div>
              <div>
                <label className="label">Slug / URL marca</label>
                <input
                  className="input"
                  name="brand_slug"
                  value={formData.brand_slug}
                  onChange={handleInputChange}
                  placeholder="d28d-chapinero"
                />
              </div>
              <div>
                <label className="label">WhatsApp soporte</label>
                <input
                  className="input"
                  name="support_whatsapp"
                  value={formData.support_whatsapp}
                  onChange={handleInputChange}
                  placeholder="+573001234567"
                />
              </div>
              <div>
                <label className="label">{t('gyms.primary_color', 'Color Primario')}</label>
                <input
                  className="input"
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleInputChange}
                  type="color"
                />
              </div>
              <div>
                <label className="label">{t('gyms.secondary_color', 'Color Secundario')}</label>
                <input
                  className="input h-10 p-0"
                  name="secondary_color"
                  value={formData.secondary_color}
                  onChange={handleInputChange}
                  type="color"
                />
              </div>
              <div>
                <label className="label">{t('gyms.status', 'Estado')}</label>
                <select
                  className="input"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mt-4">
              <label className="block">
                <span className="label">Mensaje de bienvenida</span>
                <textarea
                  className="input min-h-[88px]"
                  name="welcome_message"
                  value={formData.welcome_message}
                  onChange={handleInputChange}
                  placeholder="Mensaje visible para usuarios inscritos a esta marca."
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-stone-50 px-4 py-3 self-end">
                <input
                  type="checkbox"
                  checked={!!formData.white_label_enabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, white_label_enabled: e.target.checked }))}
                />
                <span className="text-sm font-semibold text-stone-700">Marca blanca activa</span>
              </label>
            </div>
            <WhiteLabelFields formData={formData} setFormData={setFormData} />

            <div className="mt-4 rounded-lg border border-slate-200 bg-stone-50 p-4">
              <div className="text-xs uppercase text-stone-500 font-semibold mb-2">Vista previa marca blanca</div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg grid place-items-center text-white font-bold overflow-hidden" style={{ backgroundColor: formData.primary_color }}>
                  {formData.logo_url ? <img src={formData.logo_url} alt="" className="h-full w-full object-cover" /> : (formData.brand_name || formData.nombre || 'G').slice(0, 1)}
                </div>
                <div>
                  <div className="font-semibold text-stone-900">{formData.brand_name || formData.nombre || 'Nueva marca'}</div>
                  <div className="text-sm text-stone-600">{formData.welcome_message || 'Mensaje de bienvenida para la comunidad.'}</div>
                  <div className="text-xs text-stone-500">/{formData.brand_slug || 'slug-de-marca'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
              <button 
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button 
                type="submit" 
                className="btn-primary inline-flex items-center gap-2"
              >
                <Save size={16} />
                {t('common.save', 'Guardar')}
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
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.name', 'Nombre')}</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('gyms.location', 'Ubicación')}</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.contact', 'Contacto')}</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('users.invite_code', 'Código invitación')}</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.plan', 'Plan')}</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-sm text-slate-400">{t('gyms.loading', 'Cargando gimnasios...')}</td></tr>
                ) : filteredGyms.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Building2 className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-lg font-medium text-stone-600">{t('gyms.none', 'No se encontraron gimnasios')}</p>
                        <p className="text-sm text-slate-400">{t('gyms.none_help', 'Intenta ajustar tu búsqueda o crea un nuevo gimnasio.')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGyms.map(gym => (
                    <tr key={gym.id} className="hover:bg-stone-100 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center rounded-xl overflow-hidden border border-slate-200" style={{ width: 44, height: 44, backgroundColor: gym.primary_color || '#f8fafc' }}>
                            {gym.logo_url ? (
                              <img src={gym.logo_url} alt={gym.nombre} className="h-full w-full object-cover" />
                            ) : (
                              <Building2 size={20} className="text-white" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-stone-900">{gym.nombre}</div>
                            <div className="text-xs text-stone-500 flex gap-1">
                              <span style={{ color: gym.secondary_color || '#64748b' }}>{gym.brand_name || gym.secondary_color || ''}</span>
                            </div>
                            {gym.white_label_enabled && <div className="text-[11px] text-emerald-700 font-semibold">Marca blanca activa</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-800 flex items-center gap-1">
                          <MapPin size={14} className="text-stone-500" />
                          {gym.ciudad}
                        </div>
                        <div className="text-xs text-stone-600 ml-5">{gym.direccion}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-800 flex items-center gap-1">
                          <Mail size={14} className="text-stone-500" />
                          {gym.email || '-'}
                        </div>
                        <div className="text-xs text-stone-600 ml-5 flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="text-stone-500" />
                          {gym.telefono || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <InviteCodeCell
                          value={gym.invite_code}
                          readOnly={!canCreateGym}
                          onSave={(code) => saveGymInviteCode(gym.id, code)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assigningPlan === gym.id ? (
                          <div className="flex items-center gap-2">
                            <select 
                              className="input text-sm py-1"
                              onChange={(e) => handleAssignPlan(gym.id, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>{t('common.select', 'Seleccionar...')}</option>
                              {plans.map(plan => (
                                <option key={plan.nombre} value={plan.nombre}>{plan.nombre}</option>
                              ))}
                            </select>
                            <button onClick={() => setAssigningPlan(null)} className="text-stone-500 hover:text-stone-900">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="badge badge-neutral">
                              {gym.plan_id || t('companies.no_plan', 'Sin plan')}
                            </span>
                            <button 
                              onClick={() => setAssigningPlan(gym.id)}
                              className="text-lime-700 hover:text-black bg-stone-100 hover:bg-lime-400 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                            >
                              {t('common.change', 'Cambiar')}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${gym.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {gym.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="text-lime-700 hover:text-black bg-stone-100 hover:bg-lime-400 p-2 rounded-lg transition-colors"
                            onClick={() => startEdit(gym)}
                            title={t('common.edit', 'Editar')}
                          >
                            <Edit2 size={16} />
                          </button>
                          {canDeleteGym && (
                          <button 
                            type="button"
                            className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
                            onClick={() => handleDelete(gym.id)}
                            title={t('common.delete', 'Eliminar')}
                          >
                            <Trash2 size={16} />
                          </button>
                          )}
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
    </div>
  );
}
