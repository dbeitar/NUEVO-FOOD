import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Briefcase, 
  MapPin,
  X,
  Save,
  Loader
} from 'lucide-react';
import { useI18n } from '../context/useI18n';

export default function AdminTrainers() {
  const [trainers, setTrainers] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useI18n();

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    gym_id: ''
  });

  const fetchTrainers = useCallback(async () => {
    try {
      const res = await api.get('/trainers');
      setTrainers(res.data || []);
    } catch {
      setError(t('trainers.error_loading', 'Error cargando entrenadores'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchGyms = useCallback(async () => {
    try {
      const res = await api.get('/gyms');
      setGyms(res.data || []);
    } catch {
      setError(t('gyms.error_loading', 'Error cargando gimnasios'));
    }
  }, [t]);

  useEffect(() => {
    fetchTrainers();
    fetchGyms();
  }, [fetchTrainers, fetchGyms]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, ['teléfono']: formData.telefono };
      delete payload.telefono;
      if (editingTrainer) {
        await api.put(`/trainers/${editingTrainer.id}`, payload);
      } else {
        await api.post('/trainers', payload);
      }
      setEditingTrainer(null);
      setFormData({ nombre: '', email: '', telefono: '', especialidad: '', gym_id: '' });
      setShowForm(false);
      fetchTrainers();
    } catch (err) {
      setError(err.response?.data?.error || t('trainers.save_error', 'Error al guardar entrenador'));
    }
  };

  const startEdit = (trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      nombre: trainer.nombre,
      email: trainer.email,
      telefono: trainer.telefono || trainer['teléfono'] || '',
      especialidad: trainer.especialidad || '',
      gym_id: trainer.gym_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('trainers.delete_confirm', '¿Estás seguro de eliminar este entrenador?'))) {
      try {
        await api.delete(`/trainers/${id}`);
        fetchTrainers();
      } catch {
        setError(t('trainers.delete_error', 'Error al eliminar entrenador'));
      }
    }
  };
  const filteredTrainers = trainers.filter(trainer => 
    trainer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trainer.especialidad && trainer.especialidad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t('trainers.title', 'Gestión de Entrenadores')}</h1>
          <p className="text-stone-600 mt-1">{t('trainers.subtitle', 'Administra el equipo de entrenadores y sus asignaciones')}</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => {
              setEditingTrainer(null);
              setFormData({ nombre: '', email: '', telefono: '', especialidad: '', gym_id: '' });
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <UserPlus size={18} />
            {t('trainers.new', 'Nuevo Entrenador')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-semibold text-stone-900">
              {editingTrainer ? t('trainers.edit', 'Editar Entrenador') : t('trainers.new', 'Nuevo Entrenador')}
            </h2>
            <button 
              onClick={() => setShowForm(false)}
              className="text-stone-600 hover:text-stone-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label">{t('common.fullname', 'Nombre Completo')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserPlus size={18} className="text-slate-400" />
                  </div>
                  <input 
                    name="nombre" 
                    value={formData.nombre} 
                    onChange={handleInputChange} 
                    required 
                    className="input pl-10"
                    placeholder={t('common.fullname_ph', 'Ej. Juan Pérez')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">{t('common.email', 'Email')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleInputChange} 
                    required 
                    className="input pl-10"
                    placeholder={t('common.email_ph', 'juan@ejemplo.com')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">{t('common.phone', 'Teléfono')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={18} className="text-slate-400" />
                  </div>
                  <input 
                    name="telefono" 
                    value={formData.telefono} 
                    onChange={handleInputChange} 
                    className="input pl-10"
                    placeholder={t('common.phone_ph', '+34 600 000 000')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">{t('trainers.specialty', 'Especialidad')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase size={18} className="text-slate-400" />
                  </div>
                  <input 
                    name="especialidad" 
                    value={formData.especialidad} 
                    onChange={handleInputChange} 
                    className="input pl-10"
                    placeholder={t('trainers.specialty_ph', 'Ej. Musculación, Yoga, Crossfit')}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="label">{t('trainers.assigned_gym', 'Gimnasio Asignado')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin size={18} className="text-slate-400" />
                  </div>
                  <select 
                    name="gym_id" 
                    value={formData.gym_id} 
                    onChange={handleInputChange} 
                    required
                    className="input pl-10 appearance-none"
                  >
                    <option value="">{t('trainers.select_gym', 'Seleccione un gimnasio')}</option>
                    {gyms.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                className="btn-primary inline-flex gap-2"
              >
                <Save size={18} />
                {t('trainers.save', 'Guardar Entrenador')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-semibold text-stone-900">{t('trainers.list', 'Lista de Entrenadores')}</h2>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-stone-500" />
            </div>
            <input
              type="text"
              placeholder={t('trainers.search_ph', 'Buscar entrenador...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                  {t('trainers.trainer', 'Entrenador')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                  {t('common.contact', 'Contacto')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                  {t('trainers.specialty', 'Especialidad')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                  {t('common.gym', 'Gimnasio')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-stone-600 uppercase tracking-wider">
                  {t('common.actions', 'Acciones')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-stone-600">
                    <div className="flex justify-center items-center gap-2">
                      <Loader className="animate-spin h-5 w-5 text-lime-400" />
                      <span>{t('trainers.loading', 'Cargando entrenadores...')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-stone-600">
                    {t('trainers.none', 'No se encontraron entrenadores')}
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-stone-100 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-stone-100 border border-slate-300 flex items-center justify-center text-lime-600 font-bold text-sm">
                          {trainer.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-stone-900">{trainer.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-stone-800 flex items-center gap-2">
                        <Mail size={14} className="text-stone-500" />
                        {trainer.email}
                      </div>
                      {(trainer.telefono || trainer['teléfono']) && (
                        <div className="text-sm text-stone-600 flex items-center gap-2 mt-1">
                          <Phone size={14} className="text-stone-500" />
                          {trainer.telefono || trainer['teléfono']}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {trainer.especialidad || t('trainers.general', 'General')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-stone-500" />
                        {trainer.gym_id ? (gyms.find(g => g.id === trainer.gym_id)?.nombre || (t('trainers.gym_id', 'Gimnasio ID: ') + trainer.gym_id)) : t('trainers.unassigned', 'Sin asignar')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => startEdit(trainer)}
                          className="p-1 text-lime-700 hover:text-black hover:bg-lime-400 rounded transition-colors"
                          title={t('common.edit', 'Editar')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(trainer.id)}
                          className="p-1 text-red-600 hover:bg-red-600/10 rounded transition-colors"
                          title={t('common.delete', 'Eliminar')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <p className="text-xs text-stone-600 text-center">
            {t('trainers.showing', 'Mostrando {shown} de {total} entrenadores').replace('{shown}', filteredTrainers.length).replace('{total}', trainers.length)}
          </p>
        </div>
      </div>
    </div>
  );
}
