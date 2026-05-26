import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import TrainingBodyMeasurements from './training/TrainingBodyMeasurements';

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
  const { user } = useAuth();

  const [level, setLevel] = useState('principiante');
  const [method, setMethod] = useState('hipertrofia');
  const [daysAvailable, setDaysAvailable] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);

  // Entrenador asignado (si el usuario tiene trainer_id).
  const [trainer, setTrainer] = useState(null);
  const [showTrainer, setShowTrainer] = useState(false);

  const [assistantExercise, setAssistantExercise] = useState(null);
  const [assistantReason, setAssistantReason] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResult, setAssistantResult] = useState(null);
  const [substituteAlternatives, setSubstituteAlternatives] = useState([]);

  const CAUSE_PRESETS = [
    'Dolor de hombro',
    'Dolor de rodilla',
    'Equipo no disponible',
    'Fatiga articular',
    'Poco tiempo',
  ];

  // === WORKOUT LOGGING STATE ===
  const [workoutLog, setWorkoutLog] = useState({ 
    cardioBpm: '', 
    cardioLimit: '', 
    exercises: {},
    wellness: {
      sleep_hours: 8,
      sleep_quality: 5,
      stress_level: 5,
      appetite: 5,
      energy_level: 5
    }
  });
  const [savingLog, setSavingLog] = useState(false);

  const [galleryByName, setGalleryByName] = useState({});
  const [subView, setSubView] = useState('workout');

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/training/gallery');
        const map = {};
        for (const item of res.data?.data || []) {
          const key = String(item.name || '').trim().toLowerCase();
          if (key) map[key] = item;
        }
        if (active) setGalleryByName(map);
      } catch {
        if (active) setGalleryByName({});
      }
    })();
    return () => { active = false; };
  }, []);

  // Carga del entrenador asignado para el botón "Ver entrenador".
  useEffect(() => {
    const trainerId = user?.trainer_id;
    if (!trainerId) { setTrainer(null); return; }
    let active = true;
    (async () => {
      try {
        const r = await api.get(`/trainers/${trainerId}`);
        if (active) setTrainer(r.data?.data || r.data || null);
      } catch {
        if (active) setTrainer(null);
      }
    })();
    return () => { active = false; };
  }, [user?.trainer_id]);

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
      setError('No pudimos generar el plan en este momento. Intenta nuevamente o avisa a tu coach.');
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

  const currentVideoUrl = useMemo(() => {
    if (!currentExercise) return '';
    if (currentExercise.youtube_url) return currentExercise.youtube_url;
    const key = String(currentExercise.exercise_name || '').trim().toLowerCase();
    return galleryByName[key]?.youtube_url || '';
  }, [currentExercise, galleryByName]);

  const currentVideoEmbed = useMemo(() => toEmbedUrl(currentVideoUrl), [currentVideoUrl]);

  const askAssistant = (exerciseName) => {
    setAssistantExercise(exerciseName);
    setAssistantReason('');
    setAssistantResult(null);
    setSubstituteAlternatives([]);
  };

  const applySubstitution = (substitution) => {
    if (!substitution?.exercise_name || !assistantExercise) return;
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
        muscle_group: substitution.muscle_group || old.muscle_group,
        intensity_type: substitution.intensity_type || 'RPE/RIR',
        intensity_value: substitution.intensity_value ?? old.intensity_value ?? 7,
        prescription: {
          ...old.prescription,
          sets: substitution.sets || old.prescription?.sets || old.sets || 3,
          reps: substitution.reps || old.prescription?.reps || old.reps || '10-12',
          target_rpe: substitution.intensity_value ?? old.prescription?.target_rpe ?? 7,
        },
      };
      return next;
    });
    setAssistantResult(substitution);
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
        setSubstituteAlternatives(resp.data.alternatives || []);
        applySubstitution(substitution);
      }
    } catch (e) {
      console.error(e);
      setAssistantResult({ error: e.response?.data?.error || 'No hay alternativa en la galería de tu entrenador.' });
      setSubstituteAlternatives([]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const closeModal = () => {
    setAssistantExercise(null);
    setAssistantResult(null);
    setSubstituteAlternatives([]);
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

  const updateWellnessField = (field, value) => {
    setWorkoutLog((prev) => ({
      ...prev,
      wellness: {
        ...prev.wellness,
        [field]: value,
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
        wellness: workoutLog.wellness
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

  if (subView === 'measurements') {
    return (
      <div className="card max-w-7xl mx-auto">
        <TrainingBodyMeasurements onBack={() => setSubView('workout')} />
      </div>
    );
  }

  return (
    <div className="card max-w-7xl mx-auto relative min-h-[80vh]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 mb-2">Mi Dashboard de Entrenamiento</h2>
          <p className="text-stone-600 font-medium">
            Tu plan por días con sustitución guiada por tu coach y video de ejecución por ejercicio.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => setSubView('measurements')}
        >
          Medidas corporales
        </button>
      </div>

      {!plan?.dias?.length && (
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
              {loading ? 'Generando…' : 'Plan generador'}
            </button>
          </div>
        </div>
      </div>
      )}

      {plan?.dias?.length > 0 && (
        <p className="text-sm text-lime-800 bg-lime-50 border border-lime-200 rounded-xl px-4 py-3 mb-6">
          Plan asignado por tu entrenador. Registra series, repeticiones y pesos; los videos salen de su galería.
        </p>
      )}

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
                  className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-stone-800 transition-colors inline-flex items-center gap-2"
                >
                  <span aria-hidden="true">📒</span>
                  {savingLog ? 'Guardando…' : 'Guardar Diario Oficial'}
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

            {/* FACTORES DE BIENESTAR (WELLNESS) */}
            <div className="bg-stone-900 text-white p-5 rounded-2xl mb-6 shadow-xl">
              <h5 className="font-bold text-lime-400 text-sm mb-4 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                ¿Cómo te sentiste hoy?
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Sueño (Horas)</label>
                  <input 
                    type="number" 
                    className="w-full bg-stone-800 border-none rounded-lg py-1 px-2 text-sm focus:ring-1 focus:ring-lime-500"
                    value={workoutLog.wellness.sleep_hours}
                    onChange={(e) => updateWellnessField('sleep_hours', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Calidad Sueño (1-10)</label>
                  <input 
                    type="range" min="1" max="10"
                    className="w-full accent-lime-500"
                    value={workoutLog.wellness.sleep_quality}
                    onChange={(e) => updateWellnessField('sleep_quality', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Estrés (1-10)</label>
                  <input 
                    type="range" min="1" max="10"
                    className="w-full accent-red-500"
                    value={workoutLog.wellness.stress_level}
                    onChange={(e) => updateWellnessField('stress_level', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Apetito (1-10)</label>
                  <input 
                    type="range" min="1" max="10"
                    className="w-full accent-blue-500"
                    value={workoutLog.wellness.appetite}
                    onChange={(e) => updateWellnessField('appetite', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Energía (1-10)</label>
                  <input 
                    type="range" min="1" max="10"
                    className="w-full accent-yellow-500"
                    value={workoutLog.wellness.energy_level}
                    onChange={(e) => updateWellnessField('energy_level', Number(e.target.value))}
                  />
                </div>
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
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="font-bold text-stone-900 text-sm uppercase tracking-tight cursor-pointer"
                      onClick={() => setSelectedExerciseIndex(i)}
                      title="Marcar como ejercicio activo"
                    >
                      {ex.exercise_name}
                    </p>
                    {trainer && (
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 whitespace-nowrap"
                        onClick={() => setShowTrainer(true)}
                        title="Ver datos del entrenador asignado"
                      >
                        Ver entrenador
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-2">
                    {ex.prescription?.sets || 3} series x {ex.prescription?.reps || 10} repeticiones | RPE/RIR {ex.prescription?.target_rpe || 8}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ex.youtube_url ? (
                      <a
                        href={ex.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1 rounded-lg bg-stone-200 text-stone-800 font-semibold hover:bg-stone-300"
                      >
                        Video de ejecución
                      </a>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-lg bg-stone-100 text-stone-500">Sin video</span>
                    )}
                    <button
                      onClick={() => askAssistant(ex.exercise_name)}
                      className="text-xs px-3 py-1 rounded-lg bg-lime-100 text-lime-900 font-semibold hover:bg-lime-200"
                    >
                      Sustituir (IA gratis)
                    </button>
                  </div>
                  <div className="mt-4 p-3 bg-white border border-stone-200 rounded-lg shadow-sm">
                    <p className="text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide">Registro de ejecución</p>
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
                        <label className="block text-[10px] text-stone-400 uppercase tracking-wide">{ex.intensity_type || 'RPE/RIR'} sentido</label>
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
              <h4 className="text-lg font-bold text-stone-900 mb-3">Video del ejercicio</h4>
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
                  Video disponible próximamente. Mientras tanto, sigue las pautas de tu coach.
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {assistantExercise && (
        <div className="form-modal-overlay" onClick={closeModal}>
          <div className="form-modal w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <div className="form-modal-header">
            <h3 className="text-xl font-bold mb-0">Sustituir ejercicio</h3>
            <button type="button" onClick={closeModal} className="form-close-btn" aria-label="Cerrar">×</button>
            </div>
            <div className="form-modal-content">
            <p className="text-xs text-lime-800 bg-lime-50 border border-lime-200 rounded-lg px-3 py-2 mb-3">
              Asistente gratuito: busca alternativas solo en la galería de tu entrenador (sin costo de API).
            </p>
            <p className="text-stone-600 text-sm mb-3">
              ¿Por qué quieres reemplazar <strong>{assistantExercise}</strong>?
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {CAUSE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`text-xs px-2 py-1 rounded-full border ${assistantReason === preset ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300'}`}
                  onClick={() => setAssistantReason(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              className="input mb-4 h-20"
              placeholder="Detalle opcional: dolor, equipo, fatiga…"
              value={assistantReason}
              onChange={(e) => setAssistantReason(e.target.value)}
            />
            {!assistantResult ? (
              <button className="btn-primary w-full" onClick={submitSubstitution} disabled={assistantLoading}>
                {assistantLoading ? 'Buscando en galería…' : 'Buscar sustitución'}
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2 space-y-3">
                {assistantResult.error ? (
                  <p className="text-red-600 text-sm">{assistantResult.error}</p>
                ) : (
                  <>
                    <h4 className="font-bold text-green-900">Sustitución aplicada</h4>
                    <p className="text-green-800 text-sm"><strong>{assistantResult.exercise_name}</strong></p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded font-bold">{assistantResult.sets}×{assistantResult.reps}</span>
                      {assistantResult.intensity_type && (
                        <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded font-bold">
                          {assistantResult.intensity_type} {assistantResult.intensity_value}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-600 text-xs italic">{assistantResult.reason}</p>
                    {substituteAlternatives.length > 1 && (
                      <div>
                        <p className="text-xs font-bold text-stone-700 mb-2">Otras opciones de la galería:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {substituteAlternatives.slice(1).map((alt) => (
                            <button
                              key={alt.exercise_name}
                              type="button"
                              className="w-full text-left text-xs px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50"
                              onClick={() => applySubstitution({ ...assistantResult, ...alt, sets: assistantResult.sets, reps: assistantResult.reps })}
                            >
                              {alt.exercise_name}
                              {alt.muscle_group ? ` · ${alt.muscle_group}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {showTrainer && trainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowTrainer(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 font-bold text-xl"
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold text-stone-900 mb-1">Tu entrenador</h3>
            <p className="text-stone-500 text-xs mb-4">Datos de contacto del coach asignado a tu plan.</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-stone-500 text-xs uppercase tracking-wide block">Nombre</span><strong>{trainer.nombre || '—'}</strong></p>
              {trainer.especialidad && (
                <p><span className="text-stone-500 text-xs uppercase tracking-wide block">Especialidad</span>{trainer.especialidad}</p>
              )}
              {trainer.email && (
                <p>
                  <span className="text-stone-500 text-xs uppercase tracking-wide block">Email</span>
                  <a href={`mailto:${trainer.email}`} className="text-lime-700 hover:underline">{trainer.email}</a>
                </p>
              )}
              {trainer.telefono && (
                <p>
                  <span className="text-stone-500 text-xs uppercase tracking-wide block">Teléfono</span>
                  <a href={`tel:${trainer.telefono}`} className="text-lime-700 hover:underline">{trainer.telefono}</a>
                </p>
              )}
            </div>
            <button
              onClick={() => setShowTrainer(false)}
              className="btn-primary w-full mt-5"
            >Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
