import { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../services/api';

const FIELDS = [
  { key: 'weight_kg', label: 'Peso (kg)' },
  { key: 'chest_cm', label: 'Pecho (cm)' },
  { key: 'shoulders_cm', label: 'Hombros (cm)' },
  { key: 'right_bicep_cm', label: 'Bícep derecho (cm)' },
  { key: 'left_bicep_cm', label: 'Bícep izquierdo (cm)' },
  { key: 'abdomen_above_cm', label: 'Abdomen +2 cm ombligo' },
  { key: 'abdomen_navel_cm', label: 'Abdomen ombligo' },
  { key: 'abdomen_below_cm', label: 'Abdomen -2 cm ombligo' },
  { key: 'glute_cm', label: 'Glúteo (cm)' },
  { key: 'right_thigh_cm', label: 'Muslo derecho (cm)' },
  { key: 'left_thigh_cm', label: 'Muslo izquierdo (cm)' },
  { key: 'right_calf_cm', label: 'Pantorrilla derecha (cm)' },
  { key: 'left_calf_cm', label: 'Pantorrilla izquierda (cm)' },
];

const emptyForm = () => ({
  recorded_at: new Date().toISOString().split('T')[0],
  notes: '',
  ...Object.fromEntries(FIELDS.map((f) => [f.key, ''])),
});

export default function TrainingBodyMeasurements({ onBack = null, readOnlyUserId = null }) {
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const coachView = readOnlyUserId != null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = coachView
        ? `/training/coach/clients/${readOnlyUserId}/measurements`
        : '/training/measurements/me';
      const res = await api.get(url);
      setHistory(res.data?.data || []);
    } catch {
      setError('No se pudieron cargar las medidas.');
    } finally {
      setLoading(false);
    }
  }, [coachView, readOnlyUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () => [...history]
      .reverse()
      .map((h) => ({
        fecha: h.recorded_at,
        peso: h.weight_kg,
        pecho: h.chest_cm,
        cintura: h.abdomen_navel_cm,
      })),
    [history],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (coachView) return;
    setSaving(true);
    setError('');
    try {
      const payload = { recorded_at: form.recorded_at, notes: form.notes };
      for (const f of FIELDS) {
        if (form[f.key] !== '') payload[f.key] = Number(form[f.key]);
      }
      await api.post('/training/measurements', payload);
      setForm(emptyForm());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (coachView || !window.confirm('¿Eliminar este registro?')) return;
    try {
      await api.delete(`/training/measurements/${id}`);
      await load();
    } catch {
      setError('No se pudo eliminar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Medidas corporales</h2>
          <p className="text-sm text-stone-600">
            {coachView
              ? 'Historial de perímetros y peso del entrenado.'
              : 'Registra tu progreso; tu entrenador verá la evolución en seguimiento.'}
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn-secondary text-sm" onClick={onBack}>
            Volver
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {!coachView && (
        <button
          type="button"
          className="btn-primary mb-4"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancelar' : '+ Nuevo registro'}
        </button>
      )}

      {showForm && !coachView && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-stone-600">Fecha</span>
            <input
              type="date"
              className="input mt-1 w-full"
              value={form.recorded_at}
              onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
              required
            />
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-bold text-stone-600">{f.label}</span>
              <input
                type="number"
                step="0.1"
                className="input mt-1 w-full"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold text-stone-600">Notas</span>
            <textarea
              className="input mt-1 w-full"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar medidas'}
          </button>
        </form>
      )}

      {chartData.length > 1 && (
        <div className="card p-4 mb-6">
          <h3 className="font-bold text-stone-800 mb-3">Evolución</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="#84cc16" name="Peso kg" dot />
                <Line type="monotone" dataKey="cintura" stroke="#3b82f6" name="Cintura cm" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-stone-500">Cargando…</p>
      ) : history.length === 0 ? (
        <p className="text-stone-500 border border-dashed rounded-xl p-8 text-center">
          Aún no hay medidas registradas.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div key={h.id} className="card p-4 border border-stone-200">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="font-bold text-stone-900">{h.recorded_at}</span>
                {!coachView && (
                  <button
                    type="button"
                    className="text-xs text-red-600 font-semibold"
                    onClick={() => handleDelete(h.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {FIELDS.map((f) => (
                  h[f.key] != null && (
                    <div key={f.key}>
                      <span className="text-stone-500 text-xs">{f.label}</span>
                      <p className="font-semibold">{h[f.key]}</p>
                    </div>
                  )
                ))}
              </div>
              {h.notes && <p className="text-sm text-stone-600 mt-2">{h.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
