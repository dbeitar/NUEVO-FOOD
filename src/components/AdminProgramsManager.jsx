import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  Settings, Save, ShieldCheck, Calendar, Info, Plus, Trash2, Pencil,
} from 'lucide-react';
import { formatCycleDate, computeCycleEnd } from '../utils/cycleUtils';

// Panel admin del módulo D28D. Permite operar el catálogo de programas
// (Vital, Pancitas, Virtual y los que se creen) y los ciclos de 28 días
// que les aplican. Todo se persiste vía /api/programs y /api/cycles.

const emptyProgramForm = {
  id: '',
  name: '',
  color: '#10b981',
  active: true,
  active_cycle_id: 1,
  zoom_email: '',
};

const emptyCycleForm = {
  name: '',
  startDate: '',
  label: '',
};

export default function AdminProgramsManager() {
  const [programs, setPrograms] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Estado de edición de programa
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [creatingProgram, setCreatingProgram] = useState(false);

  // Estado de edición de ciclo
  const [editingCycleId, setEditingCycleId] = useState(null);
  const [cycleForm, setCycleForm] = useState(emptyCycleForm);
  const [creatingCycle, setCreatingCycle] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/programs');
      setPrograms(res.data?.data || []);
    } catch {
      setError('Error al cargar programas');
    }
  }, []);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await api.get('/cycles');
      setCycles(res.data?.data || []);
    } catch {
      setError('Error al cargar ciclos');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchPrograms(), fetchCycles()]);
      setLoading(false);
    })();
  }, [fetchPrograms, fetchCycles]);

  // Auto-clear de mensajes flash
  useEffect(() => {
    if (!message && !error) return;
    const t = setTimeout(() => { setMessage(''); setError(''); }, 4000);
    return () => clearTimeout(t);
  }, [message, error]);

  // ============================ PROGRAMAS ===================================

  const startEditProgram = (p) => {
    setCreatingProgram(false);
    setEditingProgramId(p.id);
    setProgramForm({
      id: p.id,
      name: p.name || '',
      color: p.color || '#10b981',
      active: p.active !== false,
      active_cycle_id: Number(p.active_cycle_id) || (cycles[0]?.id ?? 1),
      zoom_email: p.zoom_email || '',
    });
  };

  const startCreateProgram = () => {
    setEditingProgramId(null);
    setCreatingProgram(true);
    setProgramForm({ ...emptyProgramForm, active_cycle_id: cycles[0]?.id ?? 1 });
  };

  const cancelProgramForm = () => {
    setEditingProgramId(null);
    setCreatingProgram(false);
    setProgramForm(emptyProgramForm);
  };

  const submitProgram = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      if (creatingProgram) {
        if (!programForm.name.trim()) {
          setError('El nombre del programa es obligatorio');
          return;
        }
        await api.post('/programs', {
          name: programForm.name.trim(),
          color: programForm.color,
          active: programForm.active,
          active_cycle_id: Number(programForm.active_cycle_id) || null,
          zoom_email: programForm.zoom_email.trim() || undefined,
        });
        setMessage('Programa creado');
      } else if (editingProgramId) {
        await api.put(`/programs/${editingProgramId}`, {
          name: programForm.name.trim(),
          color: programForm.color,
          active: programForm.active,
          active_cycle_id: Number(programForm.active_cycle_id) || null,
          zoom_email: programForm.zoom_email.trim() || undefined,
        });
        setMessage('Programa actualizado');
      }
      cancelProgramForm();
      await fetchPrograms();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error guardando programa');
    }
  };

  const toggleProgramActive = async (p) => {
    setError(''); setMessage('');
    try {
      await api.put(`/programs/${p.id}`, { active: !p.active });
      await fetchPrograms();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error cambiando estado');
    }
  };

  const deleteProgram = async (p) => {
    if (!window.confirm(`¿Borrar el programa "${p.name}"? Esta acción no se puede deshacer.`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/programs/${p.id}`);
      setMessage('Programa eliminado');
      await fetchPrograms();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error borrando programa');
    }
  };

  // ============================ CICLOS ======================================

  const startEditCycle = (c) => {
    setCreatingCycle(false);
    setEditingCycleId(c.id);
    setCycleForm({
      name: c.name || `Ciclo ${c.id}`,
      startDate: c.startDate || '',
      label: c.label || '',
    });
  };

  const startCreateCycle = () => {
    setEditingCycleId(null);
    setCreatingCycle(true);
    setCycleForm(emptyCycleForm);
  };

  const cancelCycleForm = () => {
    setEditingCycleId(null);
    setCreatingCycle(false);
    setCycleForm(emptyCycleForm);
  };

  const submitCycle = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!cycleForm.startDate) {
      setError('La fecha de inicio del ciclo es obligatoria');
      return;
    }
    try {
      if (creatingCycle) {
        await api.post('/cycles', cycleForm);
        setMessage('Ciclo creado');
      } else if (editingCycleId) {
        await api.put(`/cycles/${editingCycleId}`, cycleForm);
        setMessage('Ciclo actualizado');
      }
      cancelCycleForm();
      await fetchCycles();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error guardando ciclo');
    }
  };

  const deleteCycle = async (c) => {
    if (!window.confirm(`¿Borrar "${c.name}" (inicia ${formatCycleDate(c.startDate)})?`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/cycles/${c.id}`);
      setMessage('Ciclo eliminado');
      await fetchCycles();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error borrando ciclo');
    }
  };

  // ============================ RENDER ======================================

  if (loading) return <div className="p-8 text-center text-stone-600">Cargando programas y ciclos...</div>;

  const renderProgramForm = () => (
    <form onSubmit={submitProgram} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-md font-semibold text-stone-900">
          {creatingProgram ? 'Nuevo programa D28D' : `Editar programa: ${programForm.name || editingProgramId}`}
        </h4>
        <button type="button" className="btn-secondary text-xs" onClick={cancelProgramForm}>Cerrar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre del programa</label>
          <input
            className="input"
            value={programForm.name}
            onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
            placeholder="Vital, Pancitas, Virtual D28D..."
            required
          />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={programForm.color}
              onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
              className="h-10 w-14 rounded border border-stone-300 cursor-pointer"
            />
            <input
              className="input flex-1"
              value={programForm.color}
              onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
              placeholder="#10b981"
            />
          </div>
        </div>
        <div>
          <label className="label">Ciclo activo</label>
          <select
            className="input"
            value={programForm.active_cycle_id}
            onChange={(e) => setProgramForm({ ...programForm, active_cycle_id: Number(e.target.value) })}
          >
            <option value="">— Sin asignar —</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — inicia {formatCycleDate(c.startDate)}{c.label ? ` · ${c.label}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Email Zoom (opcional)</label>
          <input
            className="input"
            value={programForm.zoom_email}
            onChange={(e) => setProgramForm({ ...programForm, zoom_email: e.target.value })}
            placeholder="zoom@d28d.com"
          />
          <p className="text-xs text-stone-500 mt-1">La contraseña Zoom NUNCA se guarda aquí. Se inyecta desde el servidor con la variable de entorno correspondiente.</p>
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={!!programForm.active}
              onChange={(e) => setProgramForm({ ...programForm, active: e.target.checked })}
            />
            Programa activo (visible para usuarios)
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={cancelProgramForm}>Cancelar</button>
        <button type="submit" className="btn-primary inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
    </form>
  );

  const renderCycleForm = () => (
    <form onSubmit={submitCycle} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-md font-semibold text-stone-900">
          {creatingCycle ? 'Nuevo ciclo' : `Editar ciclo: ${cycleForm.name}`}
        </h4>
        <button type="button" className="btn-secondary text-xs" onClick={cancelCycleForm}>Cerrar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Nombre del ciclo</label>
          <input
            className="input"
            value={cycleForm.name}
            onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
            placeholder="Ciclo 14"
          />
        </div>
        <div>
          <label className="label">Fecha de inicio</label>
          <input
            type="date"
            className="input"
            value={cycleForm.startDate}
            onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
            required
          />
          {cycleForm.startDate && (
            <p className="text-xs text-stone-500 mt-1">
              Termina el {formatCycleDate(computeCycleEnd(cycleForm.startDate))} (28 días).
            </p>
          )}
        </div>
        <div>
          <label className="label">Etiqueta (opcional)</label>
          <input
            className="input"
            value={cycleForm.label}
            onChange={(e) => setCycleForm({ ...cycleForm, label: e.target.value })}
            placeholder="Vacacional, Especial..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={cancelCycleForm}>Cancelar</button>
        <button type="submit" className="btn-primary inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> Guardar
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Gestión de Programas D28D</h2>
            <p className="text-stone-600">Programas (Vital, Pancitas, Virtual…) y los ciclos de 28 días en los que operan.</p>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">{message}</div>}

      {/* ============================ PROGRAMAS ================================== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-stone-900">Programas</h3>
          <button className="btn-primary inline-flex items-center gap-2" onClick={startCreateProgram}>
            <Plus className="w-4 h-4" /> Nuevo programa
          </button>
        </div>

        {(creatingProgram || editingProgramId) && renderProgramForm()}

        {programs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center text-stone-600">
            Aún no hay programas. Crea el primero.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((p) => {
              const activeCycle = cycles.find((c) => Number(c.id) === Number(p.active_cycle_id));
              return (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || '#cbd5e1' }} />
                      <h4 className="text-base font-bold text-stone-900 truncate">{p.name}</h4>
                    </div>
                    <ShieldCheck className={`w-5 h-5 ${p.active ? 'text-lime-500' : 'text-slate-300'}`} />
                  </div>

                  <div className="bg-stone-50 p-3 rounded-2xl mb-3">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Ciclo activo</p>
                    {activeCycle ? (
                      <>
                        <p className="text-lg font-bold text-stone-800">{activeCycle.name}</p>
                        <p className="text-xs text-stone-500">
                          {formatCycleDate(activeCycle.startDate)} → {formatCycleDate(computeCycleEnd(activeCycle.startDate))}
                          {activeCycle.label ? ` · ${activeCycle.label}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-stone-500">Sin ciclo asignado</p>
                    )}
                  </div>

                  {p.zoom_email && (
                    <div className="bg-stone-50 p-3 rounded-2xl mb-3 text-xs text-stone-700">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Email Zoom</p>
                      <p className="font-medium truncate">{p.zoom_email}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-50 text-xs"
                      onClick={() => startEditProgram(p)}
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs border ${
                        p.active
                          ? 'border-stone-300 text-stone-700 hover:bg-stone-50'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      onClick={() => toggleProgramActive(p)}
                    >
                      {p.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs"
                      onClick={() => deleteProgram(p)}
                    >
                      <Trash2 className="w-3 h-3" /> Borrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================ CICLOS ================================== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-stone-700" />
            <h3 className="text-lg font-semibold text-stone-900">Ciclos de 28 días</h3>
          </div>
          <button className="btn-primary inline-flex items-center gap-2" onClick={startCreateCycle}>
            <Plus className="w-4 h-4" /> Nuevo ciclo
          </button>
        </div>

        <p className="text-xs text-stone-500 mb-3 inline-flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          Cada ciclo dura 28 días exactos (4 semanas). El sistema calcula automáticamente el fin a partir de la fecha de inicio.
        </p>

        {(creatingCycle || editingCycleId) && renderCycleForm()}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Ciclo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Inicio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Fin (auto)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Etiqueta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">Programas asociados</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-sm text-stone-500">
                      No hay ciclos cargados. Crea el primero para empezar.
                    </td>
                  </tr>
                ) : cycles.map((c) => {
                  const inUse = programs.filter((p) => Number(p.active_cycle_id) === Number(c.id));
                  return (
                    <tr key={c.id} className="hover:bg-stone-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-stone-900">{c.name}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-stone-700">{formatCycleDate(c.startDate)}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-stone-700">{formatCycleDate(computeCycleEnd(c.startDate))}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-stone-700">{c.label || '—'}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs">
                        {inUse.length === 0 ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {inUse.map((p) => (
                              <span key={p.id} className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-50 text-xs"
                            onClick={() => startEditCycle(c)}
                          >
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => deleteCycle(c)}
                            disabled={inUse.length > 0}
                            title={inUse.length > 0 ? 'Reasigna primero los programas que usan este ciclo' : 'Borrar ciclo'}
                          >
                            <Trash2 className="w-3 h-3" /> Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
