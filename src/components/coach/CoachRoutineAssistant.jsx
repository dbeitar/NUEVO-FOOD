import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const BLOCK_LABELS = {
  calentamiento: 'Calentamiento',
  principal: 'Trabajo principal',
  cardio: 'Cardio / pulsaciones',
  estiramiento: 'Estiramiento',
};

function DayPreviewCard({ day }) {
  const grouped = (day.ejercicios || []).reduce((acc, ex) => {
    const key = ex.block_type || 'principal';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  return (
    <div className="border border-stone-200 rounded-xl p-3 mb-3 bg-white">
      <h4 className="font-bold text-stone-900 text-sm mb-1">
        Día {day.dia}: {day.nombre}
      </h4>
      {day.coach_brief && (
        <p className="text-xs text-stone-600 mb-2 leading-relaxed border-l-2 border-lime-400 pl-2">
          {day.coach_brief}
        </p>
      )}
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-lime-800 mb-1">
            {BLOCK_LABELS[type] || type}
          </p>
          <ul className="list-disc pl-4 text-xs text-stone-700 space-y-0.5">
            {list.map((ex) => (
              <li key={`${type}-${ex.exercise_name}`}>
                <strong>{ex.exercise_name}</strong>
                {' '}
                — {ex.sets}×{ex.reps}
                {ex.intensity_type ? ` · ${ex.intensity_type} ${ex.intensity_value}` : ''}
                {ex.rest_seconds ? ` · desc ${ex.rest_seconds}s` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function CoachRoutineAssistant({ onBack = null }) {
  const [routines, setRoutines] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    objetivo: 'hipertrofia',
    nivel: 'intermedio',
    dias: 4,
    notas: '',
  });
  const [suggestion, setSuggestion] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [routinesRes, clientsRes] = await Promise.all([
        api.get('/d28d/routines', { params: { scope: 'coach' } }),
        api.get('/training/coach/clients'),
      ]);
      setRoutines(routinesRes.data?.data || []);
      const list = clientsRes.data?.data || [];
      setClients(list);
      if (list.length && !assignUserId) setAssignUserId(String(list[0].id));
    } catch {
      setError('No se pudieron cargar rutinas o clientes.');
    } finally {
      setLoading(false);
    }
  }, [assignUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const suggest = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    setSuggestion(null);
    setPreview(null);
    try {
      const res = await api.post('/training/coach/ai-suggest-routine', form);
      if (res.data?.success) {
        const data = res.data.data;
        setSuggestion(data);
        await loadData();
        if (data.dias_preview?.length) {
          setPreview({ dias: data.dias_preview, nombre: data.nombre });
        } else {
          const prev = await api.post('/training/coach/ai-preview-plan', {
            routine_id: data.routine_id,
            dias: form.dias,
          });
          setPreview(prev.data?.data || null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo generar la sugerencia.');
    } finally {
      setBusy(false);
    }
  };

  const assignPlan = async () => {
    if (!suggestion?.routine_id || !assignUserId) {
      setError('Selecciona un cliente y genera una sugerencia primero.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/training/coach/ai-assign-plan', {
        routine_id: suggestion.routine_id,
        user_id: Number(assignUserId),
        dias: form.dias,
      });
      setSuccess('Plan asignado correctamente. El cliente lo verá en Mi entrenamiento.');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar el plan.');
    } finally {
      setBusy(false);
    }
  };

  const diasPreview = preview?.dias || suggestion?.dias_preview || [];

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header panel-admin-header">
        <div>
          {onBack && (
            <button type="button" className="btn-secondary panel-back-btn" onClick={onBack}>
              ← Panel
            </button>
          )}
          <h2 className="d28d-page-title">Asistente IA (100% gratuito)</h2>
          <p className="d28d-text-muted">
            Motor local especializado en entrenamiento y clases virtuales — sin APIs de pago.
            Genera cada día con calentamiento, bloque principal (5/6/7 ejercicios), cardio con pulsaciones, estiramiento e intensidad RPE/RIR.
          </p>
        </div>
      </header>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-lime-50 text-lime-900 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={suggest} className="card p-5 space-y-4">
          <h3 className="font-bold text-stone-900">Parámetros del plan</h3>
          <label className="block">
            <span className="label">Objetivo</span>
            <select className="input mt-1 w-full" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })}>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="fuerza">Fuerza</option>
              <option value="resistencia">Resistencia</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Nivel</span>
            <select className="input mt-1 w-full" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
              <option value="principiante">Principiante (5 ejercicios/día)</option>
              <option value="intermedio">Intermedio (6 ejercicios/día)</option>
              <option value="avanzado">Avanzado (7 ejercicios/día)</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Días por semana</span>
            <input className="input mt-1 w-full" type="number" min={2} max={6} value={form.dias} onChange={(e) => setForm({ ...form, dias: Number(e.target.value) })} />
          </label>
          <label className="block">
            <span className="label">Notas para la clase virtual</span>
            <textarea
              className="input mt-1 w-full"
              rows={3}
              placeholder="Ej. cliente con molestia en hombro derecho, enfatizar técnica en empujes…"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy || loading}>
            {busy ? 'Generando plan experto…' : '1. Generar rutina + plan por días'}
          </button>
          <p className="text-xs text-stone-500">
            Rutinas guardadas: {loading ? '…' : routines.length}
            {suggestion?.split?.length ? ` · Split: ${suggestion.split.join(' → ')}` : ''}
          </p>
        </form>

        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-stone-900">Vista previa y asignación</h3>
          {!suggestion ? (
            <p className="text-stone-500 text-sm">Genera el plan para ver el guion de cada día.</p>
          ) : (
            <>
              <p className="font-semibold text-lg">{suggestion.nombre}</p>
              <p className="text-sm text-stone-600">{suggestion.motivo}</p>
              {suggestion.reglas && (
                <p className="text-xs text-lime-800 bg-lime-50 border border-lime-200 rounded-lg px-3 py-2">
                  {suggestion.reglas.min_ejercicios_por_dia} ejercicios principales/día · {suggestion.reglas.intensidad}
                  {' '}
                  · Incluye: {suggestion.reglas.incluye?.join(', ')}
                </p>
              )}
              {diasPreview.length > 0 && (
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  {diasPreview.map((d) => (
                    <DayPreviewCard key={d.dia} day={d} />
                  ))}
                </div>
              )}
              <label className="block">
                <span className="label">Cliente</span>
                <select className="input mt-1 w-full" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn-primary w-full" disabled={busy || !assignUserId} onClick={assignPlan}>
                {busy ? 'Asignando…' : '2. Asignar plan al cliente'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
