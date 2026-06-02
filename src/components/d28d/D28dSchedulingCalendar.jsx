import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const VIEWS = { MONTH: 'month', WEEK: 'week', DAY: 'day' };
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);

function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export default function D28dSchedulingCalendar({ programs = [], onSaved }) {
  const [view, setView] = useState(VIEWS.WEEK);
  const [anchor, setAnchor] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    title: 'Sesión D28D',
    program_id: 'virtual_d28d',
    zoom_account_id: 'virtual_d28d_1',
    auto_zoom: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    const resp = await api.get('/live-classes/admin');
    setItems(resp.data?.data || []);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const classesInRange = useMemo(() => {
    return items.filter((c) => {
      const s = new Date(c.start_time);
      if (view === VIEWS.DAY) return sameDay(s, anchor);
      if (view === VIEWS.WEEK) {
        const end = addDays(weekStart, 7);
        return s >= weekStart && s < end;
      }
      return s.getMonth() === anchor.getMonth() && s.getFullYear() === anchor.getFullYear();
    });
  }, [items, view, anchor, weekStart]);

  const openSlot = (day, hour) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    setModal({ start, end });
    setForm((f) => ({
      ...f,
      start_time: toLocalInput(start),
      end_time: toLocalInput(end),
    }));
    setError('');
  };

  const saveClass = async (e) => {
    e.preventDefault();
    if (!form.program_id || !form.start_time || !form.end_time) {
      setError('Programa, fecha y hora son requeridos.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const startNorm = new Date(form.start_time).toISOString();
      const endNorm = new Date(form.end_time).toISOString();
      await api.post('/live-classes/admin', {
        title: form.title || 'Sesión D28D',
        program_id: form.program_id,
        zoom_account_id: form.program_id === 'virtual_d28d' ? form.zoom_account_id : null,
        start_time: startNorm,
        end_time: endNorm,
        auto_zoom: form.auto_zoom,
        is_global: true,
        active: true,
        source_module: 'd28d',
      });
      setModal(null);
      await fetchItems();
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la clase.');
    } finally {
      setSaving(false);
    }
  };

  const shift = (delta) => {
    const x = new Date(anchor);
    if (view === VIEWS.MONTH) x.setMonth(x.getMonth() + delta);
    else if (view === VIEWS.WEEK) x.setDate(x.getDate() + delta * 7);
    else x.setDate(x.getDate() + delta);
    setAnchor(x);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {Object.entries(VIEWS).map(([k, v]) => (
            <button
              key={v}
              type="button"
              className={`px-3 py-1 rounded-lg text-sm font-medium ${view === v ? 'bg-indigo-600 text-white' : 'bg-stone-100'}`}
              onClick={() => setView(v)}
            >
              {k === 'MONTH' ? 'Mes' : k === 'WEEK' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" className="btn-secondary text-sm" onClick={() => shift(-1)}>←</button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {anchor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric', day: view === VIEWS.DAY ? 'numeric' : undefined })}
          </span>
          <button type="button" className="btn-secondary text-sm" onClick={() => shift(1)}>→</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => setAnchor(new Date())}>Hoy</button>
        </div>
      </div>

      {view === VIEWS.WEEK && (
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-stone-50">
                <th className="p-2 w-14" />
                {weekDays.map((d) => (
                  <th key={d.toISOString()} className="p-2 text-center border-l border-stone-100">
                    {d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-t border-stone-100">
                  <td className="p-1 text-stone-500 text-right pr-2">{hour}:00</td>
                  {weekDays.map((day) => {
                    const cellClasses = classesInRange.filter((c) => {
                      const s = new Date(c.start_time);
                      return sameDay(s, day) && s.getHours() === hour;
                    });
                    return (
                      <td
                        key={`${day.toISOString()}-${hour}`}
                        className="border-l border-stone-100 p-0 h-10 align-top cursor-pointer hover:bg-lime-50/80"
                        onClick={() => openSlot(day, hour)}
                        title="Clic para nueva clase"
                      >
                        {cellClasses.map((c) => (
                          <div
                            key={c.id}
                            className="bg-indigo-100 text-indigo-900 text-[10px] px-1 py-0.5 m-0.5 rounded truncate"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {c.title}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === VIEWS.DAY && (
        <div className="space-y-2">
          {HOURS.map((hour) => {
            const day = anchor;
            const slotClasses = classesInRange.filter((c) => {
              const s = new Date(c.start_time);
              return s.getHours() === hour;
            });
            return (
              <button
                key={hour}
                type="button"
                className="w-full text-left card p-3 flex justify-between items-center hover:border-indigo-300"
                onClick={() => openSlot(day, hour)}
              >
                <span className="font-mono text-sm">{pad(hour)}:00</span>
                <span className="text-sm text-stone-600">
                  {slotClasses.length ? slotClasses.map((c) => c.title).join(', ') : '+ Nueva clase'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {view === VIEWS.MONTH && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => {
            const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
            const start = startOfWeek(first);
            const day = addDays(start, i);
            const count = classesInRange.filter((c) => sameDay(new Date(c.start_time), day)).length;
            return (
              <button
                key={i}
                type="button"
                className={`min-h-[72px] p-2 rounded-lg border text-left text-xs ${
                  day.getMonth() === anchor.getMonth() ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60'
                } hover:border-indigo-400`}
                onClick={() => {
                  setAnchor(day);
                  setView(VIEWS.DAY);
                }}
              >
                <div className="font-semibold">{day.getDate()}</div>
                {count > 0 ? <div className="text-indigo-600 mt-1">{count} clase(s)</div> : null}
              </button>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-3" onSubmit={saveClass}>
            <h3 className="text-lg font-bold">Nueva clase</h3>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <label className="block text-sm">
              Título
              <input className="input w-full mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-sm">
              Programa
              <select
                className="input w-full mt-1"
                value={form.program_id}
                onChange={(e) => setForm({ ...form, program_id: e.target.value })}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.nombre || p.id}</option>
                ))}
                {!programs.length ? (
                  <>
                    <option value="virtual_d28d">Virtual D28D</option>
                    <option value="vital">Vital</option>
                    <option value="pancitas">Pancitas</option>
                  </>
                ) : null}
              </select>
            </label>
            <label className="block text-sm">
              Inicio
              <input
                type="datetime-local"
                className="input w-full mt-1"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm">
              Fin
              <input
                type="datetime-local"
                className="input w-full mt-1"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.auto_zoom}
                onChange={(e) => setForm({ ...form, auto_zoom: e.target.checked })}
              />
              Generar Zoom automático
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
