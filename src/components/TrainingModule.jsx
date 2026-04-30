import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

// Feature flag: el seguimiento biomecánico en tiempo real queda suspendido por ahora.
const ENABLE_REALTIME_COACH = false;

function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch {
    return '';
  }
  return '';
}

export default function TrainingModule() {
  const [level, setLevel] = useState('principiante');
  const [method, setMethod] = useState('hipertrofia');
  const [daysAvailable, setDaysAvailable] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);

  const [assistantExercise, setAssistantExercise] = useState(null);
  const [assistantReason, setAssistantReason] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResult, setAssistantResult] = useState(null);

  // === WORKOUT LOGGING STATE ===
  const [workoutLog, setWorkoutLog] = useState({ cardioBpm: '', cardioLimit: '', exercises: {} });
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const resp = await api.get('/training/my-current-plan');
        if (resp.data?.success && resp.data?.plan?.dias?.length) {
          setPlan(resp.data.plan);
        }
      } catch {
        // silent
      }
    };
    fetchCurrentPlan();
  }, []);

  const generateDailyPlan = async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await api.post('/training/generate-daily-plan', {
        level,
        method,
        days_available: Number(daysAvailable),
      });
      if (resp.data?.success) {
        setPlan(resp.data.data);
        setSelectedDayIndex(0);
        setSelectedExerciseIndex(0);
      } else {
        setError('Error al generar el plan.');
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo contactar con la IA para generar el plan.');
    } finally {
      setLoading(false);
    }
  };

  const day = useMemo(() => {
    const days = plan?.dias || [];
    return days[selectedDayIndex] || null;
  }, [plan, selectedDayIndex]);

  const currentExercise = useMemo(() => {
    const list = day?.ejercicios || [];
    return list[selectedExerciseIndex] || null;
  }, [day, selectedExerciseIndex]);

  const currentVideoEmbed = useMemo(() => toEmbedUrl(currentExercise?.youtube_url), [currentExercise]);

  const askAssistant = (exerciseName) => {
    setAssistantExercise(exerciseName);
    setAssistantReason('');
    setAssistantResult(null);
  };

  const submitSubstitution = async () => {
    if (!assistantExercise) return;
    try {
      setAssistantLoading(true);
      const resp = await api.post('/training/ai-assistant/substitute', {
        exercise: assistantExercise,
        cause: assistantReason,
      });
      if (resp.data?.success) {
        const substitution = resp.data.substitution;
        setAssistantResult(substitution);

        setPlan((prev) => {
          if (!prev?.dias?.length) return prev;
          const next = { ...prev, dias: prev.dias.map((d) => ({ ...d, ejercicios: [...(d.ejercicios || [])] })) };
          const d = next.dias[selectedDayIndex];
          if (!d) return prev;
          const idx = (d.ejercicios || []).findIndex((e) => e.exercise_name === assistantExercise);
          if (idx === -1) return prev;
          const old = d.ejercicios[idx];
          d.ejercicios[idx] = {
            ...old,
            exercise_name: substitution.exercise_name,
            youtube_url: substitution.youtube_url || old.youtube_url || null,
            prescription: {
              ...old.prescription,
              sets: substitution.sets || old.prescription?.sets || 3,
              reps: substitution.reps || old.prescription?.reps || '10-12',
            },
          };
          return next;
        });
      }
    } catch (e) {
      console.error(e);
      setAssistantResult({ error: 'Error al contactar al asistente. Intenta de nuevo.' });
    } finally {
      setAssistantLoading(false);
    }
  };

  const closeModal = () => {
    setAssistantExercise(null);
    setAssistantResult(null);
  };

  const toggleDayDone = (dayIdx) => {
    setPlan((prev) => {
      if (!prev?.dias?.length) return prev;
      const next = {
        ...prev,
        dias: prev.dias.map((d, i) =>
          i === dayIdx ? { ...d, completado: !d.completado } : d
        ),
      };
      return next;
    });
  };

  const updateLogField = (exIndex, field, value) => {
    setWorkoutLog((prev) => ({
      ...prev,
      exercises: {
        ...prev.exercises,
        [exIndex]: {
          ...(prev.exercises[exIndex] || {}),
          [field]: value,
        },
      },
    }));
  };

  const saveLog = async () => {
    if (!plan || !day) return;
    try {
      setSavingLog(true);
      const payload = {
        plan_id: plan.id,
        dia: day.dia,
        completado: day.completado,
        duration_minutes: Number(workoutLog.cardioLimit) || 0,
        ejercicios: (day.ejercicios || []).map((ex, i) => {
          const logData = workoutLog.exercises[i] || {};
          return {
            exercise_name: ex.exercise_name,
            sets_done: logData.sets ? Number(logData.sets) : 0,
            reps_done: logData.reps || '',
            weight_kg: logData.weight ? Number(logData.weight) : 0,
            intensity_actual: logData.intensity || '',
            notes: ''
          };
        }),
      };
      const resp = await api.post('/training/log', payload);
      if (resp.data.success) {
        alert('Entrenamiento guardado correctamente');
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar el entrenamiento');
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="card max-w-7xl mx-auto relative min-h-[80vh]">
      <h2 className="text-3xl font-bold text-stone-900 mb-2">Mi Dashboard de Entrenamiento</h2>
      <p className="text-stone-600 mb-6 font-medium">
        Plan por días + sustitución inteligente + coach virtual en pantalla dividida (video y cámara).
      </p>

      <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl mb-8">
        <h3 className="text-lg font-bold text-stone-900 mb-4">Configuración</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="label">Nivel</label>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>
          <div>
            <label className="label">Método</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="fuerza">Fuerza</option>
              <option value="resistencia">Resistencia</option>
            </select>
          </div>
          <div>
            <label className="label">Días / semana</label>
            <select className="input" value={daysAvailable} onChange={(e) => setDaysAvailable(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={generateDailyPlan} disabled={loading}>
              {loading ? 'Generando...' : 'Generar Plan'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 font-semibold">{error}</div>}

      {plan?.dias?.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {plan.dias.map((d, idx) => (
              <button
                key={`day-${d.dia}`}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setSelectedExerciseIndex(0);
                }}
                className={`px-4 py-2 rounded-full border text-sm font-semibold ${selectedDayIndex === idx
                  ? 'bg-lime-500 text-black border-lime-500'
                  : 'bg-white text-stone-700 border-stone-200'
                  }`}
              >
                Día {d.dia}: {d.nombre}
              </button>
            ))}
          </div>

          <div className="mb-8 border border-stone-200 bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xl font-bold text-stone-900">
                {day?.nombre || 'Día'}
              </h4>
              <div className="flex gap-4">
                <button
                  onClick={saveLog}
                  disabled={savingLog}
                  className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-stone-800 transition-colors"
                >
                  {savingLog ? 'Guardando...' : '💾 Guardar Diario Oficial'}
                </button>
                <label className="flex items-center gap-2 text-sm text-stone-700 font-semibold cursor-pointer p-2 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-stone-300 text-lime-500 focus:ring-lime-500"
                    checked={Boolean(day?.completado)}
                    onChange={() => toggleDayDone(selectedDayIndex)}
                  />
                  Marcar como completado
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 relative">
              <div className="card border !border-lime-500 !bg-lime-50/20 p-4">
                <h5 className="font-bold text-stone-900 text-sm mb-2 flex items-center gap-2">🔥 Calentamiento</h5>
                <p className="text-xs text-stone-600 mb-3">Rutina obligatoria antes de iniciar los ejercicios con carga para prevenir lesiones articulares.</p>
                {day?.warmup_url ? (
                  <a href={day.warmup_url} target="_blank" rel="noreferrer" className="block text-center text-sm font-semibold rounded-xl bg-black text-white py-2 hover:bg-stone-800 transition-all">Ver Video</a>
                ) : (
                  <p className="text-xs text-red-500">Video no asignado</p>
                )}
              </div>
              <div className="card border !border-stone-300 !bg-stone-50 p-4">
                <h5 className="font-bold text-stone-900 text-sm mb-2 flex items-center gap-2">❤️ Cardio ({day?.cardio?.goal || 'oxidación'})</h5>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="bg-white p-2 rounded-lg border border-stone-200 group">
                    <span className="block text-stone-400 mb-1">Pulsaciones (PPM)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="w-full text-base font-bold text-red-500 bg-transparent outline-none ring-1 ring-transparent focus:ring-stone-200 rounded px-1 transition-all"
                        placeholder={day?.cardio?.bpm || 130}
                        value={workoutLog.cardioBpm}
                        onChange={e => setWorkoutLog(p => ({ ...p, cardioBpm: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-stone-200">
                    <span className="block text-stone-400 mb-1">
                      {day?.cardio?.limit_type === 'distance' ? 'Distancia (km)' : 'Tiempo (min)'}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="w-full text-base font-bold text-stone-800 bg-transparent outline-none ring-1 ring-transparent focus:ring-stone-200 rounded px-1 transition-all"
                        placeholder={day?.cardio?.limit_value || 20}
                        value={workoutLog.cardioLimit}
                        onChange={e => setWorkoutLog(p => ({ ...p, cardioLimit: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card border !border-sky-300 !bg-sky-50/30 p-4">
                <h5 className="font-bold text-stone-900 text-sm mb-2 flex items-center gap-2">🧘 Estiramiento</h5>
                <p className="text-xs text-stone-600 mb-3">Estiramientos obligatorios post-entrenamiento e hipertrofia para elongación muscular.</p>
                {day?.stretching_url ? (
                  <a href={day.stretching_url} target="_blank" rel="noreferrer" className="block text-center text-sm font-semibold rounded-xl bg-black text-white py-2 hover:bg-stone-800 transition-all">Ver Video</a>
                ) : (
                  <p className="text-xs text-red-500">Video no asignado</p>
                )}
              </div>
            </div>

            <h4 className="text-lg font-bold text-stone-900 mb-3 mt-4">Lista de Ejercicios</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(day?.ejercicios || []).map((ex, i) => (
                <div
                  key={`${ex.exercise_name}-${i}`}
                  className={`rounded-xl border p-4 ${selectedExerciseIndex === i ? 'border-lime-400 bg-lime-50/40' : 'border-stone-200 bg-stone-50'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-stone-900 text-sm">{ex.exercise_name}</p>
                    <button
                      className="text-xs px-2 py-1 rounded bg-stone-200 text-stone-800"
                      onClick={() => setSelectedExerciseIndex(i)}
                    >
                      Ver coach
                    </button>
                  </div>
                  <p className="text-xs text-stone-600 mt-2">
                    {ex.prescription?.sets || 3} series x {ex.prescription?.reps || 10} reps | RPE {ex.prescription?.target_rpe || 8}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {ex.youtube_url ? (
                      <a href={ex.youtube_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold">
                        Ver video
                      </a>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded bg-stone-200 text-stone-600">Sin video</span>
                    )}
                    <button
                      onClick={() => askAssistant(ex.exercise_name)}
                      className="text-xs px-3 py-1 rounded bg-stone-200 text-stone-800 font-semibold"
                    >
                      Sustituir
                    </button>
                  </div>
                  <div className="mt-4 p-3 bg-white border border-stone-200 rounded-lg shadow-sm">
                    <p className="text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide">Registro de Ejecución</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wide">Series hechas</label>
                        <input
                          type="number"
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm outline-none focus:border-lime-400"
                          placeholder={`Ej: ${ex.prescription?.sets || ex.sets || 3}`}
                          value={workoutLog.exercises[i]?.sets || ''}
                          onChange={(e) => updateLogField(i, 'sets', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wide">Reps logradas</label>
                        <input
                          type="text"
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm outline-none focus:border-lime-400"
                          placeholder={`Ej: ${ex.prescription?.reps || ex.reps || 10}`}
                          value={workoutLog.exercises[i]?.reps || ''}
                          onChange={(e) => updateLogField(i, 'reps', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wide">Carga (kg)</label>
                        <input
                          type="number" step="0.5"
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm outline-none focus:border-lime-400"
                          placeholder="Ej: 50"
                          value={workoutLog.exercises[i]?.weight || ''}
                          onChange={(e) => updateLogField(i, 'weight', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wide">{ex.intensity_type || 'RPE'} Sentido</label>
                        <input
                          type="text"
                          className="w-full bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm outline-none focus:border-lime-400"
                          placeholder={`Meta: ${ex.prescription?.target_rpe || ex.intensity_value || 8}`}
                          value={workoutLog.exercises[i]?.intensity || ''}
                          onChange={(e) => updateLogField(i, 'intensity', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card">
              <h4 className="text-lg font-bold text-stone-900 mb-3">Coach Virtual - Video Referencia</h4>
              <p className="text-sm text-stone-600 mb-4">
                Ejercicio activo: <strong>{currentExercise?.exercise_name || 'Sin ejercicio'}</strong>
              </p>
              {currentVideoEmbed ? (
                <div className="relative w-full overflow-hidden rounded-xl border border-stone-200" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    title="Training video"
                    src={currentVideoEmbed}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-300 p-8 text-stone-600 text-sm">
                  Este ejercicio aún no tiene URL en la galería. Cárgala en admin para habilitar el split-screen completo.
                </div>
              )}
            </div>

            <div className="card">
              <h4 className="text-lg font-bold text-stone-900 mb-3">Coach Virtual - Cámara + MediaPipe</h4>
              <p className="text-sm text-stone-600 mb-4">
                Seguimiento de biomecánica en tiempo real para el día seleccionado.
              </p>
              {ENABLE_REALTIME_COACH ? (
                <div className="text-sm text-stone-600">
                  {/* Se habilitará cuando retomemos el CV en vivo. */}
                  Coach en vivo habilitado.
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-300 p-6 text-stone-600 text-sm">
                  El seguimiento en tiempo real está <strong>suspendido</strong> por ahora.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {assistantExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 font-bold text-xl">x</button>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Asistente de Sustitución</h3>
            <p className="text-stone-600 text-sm mb-4">
              ¿Por qué quieres reemplazar <strong>{assistantExercise}</strong>?
            </p>
            <textarea
              className="input mb-4 h-24"
              placeholder="Ej: dolor de hombro, equipo no disponible, fatiga articular..."
              value={assistantReason}
              onChange={(e) => setAssistantReason(e.target.value)}
            />
            {!assistantResult ? (
              <button className="btn-primary w-full" onClick={submitSubstitution} disabled={assistantLoading}>
                {assistantLoading ? 'Calculando...' : 'Sugerir sustitución'}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2">
                {assistantResult.error ? (
                  <p className="text-red-500">{assistantResult.error}</p>
                ) : (
                  <>
                    <h4 className="font-bold text-green-900 mb-1">Sustitución aplicada</h4>
                    <p className="text-green-800 text-sm mb-2"><strong>Nuevo ejercicio:</strong> {assistantResult.exercise_name}</p>
                    <div className="flex gap-4">
                      <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded font-bold">Series: {assistantResult.sets}</span>
                      <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded font-bold">Reps: {assistantResult.reps}</span>
                    </div>
                    <p className="text-neutral-600 text-xs mt-3 italic">{assistantResult.reason}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
