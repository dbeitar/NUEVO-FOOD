import { useMemo, useState } from 'react';
import api from '../services/api';
import TrainingRealtimeCoach from './TrainingRealtimeCoach';

export default function TrainingModule() {
  const [level, setLevel] = useState('principiante');
  const [daysAvailable, setDaysAvailable] = useState(4);
  const [objective, setObjective] = useState('hipertrofia');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const prettyJson = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ''),
    [result]
  );

  const generatePlan = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await api.post('/training/plan-json', {
        level,
        days_available: Number(daysAvailable),
        objective,
      });
      setResult(resp.data);
    } catch (e) {
      console.error(e);
      setError('No se pudo generar el plan. Verifica sesión y backend.');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    if (!prettyJson) return;
    try {
      await navigator.clipboard.writeText(prettyJson);
    } catch (e) {
      console.warn('No se pudo copiar JSON', e);
    }
  };

  return (
    <div className="card max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-stone-900 mb-2">Módulo Entrenamiento IA</h2>
      <p className="text-stone-600 mb-6">
        Genera JSON puro para análisis biomecánico en tiempo real (MediaPipe/TensorFlow.js).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="label">Nivel</label>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div>
          <label className="label">Días por semana</label>
          <input
            className="input"
            type="number"
            min="2"
            max="6"
            value={daysAvailable}
            onChange={(e) => setDaysAvailable(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Objetivo</label>
          <select
            className="input"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            <option value="hipertrofia">Hipertrofia</option>
            <option value="fuerza">Fuerza</option>
            <option value="resistencia">Resistencia</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-primary w-full" onClick={generatePlan} disabled={loading}>
            {loading ? 'Generando...' : 'Generar JSON'}
          </button>
          <button className="btn-card" onClick={copyJson} disabled={!result}>
            Copiar
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <label className="label">Salida JSON</label>
      <textarea
        className="input font-mono text-xs h-[460px] leading-5"
        value={prettyJson}
        readOnly
        placeholder='{"routine_id":"...","exercise_sequence":[...]}'
      />

      {result?.exercise_sequence?.length > 0 && <TrainingRealtimeCoach routine={result} />}
    </div>
  );
}
