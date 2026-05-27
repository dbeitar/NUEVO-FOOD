import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useI18n } from '../context/useI18n';

const DEFAULT_FORM = {
  nombre: '',
  descripcion: '',
  precio_mensual: 0,
  precio_mensual_usd: 0,
  max_users: 0,
  features: '',
  program_id: 'virtual_d28d',
  kind: 'd28d',
  module_access: '{}',
  cycle_ids: [],
  is_couple: false,
  included_seats: 1,
  support_whatsapp: '573192635819',
  support_name: 'Soporte D28D',
  support_message: '',
  support_activo: true,
  cycles_count: 1,
  activo: true,
  visible: true,
  sort_order: 0,
};

export default function AdminPlans({
  mode = null,
  onBack = null,
  singlePlanOnly = false,
  title = null,
  embedded = false,
  programId = null,
  hideProgramColumn = false,
} = {}) {
  const fixedKind = mode === 'training'
    ? 'training'
    : mode === 'food'
      ? 'food'
      : mode === 'd28d'
        ? 'd28d'
        : null;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { t } = useI18n();

  const initialForm = useMemo(() => ({
    ...DEFAULT_FORM,
    kind: fixedKind || 'd28d',
    program_id: programId || (fixedKind === 'training'
      ? 'training'
      : fixedKind === 'food'
        ? 'food'
        : 'virtual_d28d'),
  }), [fixedKind, programId]);

  const [formData, setFormData] = useState(initialForm);
  const [programs, setPrograms] = useState([]);
  const [cycles, setCycles] = useState([]);

  const fetchPlans = useCallback(async () => {
    try {
      const params = {};
      if (fixedKind) params.kind = fixedKind;
      if (programId) params.program_id = programId;
      const res = await api.get('/accounts/plans', { params });
      let plansData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      if (programId) {
        plansData = plansData.filter((p) => String(p.program_id) === String(programId));
      }
      plansData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setPlans(plansData);
    } catch (err) {
      setError(t('plans.error_loading', 'Error cargando planes'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t, fixedKind, programId]);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error('Error loading programs', err);
    }
  }, []);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await api.get('/cycles');
      setCycles(res.data?.data || []);
    } catch (err) {
      console.error('Error loading cycles', err);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchPrograms();
    fetchCycles();
  }, [fetchPlans, fetchPrograms]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let parsedModuleAccess = {};
      try { parsedModuleAccess = JSON.parse(formData.module_access || '{}'); } catch { parsedModuleAccess = {}; }
      const payload = {
        ...formData,
        kind: fixedKind || formData.kind,
        program_id: programId || (fixedKind === 'training'
          ? 'training'
          : fixedKind === 'food'
            ? 'food'
            : formData.program_id),
        max_usuarios: Number(formData.max_users) || 0,
        precio_mensual: Number(formData.precio_mensual) || 0,
        precio_mensual_usd: Number(formData.precio_mensual_usd) || 0,
        included_seats: Number(formData.included_seats) || 1,
        is_couple: fixedKind === 'training' ? false : !!formData.is_couple,
        module_access: parsedModuleAccess,
        cycle_ids: (fixedKind === 'training' || fixedKind === 'food')
          ? []
          : (Array.isArray(formData.cycle_ids) ? formData.cycle_ids.map((n) => Number(n)).filter(Boolean) : []),
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        support_whatsapp: formData.support_whatsapp,
        support_name: formData.support_name,
        support_message: formData.support_message,
        support_activo: formData.support_activo !== false,
        cycles_count: Number(formData.cycles_count) || null,
        activo: formData.activo !== false,
        visible: formData.visible !== false,
        sort_order: Number(formData.sort_order) || 0,
      };
      if (editingPlan) {
        // Edit logic
        await api.put(`/accounts/plans/${editingPlan.nombre}`, {
          ...payload,
        });
      } else {
        // Create logic
        await api.post('/accounts/plans', {
          ...payload,
        });
      }
      setEditingPlan(null);
      setFormData({ ...initialForm });
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
      precio_mensual_usd: plan.precio_mensual_usd || 0,
      max_users: plan.max_users || 0,
      features: Array.isArray(plan.features) ? plan.features.join(', ') : plan.features,
      program_id: plan.program_id || 'virtual_d28d',
      kind: plan.kind || 'd28d',
      module_access: JSON.stringify(plan.module_access || {}, null, 2),
      cycle_ids: Array.isArray(plan.cycle_ids) ? plan.cycle_ids : [],
      is_couple: !!plan.is_couple,
      included_seats: plan.included_seats || 1,
      support_whatsapp: plan.support_whatsapp || '573192635819',
      support_name: plan.support_name || 'Soporte D28D',
      support_message: plan.support_message || '',
      support_activo: plan.support_activo !== false,
      cycles_count: plan.cycles_count ?? 1,
      activo: plan.activo !== false,
      visible: plan.visible !== false,
      sort_order: plan.sort_order || 0,
    });
    setShowForm(true);
  };

  const handleDelete = async (nombre) => {
    if (!window.confirm(t('plans.delete_confirm', '¿Seguro que deseas eliminar este plan?'))) return;
    try {
      await api.delete(`/accounts/plans/${nombre}`);
      fetchPlans();
    } catch {
      setError(t('plans.delete_error', 'Error al eliminar plan'));
    }
  };

  const handleDuplicate = async (plan) => {
    try {
      await api.post(`/accounts/plans/${encodeURIComponent(plan.nombre)}/duplicate`, {
        nombre: `${plan.nombre} (copia)`,
      });
      fetchPlans();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al duplicar');
    }
  };

  const patchPlan = async (nombre, patch) => {
    try {
      await api.put(`/accounts/plans/${encodeURIComponent(nombre)}`, patch);
      fetchPlans();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error actualizando plan');
    }
  };

  const movePlan = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= plans.length) return;
    const reordered = [...plans];
    const tmp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = tmp;
    const items = reordered.map((p, i) => ({ nombre: p.nombre, sort_order: i + 1 }));
    try {
      await api.put('/accounts/plans/reorder', { items });
      fetchPlans();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error reordenando');
    }
  };

  const pageTitle = title || (fixedKind === 'training'
    ? 'Plan comercial Entrenadores'
    : fixedKind === 'food'
      ? 'Plan comercial FOOD_PLAN'
    : fixedKind === 'd28d'
      ? 'Planes D28D por programa'
      : t('plans.title', 'Planes de Suscripción'));
  const canAddPlan = !singlePlanOnly || plans.length < 1;

  return (
    <div className="space-y-6">
      {!embedded && (
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Volver
            </button>
          )}
          <h3 className="text-lg font-bold text-stone-900">{pageTitle}</h3>
        </div>
        {!showForm && canAddPlan && (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => {
              setEditingPlan(null);
              setFormData({ ...initialForm });
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t('plans.new', 'Nuevo Plan')}
          </button>
        )}
      </div>
      )}
      {singlePlanOnly && plans.length >= 1 && !showForm && (
        <p className="text-sm text-stone-600">
          {fixedKind === 'food'
            ? 'Solo puede existir un plan comercial de FOOD_PLAN. Edita el existente.'
            : 'Solo puede existir un plan comercial de Entrenadores. Edita el existente.'}
        </p>
      )}

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      {showForm ? (
        <div className="card">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
            <h4 className="text-md font-semibold text-stone-900">{editingPlan ? t('plans.edit', 'Editar Plan') : t('plans.create', 'Crear Nuevo Plan')}</h4>
            <button 
              className="text-sm text-stone-500 hover:text-stone-900" 
              onClick={() => setShowForm(false)}
            >
              {t('common.cancel', 'Cancelar')}
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {fixedKind !== 'training' && fixedKind !== 'food' && (
              <div>
                <label className="label">Programa</label>
                <select
                  name="program_id"
                  value={programId || formData.program_id}
                  onChange={handleInputChange}
                  required
                  className="input"
                  disabled={!!fixedKind || !!programId}
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Ciclos incluidos</label>
                <input name="cycles_count" type="number" min="1" className="input"
                  value={formData.cycles_count} onChange={handleInputChange} />
              </div>
              <div>
                <label className="label">Orden</label>
                <input name="sort_order" type="number" className="input"
                  value={formData.sort_order} onChange={handleInputChange} />
              </div>
              <label className="flex items-center gap-2 text-sm pt-6">
                <input type="checkbox" checked={!!formData.activo}
                  onChange={(e) => setFormData((p) => ({ ...p, activo: e.target.checked }))} />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm pt-6">
                <input type="checkbox" checked={!!formData.visible}
                  onChange={(e) => setFormData((p) => ({ ...p, visible: e.target.checked }))} />
                Visible en registro
              </label>
            </div>
            {!fixedKind && (
              <div>
                <label className="label">Tipo</label>
                <select name="kind" value={formData.kind} onChange={handleInputChange} className="input">
                <option value="d28d">D28D</option>
                <option value="food">FOOD_PLAN</option>
                <option value="training">Entrenadores</option>
              </select>
              </div>
            )}
            {fixedKind === 'training' && (
              <input type="hidden" name="kind" value="training" />
            )}
            <div>
              <label className="label">{t('plans.name', 'Nombre del Plan')}</label>
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
              <label className="label">{t('common.description', 'Descripción')}</label>
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
                <label className="label">Precio COP</label>
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
                <label className="label">Precio USD</label>
                <input
                  name="precio_mensual_usd"
                  type="number"
                  value={formData.precio_mensual_usd}
                  onChange={handleInputChange}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('plans.max_users', 'Máximo de Usuarios')}</label>
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
            {(fixedKind !== 'training' && formData.kind !== 'training') && (
            <div>
              <label className="label">Ciclos permitidos (D28D)</label>
              <select
                multiple
                name="cycle_ids"
                value={formData.cycle_ids.map(String)}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                  setFormData((prev) => ({ ...prev, cycle_ids: values }));
                }}
                className="input"
                style={{ minHeight: 120 }}
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.startDate})</option>
                ))}
              </select>
            </div>
            )}
            <div className="md:col-span-2 border-t border-stone-200 pt-4 mt-2">
              <p className="text-sm font-semibold text-stone-800 mb-3">Soporte WhatsApp (wa.me)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="input" name="support_whatsapp" placeholder="+573192635819"
                  value={formData.support_whatsapp} onChange={handleInputChange} />
                <input className="input" name="support_name" placeholder="Nombre soporte"
                  value={formData.support_name} onChange={handleInputChange} />
                <textarea className="input md:col-span-2" name="support_message" rows={2}
                  placeholder="Mensaje precargado en WhatsApp"
                  value={formData.support_message} onChange={handleInputChange} />
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" name="support_activo" checked={!!formData.support_activo}
                    onChange={(e) => setFormData((p) => ({ ...p, support_activo: e.target.checked }))} />
                  Soporte activo
                </label>
              </div>
            </div>
            {fixedKind !== 'training' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  id="is_couple"
                  name="is_couple"
                  type="checkbox"
                  checked={!!formData.is_couple}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_couple: e.target.checked }))}
                />
                <label htmlFor="is_couple" className="label" style={{ marginBottom: 0 }}>Plan de pareja</label>
              </div>
              <div>
                <label className="label">Cupos incluidos</label>
                <input
                  name="included_seats"
                  type="number"
                  value={formData.included_seats}
                  onChange={handleInputChange}
                  className="input"
                  min="1"
                  max="2"
                />
              </div>
            </div>
            )}
            <div>
              <label className="label">module_access (JSON)</label>
              <textarea
                name="module_access"
                value={formData.module_access}
                onChange={handleInputChange}
                rows="5"
                className="input font-mono text-xs"
              />
            </div>
            <div>
              <label className="label">{t('plans.features', 'Características (separadas por coma)')}</label>
              <input 
                name="features" 
                value={formData.features} 
                onChange={handleInputChange} 
                placeholder={t('plans.features_ph', 'Ej: Acceso 24/7, Entrenador Personal')}
                className="input"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary">
                {t('plans.save', 'Guardar Plan')}
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
                  {!hideProgramColumn && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Programa</th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.name', 'Plan')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Usuarios</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">COP</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">USD</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Ciclos</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={hideProgramColumn ? 7 : 8} className="px-6 py-4 text-center text-sm text-slate-400">{t('plans.loading', 'Cargando planes...')}</td></tr>
                ) : plans.length > 0 ? (
                  plans.map((plan, idx) => (
                    <tr key={plan.nombre} className="hover:bg-stone-100 transition-colors">
                      {!hideProgramColumn && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900 capitalize">
                          {programs.find(p => p.id === plan.program_id)?.name || plan.program_id}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">{plan.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{plan.included_seats || plan.max_usuarios || 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">${Number(plan.precio_mensual || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{plan.precio_mensual_usd || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{plan.cycles_count ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${plan.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                          {plan.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                        {plan.visible === false && <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Oculto</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => movePlan(idx, -1)} title="Subir">↑</button>
                          <button type="button" className="text-xs px-2 py-1 rounded border" onClick={() => movePlan(idx, 1)} title="Bajar">↓</button>
                          <button className="text-lime-700 hover:text-black bg-stone-100 hover:bg-lime-400 p-2 rounded-lg" onClick={() => handleEdit(plan)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="text-stone-700 bg-stone-100 hover:bg-stone-200 p-2 rounded-lg text-xs" onClick={() => handleDuplicate(plan)} title="Duplicar">⧉</button>
                          <button className="text-xs px-2 py-1 rounded border" onClick={() => patchPlan(plan.nombre, { activo: plan.activo === false })} title="Activar/Desactivar">
                            {plan.activo === false ? 'On' : 'Off'}
                          </button>
                          <button className="text-xs px-2 py-1 rounded border" onClick={() => patchPlan(plan.nombre, { visible: plan.visible === false })} title="Mostrar/Ocultar">
                            {plan.visible === false ? 'Show' : 'Hide'}
                          </button>
                          <button className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg" onClick={() => handleDelete(plan.nombre)} title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={hideProgramColumn ? 7 : 8} className="px-6 py-4 text-center text-sm text-slate-400">{t('plans.none', 'No hay planes disponibles. Crea uno nuevo.')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
