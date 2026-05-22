import { useEffect, useState } from 'react';
import api from '../services/api';
import LiveClassRoutineHost from './live/LiveClassRoutineHost';

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
};

function formatDateTimeLocal(value) {
  if (!value) return '';
  const sanitized = value.replace('Z', '');
  return sanitized;
}

export default function AdminLiveClasses() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [previewClass, setPreviewClass] = useState(null);

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

  const fetchRoutines = async () => {
    try {
      const resp = await api.get('/d28d/routines');
      setRoutines(resp.data?.data || []);
    } catch {
      setRoutines([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchAttendance();
    fetchPrograms();
    fetchRoutines();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
      event.preventDefault();
      try {
        setSaving(true);
        setError('');
        const payload = {
          title: form.use_routine && form.d28d_routine_id ? '' : form.title,
          description: form.description,
          zoom_link: form.zoom_link,
          start_time: form.start_time,
          end_time: form.end_time,
          gym_id: form.gym_id || null,
          is_global: form.is_global,
          active: form.active,
          program_id: form.program_id || null,
          d28d_routine_id: form.use_routine && form.d28d_routine_id ? Number(form.d28d_routine_id) : null,
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
    });
    setPreviewClass(item);
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
            <select
              className="input w-full mt-2"
              value={form.d28d_routine_id}
              onChange={(e) => handleChange('d28d_routine_id', e.target.value)}
              required
            >
              <option value="">Seleccionar rutina…</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} — {r.categoria} (v{r.version})
                </option>
              ))}
            </select>
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
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Enlace Zoom</span>
            <div className="flex gap-2">
              <input
                className="input w-full"
                value={form.zoom_link}
                onChange={(e) => handleChange('zoom_link', e.target.value)}
                required
              />
              <select 
                className="input text-xs w-auto"
                onChange={(e) => {
                  const p = programs.find(pg => pg.id === e.target.value);
                  if (p) {
                    // Si es virtual_d28d, tiene múltiples cuentas. Usamos la primera por ahora o pedimos elegir.
                    const email = p.zoom_accounts ? p.zoom_accounts[0].email : p.zoom_email;
                    handleChange('zoom_link', `Zoom: ${email}`);
                    handleChange('program_id', p.id);
                  }
                }}
              >
                <option value="">Plantilla...</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
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
                <td colSpan="7" className="px-4 py-5 text-center text-slate-500">
                  Cargando clases...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-5 text-center text-slate-500">
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
