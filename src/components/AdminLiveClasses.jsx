import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import LiveClassRoutineHost from './live/LiveClassRoutineHost';
import RoutineTemplateViewer from './routines/RoutineTemplateViewer';
import RoutineTemplateEditor from './routines/RoutineTemplateEditor';
import { emptyRoutine, routineFromApi } from '../shared/routineTemplateConstants';

const defaultForm = {
  title: '',
  description: '',
  zoom_link: '',
  start_time: '',
  end_time: '',
  gym_id: '',
  is_global: false,
  active: true,
  program_id: '',
  d28d_routine_id: '',
  use_routine: false,
  d28d_session_adjustments: '',
  d28d_host_user_id: '',
  zoom_account_id: 'virtual_d28d_1',
  auto_zoom: true,
};

function routineOptionLabel(r) {
  const sub = r.subcategoria || r.nombre;
  return `${r.nombre} — ${r.categoria} — ${sub} (v ${r.version})`;
}

function formatDateTimeLocal(value) {
  if (!value) return '';
  const sanitized = value.replace('Z', '');
  return sanitized;
}

export default function AdminLiveClasses() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [d28dHosts, setD28dHosts] = useState([]);
  const [previewClass, setPreviewClass] = useState(null);
  const [routinePreview, setRoutinePreview] = useState(null);
  const [showRoutineEditor, setShowRoutineEditor] = useState(false);
  const [routineEditForm, setRoutineEditForm] = useState(emptyRoutine());
  const [routineCategories, setRoutineCategories] = useState([]);
  const [routineEditSaving, setRoutineEditSaving] = useState(false);

  const canEditRoutines = useMemo(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : [currentUser?.rol].filter(Boolean);
    return roles.some((r) => ['super_admin', 'admin_d28d'].includes(r));
  }, [currentUser]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const resp = await api.get('/live-classes/admin');
      setItems(resp.data?.data || []);
    } catch {
      setError('No se pudo cargar la lista de clases.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const resp = await api.get('/live-classes/admin/attendance');
      setAttendance(resp.data?.data || []);
    } catch (err) {
      console.warn('No se pudo cargar reporte de asistencia', err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const resp = await api.get('/programs');
      setPrograms(resp.data?.data || []);
    } catch (err) {
      console.warn('Error loading programs', err);
    }
  };

  const fetchRoutines = useCallback(async () => {
    try {
      const resp = await api.get('/d28d/routines', { params: { estado: 'activa' } });
      setRoutines(resp.data?.data || []);
    } catch {
      setRoutines([]);
    }
  }, []);

  const fetchD28dHosts = async () => {
    try {
      const resp = await api.get('/live-classes/admin/d28d-hosts');
      setD28dHosts(resp.data?.data || []);
    } catch {
      setD28dHosts([]);
    }
  };

  const fetchRoutineCategories = async () => {
    try {
      const resp = await api.get('/d28d/routines/categories');
      setRoutineCategories((resp.data?.data || []).map((c) => c.nombre));
    } catch {
      setRoutineCategories([]);
    }
  };

  const loadRoutinePreview = async (routineId) => {
    if (!routineId) {
      setRoutinePreview(null);
      return;
    }
    try {
      const resp = await api.get(`/d28d/routines/${routineId}`);
      setRoutinePreview(resp.data?.data || null);
    } catch {
      setRoutinePreview(null);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchAttendance();
    fetchPrograms();
    fetchRoutines();
    fetchD28dHosts();
    fetchRoutineCategories();
  }, [fetchRoutines]);

  const openRoutineEditor = async () => {
    if (!form.d28d_routine_id || !canEditRoutines) return;
    try {
      const resp = await api.get(`/d28d/routines/${form.d28d_routine_id}`);
      const data = resp.data?.data;
      if (!data) return;
      setRoutineEditForm(routineFromApi(data));
      setShowRoutineEditor(true);
    } catch {
      setError('No se pudo cargar la plantilla para editar.');
    }
  };

  const saveRoutineTemplate = async () => {
    if (!form.d28d_routine_id) return;
    try {
      setRoutineEditSaving(true);
      setError('');
      await api.put(`/d28d/routines/${form.d28d_routine_id}`, { ...routineEditForm, new_version: false });
      await fetchRoutines();
      await loadRoutinePreview(form.d28d_routine_id);
      setShowRoutineEditor(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Error guardando la plantilla.');
    } finally {
      setRoutineEditSaving(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const names = [...routineCategories];
    if (routineEditForm.categoria && !names.includes(routineEditForm.categoria)) {
      names.push(routineEditForm.categoria);
    }
    return names;
  }, [routineCategories, routineEditForm.categoria]);

  const hostLabel = (hostId) => {
    const h = d28dHosts.find((x) => String(x.id) === String(hostId));
    return h ? `${h.nombre} (${h.email})` : '—';
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generateZoomLink = async () => {
    if (!form.program_id || !form.start_time || !form.end_time) {
      setError('Selecciona programa, inicio y fin antes de generar Zoom.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const resp = await api.post('/live-classes/admin/zoom-meeting', {
        title: form.use_routine && form.d28d_routine_id ? '' : form.title,
        program_id: form.program_id,
        zoom_account_id: form.program_id === 'virtual_d28d' ? form.zoom_account_id : null,
        start_time: form.start_time,
        end_time: form.end_time,
        d28d_host_user_id: form.d28d_host_user_id ? Number(form.d28d_host_user_id) : null,
        d28d_routine_id: form.use_routine && form.d28d_routine_id ? Number(form.d28d_routine_id) : null,
        auto_zoom: true,
      });
      const link = resp.data?.data?.zoom_link;
      if (link) {
        handleChange('zoom_link', link);
        const msg = resp.data?.data?.zoom?.message;
        if (msg) setError(msg);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo generar el enlace Zoom.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
      event.preventDefault();
      try {
        setSaving(true);
        setError('');
        const payload = {
          title: form.use_routine && form.d28d_routine_id ? '' : form.title,
          description: form.description,
          zoom_link: form.auto_zoom && !form.zoom_link ? '' : form.zoom_link,
          start_time: form.start_time,
          end_time: form.end_time,
          gym_id: form.gym_id || null,
          is_global: form.is_global,
          active: form.active,
          program_id: form.program_id || null,
          zoom_account_id: form.program_id === 'virtual_d28d' ? form.zoom_account_id : null,
          auto_zoom: form.auto_zoom,
          d28d_routine_id: form.use_routine && form.d28d_routine_id ? Number(form.d28d_routine_id) : null,
          d28d_session_adjustments: form.use_routine ? (form.d28d_session_adjustments || '').trim() : null,
          d28d_host_user_id: form.d28d_host_user_id ? Number(form.d28d_host_user_id) : null,
        };
        if (form.id) {
          await api.put(`/live-classes/admin/${form.id}`, payload);
        } else {
          await api.post('/live-classes/admin', payload);
        }
        setForm(defaultForm);
        await fetchItems();
        await fetchAttendance();
      } catch {
        setError('Error guardando la clase.');
      } finally {
        setSaving(false);
      }
    };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      zoom_link: item.zoom_link,
      start_time: item.start_time,
      end_time: item.end_time,
      gym_id: item.gym_id || '',
      is_global: !!item.is_global,
      active: !!item.active,
      program_id: item.program_id || '',
      d28d_routine_id: item.d28d_routine_id || '',
      use_routine: Boolean(item.d28d_routine_id),
      d28d_session_adjustments: item.d28d_routine_snapshot?.session_adjustments
        || item.d28d_session_adjustments
        || '',
      d28d_host_user_id: item.d28d_host_user_id || '',
      zoom_account_id: item.zoom_account_id || 'virtual_d28d_1',
      auto_zoom: false,
    });
    setPreviewClass(item);
    if (item.d28d_routine_id) {
      loadRoutinePreview(item.d28d_routine_id);
    } else {
      setRoutinePreview(item.d28d_routine || item.d28d_routine_snapshot || null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('¿Eliminar esta clase en vivo?')) return;
    try {
      setSaving(true);
      await api.delete(`/live-classes/admin/${item.id}`);
      await fetchItems();
      await fetchAttendance();
    } catch {
      setError('Error eliminando la clase.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Administrar Clases en Vivo</h2>
          <p className="text-sm text-stone-600 mt-2">Crea, edita y publica sesiones de Zoom para tus entrenamientos en vivo.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {showRoutineEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-stone-900">Editar plantilla D28D</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowRoutineEditor(false)}>Cerrar</button>
            </div>
            <RoutineTemplateEditor
              form={routineEditForm}
              setForm={setRoutineEditForm}
              categoryOptions={categoryOptions}
              readOnly={false}
            />
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button type="button" className="btn-primary" disabled={routineEditSaving} onClick={saveRoutineTemplate}>
                Guardar plantilla
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowRoutineEditor(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <form className="grid gap-4 mb-8" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-lime-200 bg-lime-50/40 p-4 mb-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={form.use_routine}
              onChange={(e) => handleChange('use_routine', e.target.checked)}
            />
            Programar con rutina D28D (sin escribir ejercicios manualmente)
          </label>
          {form.use_routine && (
            <>
            <select
              className="input w-full mt-2"
              value={form.d28d_routine_id}
              onChange={(e) => {
                handleChange('d28d_routine_id', e.target.value);
                loadRoutinePreview(e.target.value);
              }}
              required
            >
              <option value="">Seleccionar rutina…</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {routineOptionLabel(r)}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-2">
              Mismas plantillas que el Maestro de Rutinas D28D (Mi panel de entrenamiento / maestros).
            </p>
            {form.d28d_routine_id && canEditRoutines && (
              <button
                type="button"
                className="btn-secondary text-sm mt-2"
                onClick={openRoutineEditor}
              >
                Editar plantilla y videos de ejercicios
              </button>
            )}
            <label className="block mt-3">
              <span className="text-xs font-semibold text-slate-700">Entrenador D28D (host de la sesión)</span>
              <select
                className="input w-full mt-1"
                value={form.d28d_host_user_id}
                onChange={(e) => handleChange('d28d_host_user_id', e.target.value)}
              >
                <option value="">Sin asignar</option>
                {d28dHosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nombre} — {h.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block mt-3">
              <span className="text-xs font-semibold text-slate-700">Ajustes puntuales para esta sesión (no modifica la plantilla)</span>
              <textarea
                className="input w-full min-h-[72px] mt-1"
                value={form.d28d_session_adjustments}
                onChange={(e) => handleChange('d28d_session_adjustments', e.target.value)}
                placeholder="Ej: reducir carga 10%, sustituir burpees por step-ups…"
              />
            </label>
            {routinePreview && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 max-h-[420px] overflow-y-auto">
                <p className="text-xs font-semibold text-slate-600 mb-2">Vista previa de plantilla</p>
                <RoutineTemplateViewer
                  routine={routinePreview}
                  sessionAdjustments={form.d28d_session_adjustments}
                  compact
                />
              </div>
            )}
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Título</span>
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required={!form.use_routine}
              disabled={form.use_routine}
              placeholder={form.use_routine ? 'Se completa desde la rutina' : ''}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Programa D28D</span>
            <select
              className="input w-full mt-1"
              value={form.program_id}
              onChange={(e) => {
                const pid = e.target.value;
                handleChange('program_id', pid);
                if (pid === 'virtual_d28d') handleChange('zoom_account_id', 'virtual_d28d_1');
              }}
              required
            >
              <option value="">Seleccionar programa…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          {form.program_id === 'virtual_d28d' && (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Cuenta Zoom Virtual</span>
              <select
                className="input w-full mt-1"
                value={form.zoom_account_id}
                onChange={(e) => handleChange('zoom_account_id', e.target.value)}
              >
                <option value="virtual_d28d_1">Cuenta 1 — D28dzoom1@gmail.com</option>
                <option value="virtual_d28d_2">Cuenta 2 — d28dzoom2@gmail.com</option>
              </select>
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Enlace Zoom</span>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 mt-1 mb-2">
              <input
                type="checkbox"
                checked={!!form.auto_zoom}
                onChange={(e) => handleChange('auto_zoom', e.target.checked)}
              />
              Generar enlace automático (cuenta del programa + anfitrión alterno)
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                className="input flex-1 min-w-[200px]"
                value={form.zoom_link}
                onChange={(e) => handleChange('zoom_link', e.target.value)}
                required={!form.auto_zoom}
                placeholder={form.auto_zoom ? 'Se genera al guardar o con el botón' : 'https://zoom.us/j/…'}
              />
              <button
                type="button"
                className="btn-secondary text-sm whitespace-nowrap"
                disabled={saving || !form.program_id}
                onClick={generateZoomLink}
              >
                Generar Zoom
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              P = Pancitas · V = Vital · Virtual = cuentas 1 y 2. El entrenador D28D asignado recibe notificación.
            </p>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Inicio</span>
            <input
              type="datetime-local"
              className="input w-full"
              value={formatDateTimeLocal(form.start_time)}
              onChange={(e) => handleChange('start_time', e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Fin</span>
            <input
              type="datetime-local"
              className="input w-full"
              value={formatDateTimeLocal(form.end_time)}
              onChange={(e) => handleChange('end_time', e.target.value)}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Descripción</span>
          <textarea
            className="input w-full min-h-[120px]"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Gym ID</span>
            <input
              className="input w-full"
              value={form.gym_id}
              onChange={(e) => handleChange('gym_id', e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.is_global}
                onChange={(e) => handleChange('is_global', e.target.checked)}
              />
              <span className="text-sm text-slate-700">Global</span>
            </label>
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => handleChange('active', e.target.checked)}
              />
              <span className="text-sm text-slate-700">Activo</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full md:w-auto" disabled={saving}>
          {form.id ? 'Actualizar clase' : 'Crear clase'}
        </button>
      </form>

      {previewClass?.d28d_routine && (
        <LiveClassRoutineHost classItem={previewClass} user={null} />
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-[0.2em]">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Rutina D28D</th>
              <th className="px-4 py-3">Host D28D</th>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Programa</th>
              <th className="px-4 py-3">Gym / Global</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="px-4 py-5 text-center text-slate-500">
                  Cargando clases...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-5 text-center text-slate-500">
                  Ninguna clase disponible.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-4 font-medium text-slate-900">{item.title}</td>
                  <td className="px-4 py-4 text-slate-600 text-xs">
                    {item.d28d_routine?.nombre || item.d28d_routine_snapshot?.nombre || '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-xs">
                    {hostLabel(item.d28d_host_user_id) || item.coach || '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{item.start_time}</td>
                  <td className="px-4 py-4 text-slate-600 font-bold capitalize">{programs.find(p => p.id === item.program_id)?.name || '---'}</td>
                  <td className="px-4 py-4 text-slate-600">{item.is_global ? 'Global' : item.gym_id || 'Privada'}</td>
                  <td className="px-4 py-4 text-slate-600">{item.active ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-4 space-x-2">
                    <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleDelete(item)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Reporte de asistentes por gym</h3>
            <p className="text-sm text-stone-600">Agrupa los usuarios inscritos a cada clase según el gimnasio asignado en su cuenta.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={fetchAttendance}>Actualizar reporte</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500 text-xs uppercase tracking-[0.18em]">
              <tr>
                <th className="px-4 py-3">Clase</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Asistentes</th>
                <th className="px-4 py-3">Gimnasios</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-stone-500">Sin asistencia registrada todavía.</td>
                </tr>
              ) : attendance.map((row) => (
                <tr key={row.class_id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-4 font-semibold text-stone-900">{row.title}</td>
                  <td className="px-4 py-4 text-stone-600">{row.start_time}</td>
                  <td className="px-4 py-4 text-stone-900 font-semibold">{row.total_attendees}</td>
                  <td className="px-4 py-4">
                    {row.by_gym?.length ? (
                      <div className="space-y-2">
                        {row.by_gym.map((gym) => (
                          <div key={`${row.class_id}-${gym.gym_name}`} className="rounded-2xl bg-stone-50 border border-slate-200 p-3">
                            <div className="font-semibold text-stone-900">{gym.gym_name} · {gym.count}</div>
                            <div className="text-xs text-stone-600 mt-1">
                              {gym.attendees.map((attendee) => attendee.nombre || attendee.email).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-stone-500">Sin inscritos</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
