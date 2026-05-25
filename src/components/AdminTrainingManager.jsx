import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminTrainingManager({ onBack = null }) {
    const [activeTab, setActiveTab] = useState('plans'); // plans, editor, log
    const [plans, setPlans] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Editor states
    const [editingPlan, setEditingPlan] = useState(null);
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        if (activeTab === 'plans') fetchPlans();
        if (activeTab === 'log') fetchLogs();
    }, [activeTab]);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/training/admin/plans');
            if (resp.data.success) {
                setPlans(resp.data.data || []);
            }
        } catch {
            setError('Error al cargar planes');
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const resp = await api.get('/training/admin/log');
            if (resp.data.success) {
                setLogs(resp.data.data || []);
            }
        } catch {
            setError('Error al cargar diario');
        } finally {
            setLoading(false);
        }
    };

    const deletePlan = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este plan?')) return;
        try {
            await api.delete(`/training/admin/plans/${id}`);
            fetchPlans();
        } catch {
            alert('Error al eliminar');
        }
    };

    const startEditing = async (planId) => {
        try {
            const resp = await api.get(`/training/admin/plans/${planId}`);
            if (resp.data.success) {
                setEditingPlan(resp.data.data);
                setActiveTab('editor');
            }
        } catch {
            alert('Error cargando el plan para editar');
        }
    };

    const updateDay = async (planId, dayIdx, fieldPath, value) => {
        // fieldPath can be 'warmup_url', 'stretching_url' or 'cardio.bpm', etc.
        const newPlan = { ...editingPlan };
        const day = newPlan.dias[dayIdx];
        let bodyData = {};

        if (fieldPath.startsWith('cardio.')) {
            const cardioField = fieldPath.split('.')[1];
            if (!day.cardio) day.cardio = {};
            day.cardio[cardioField] = value;
            bodyData = { cardio: day.cardio };
        } else {
            day[fieldPath] = value;
            bodyData = { [fieldPath]: value };
        }

        setEditingPlan(newPlan);

        try {
            await api.patch(`/training/admin/plans/${planId}/day/${dayIdx}`, bodyData);
        } catch (err) {
            console.error(err);
            alert('Error guardando cambios del día');
        }
    };

    const updateExercise = async (planId, dayIdx, exIdx, field, value) => {
        // Optimistic update locally
        const newPlan = { ...editingPlan };
        newPlan.dias[dayIdx].ejercicios[exIdx][field] = value;
        setEditingPlan(newPlan);

        try {
            await api.patch(`/training/admin/plans/${planId}/exercise/${dayIdx}/${exIdx}`, {
                [field]: value
            });
        } catch (e) {
            console.error(e);
            alert('Error guardando cambios');
        }
    };

    const reorderExercise = async (planId, dayIdx, exIdx, direction) => {
        const toIdx = exIdx + direction;
        const day = editingPlan.dias[dayIdx];
        if (toIdx < 0 || toIdx >= day.ejercicios.length) return;

        try {
            await api.post(`/training/admin/plans/${planId}/reorder/${dayIdx}`, {
                fromIdx: exIdx,
                toIdx: toIdx
            });
            // reload
            startEditing(planId);
        } catch {
            alert('Error reordenando');
        }
    };

    const addDay = async (planId) => {
        try {
            await api.post(`/training/admin/plans/${planId}/add-day`);
            startEditing(planId);
        } catch { alert('Error añadiendo día'); }
    };

    const deleteDay = async (planId, dayIdx) => {
        if (!confirm('¿Eliminar este día completo?')) return;
        try {
            await api.delete(`/training/admin/plans/${planId}/delete-day/${dayIdx}`);
            startEditing(planId);
        } catch { alert('Error eliminando día'); }
    };

    const addExercise = async (planId, dayIdx) => {
        try {
            await api.post(`/training/admin/plans/${planId}/add-exercise/${dayIdx}`);
            startEditing(planId);
        } catch { alert('Error añadiendo ejercicio'); }
    };

    const deleteExercise = async (planId, dayIdx, exIdx) => {
        if (!confirm('¿Eliminar este ejercicio?')) return;
        try {
            await api.delete(`/training/admin/plans/${planId}/delete-exercise/${dayIdx}/${exIdx}`);
            startEditing(planId);
        } catch { alert('Error eliminando ejercicio'); }
    };

    return (
        <div className="card max-w-7xl mx-auto min-h-[80vh]">
            {onBack && (
              <button type="button" className="btn-secondary text-sm mb-4" onClick={onBack}>
                ← Volver a Capacitación
              </button>
            )}
            <h2 className="text-3xl font-bold text-stone-900 mb-2">Rutinas</h2>
            <p className="text-stone-600 mb-6 font-medium">Asignación y edición de rutinas + diario de seguimiento por usuario.</p>

            <div className="flex gap-4 border-b border-stone-200 mb-6">
                <button
                    className={`pb-2 px-1 font-semibold ${activeTab === 'plans' ? 'border-b-2 border-lime-500 text-stone-900' : 'text-stone-500'}`}
                    onClick={() => setActiveTab('plans')}
                >
                    Planes Activos
                </button>
                <button
                    className={`pb-2 px-1 font-semibold ${activeTab === 'editor' ? 'border-b-2 border-lime-500 text-stone-900' : 'text-stone-500'}`}
                    onClick={() => setActiveTab('editor')}
                >
                    Editor de Rutina
                </button>
                <button
                    className={`pb-2 px-1 font-semibold ${activeTab === 'log' ? 'border-b-2 border-lime-500 text-stone-900' : 'text-stone-500'}`}
                    onClick={() => setActiveTab('log')}
                >
                    Diario Global
                </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">{error}</div>}

            {/* TABS CONTENT */}
            {activeTab === 'plans' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Planes Asignados</h3>
                        <button className="btn-primary" onClick={() => setShowGenerator(!showGenerator)}>
                            {showGenerator ? 'Cerrar' : '+ Asignar nuevo plan'}
                        </button>
                    </div>

                    {showGenerator && (
                        <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl mb-6">
                            <h4 className="font-bold mb-3">Generar Plan Manual</h4>
                            <p className="text-sm text-stone-600 mb-4">Usa CURL con <code>/api/training/admin/plans</code> para pruebas rápidas de este MVP o usa el módulo normal de entrenamiento como usuario para auto-generarlo, luego los verás aquí para editarlos.</p>
                        </div>
                    )}

                    {loading ? <p>Cargando planes...</p> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50">
                                        <th className="p-3 text-sm font-semibold text-stone-700">ID</th>
                                        <th className="p-3 text-sm font-semibold text-stone-700">Usuario</th>
                                        <th className="p-3 text-sm font-semibold text-stone-700">Nivel/Método</th>
                                        <th className="p-3 text-sm font-semibold text-stone-700">Días</th>
                                        <th className="p-3 text-sm font-semibold text-stone-700">Actualizado</th>
                                        <th className="p-3 text-sm font-semibold text-stone-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.map(p => (
                                        <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50">
                                            <td className="p-3 font-mono text-sm">{p.id}</td>
                                            <td className="p-3 font-semibold">{p.user_name} <br /><span className="text-xs text-stone-500 font-normal">ID: {p.user_id}</span></td>
                                            <td className="p-3">{p.level} / {p.method}</td>
                                            <td className="p-3">{p.dias?.length || 0} días</td>
                                            <td className="p-3 text-xs text-stone-500">{new Date(p.updated_at).toLocaleDateString()}</td>
                                            <td className="p-3 flex gap-2">
                                                <button className="text-sm bg-lime-100 text-lime-900 px-3 py-1 rounded-lg font-bold hover:bg-lime-200" onClick={() => startEditing(p.id)}>
                                                    Editar Rutina
                                                </button>
                                                <button className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200" onClick={() => deletePlan(p.id)}>
                                                    Borrar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {plans.length === 0 && (
                                        <tr><td colSpan="6" className="p-4 text-center text-stone-500">No hay planes creados/asignados aún.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'editor' && (
                <div>
                    {!editingPlan ? (
                        <div className="text-center p-8 text-stone-500 border border-dashed rounded-xl">
                            Selecciona &quot;Editar Rutina&quot; desde la pestaña de Planes Activos.
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between bg-stone-100 p-4 rounded-xl mb-6">
                                <div>
                                    <h3 className="font-bold text-lg">Editando Plan #{editingPlan.id}</h3>
                                    <p className="text-sm text-stone-600">Usuario ID: {editingPlan.user_id} | {editingPlan.level} | {editingPlan.method}</p>
                                </div>
                                <button className="btn-secondary text-sm" onClick={() => setActiveTab('plans')}>Volver</button>
                            </div>

                            <div className="space-y-8">
                                {editingPlan.dias.map((d, dIdx) => (
                                    <div key={d.dia} className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-stone-50 border-b border-stone-200 p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-stone-900">{d.nombre} (Día {d.dia})</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold bg-stone-200 text-stone-700 px-2 py-1 rounded-full">{d.ejercicios?.length} ejercicios</span>
                                                    <button onClick={() => deleteDay(editingPlan.id, dIdx)} className="text-xs text-red-600 hover:underline">Eliminar Día</button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-3 bg-white border border-stone-200 rounded-xl">
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-stone-600">Video Calentamiento (Obligatorio)</label>
                                                        <input
                                                            type="text"
                                                            className="input w-full mt-1 text-sm h-8"
                                                            value={d.warmup_url || ''}
                                                            placeholder="Ej: https://youtube.com/watch?v=..."
                                                            onChange={(e) => updateDay(editingPlan.id, dIdx, 'warmup_url', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-stone-600">Video Estiramiento (Obligatorio)</label>
                                                        <input
                                                            type="text"
                                                            className="input w-full mt-1 text-sm h-8"
                                                            value={d.stretching_url || ''}
                                                            placeholder="Ej: https://youtube.com/watch?v=..."
                                                            onChange={(e) => updateDay(editingPlan.id, dIdx, 'stretching_url', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 border-l border-stone-100 pl-4">
                                                    <label className="text-xs font-bold text-stone-600 block mb-1">Configuración de Cardio</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs text-stone-500">Objetivo</label>
                                                            <input type="text" className="input w-full text-sm h-8" value={d.cardio?.goal || 'oxidación'} onChange={(e) => updateDay(editingPlan.id, dIdx, 'cardio.goal', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-stone-500">Pulsaciones (PPM)</label>
                                                            <input type="number" className="input w-full text-sm h-8" value={d.cardio?.bpm || 130} onChange={(e) => updateDay(editingPlan.id, dIdx, 'cardio.bpm', Number(e.target.value))} />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-stone-500">Límite</label>
                                                            <select className="input w-full text-sm h-8 py-0" value={d.cardio?.limit_type || 'time'} onChange={(e) => updateDay(editingPlan.id, dIdx, 'cardio.limit_type', e.target.value)}>
                                                                <option value="time">Tiempo (min)</option>
                                                                <option value="distance">Distancia (km)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-stone-500">Minutos / Km</label>
                                                            <input type="number" className="input w-full text-sm h-8" value={d.cardio?.limit_value || 20} onChange={(e) => updateDay(editingPlan.id, dIdx, 'cardio.limit_value', Number(e.target.value))} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-stone-50 p-2 border-b border-stone-100 flex justify-end">
                                            <button 
                                                onClick={() => addExercise(editingPlan.id, dIdx)}
                                                className="text-xs bg-lime-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-lime-600 transition-all"
                                            >
                                                + Añadir Ejercicio
                                            </button>
                                        </div>
                                        <div className="p-0 overflow-x-auto">
                                            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                                                <thead>
                                                    <tr className="bg-stone-100 text-stone-600 text-xs">
                                                        <th className="p-3 w-10 text-center">Orden</th>
                                                        <th className="p-3">Ejercicio</th>
                                                        <th className="p-3 w-24">Series</th>
                                                        <th className="p-3 w-28">Reps</th>
                                                        <th className="p-3 w-32">Intensidad</th>
                                                        <th className="p-3 w-28">Descanso (s)</th>
                                                        <th className="p-3 w-32">Notas</th>
                                                        <th className="p-3 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {d.ejercicios.map((ex, exIdx) => (
                                                        <tr key={`${dIdx}-${exIdx}`} className="border-b border-stone-100 hover:bg-stone-50">
                                                            <td className="p-2 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <button onClick={() => reorderExercise(editingPlan.id, dIdx, exIdx, -1)} disabled={exIdx === 0} className="text-stone-400 hover:text-stone-900 disabled:opacity-30">▲</button>
                                                                    <button onClick={() => reorderExercise(editingPlan.id, dIdx, exIdx, 1)} disabled={exIdx === d.ejercicios.length - 1} className="text-stone-400 hover:text-stone-900 disabled:opacity-30">▼</button>
                                                                </div>
                                                            </td>
                                                            <td className="p-2 font-semibold">
                                                                <input
                                                                    className="w-full bg-transparent border border-transparent hover:border-stone-200 focus:border-lime-400 px-1 py-1 rounded outline-none w-[200px]"
                                                                    value={ex.exercise_name}
                                                                    onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'exercise_name', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number" min="1" max="10"
                                                                    className="w-16 input bg-white text-center py-1 px-2 h-8"
                                                                    value={ex.sets}
                                                                    onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'sets', Number(e.target.value))}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    className="w-full input bg-white py-1 px-2 h-8"
                                                                    value={ex.reps}
                                                                    onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'reps', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="flex gap-1 items-center">
                                                                    <select
                                                                        className="input bg-white py-1 px-2 h-8 w-20 text-xs"
                                                                        value={ex.intensity_type}
                                                                        onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'intensity_type', e.target.value)}
                                                                    >
                                                                        <option value="RPE">RPE</option>
                                                                        <option value="RIR">RIR</option>
                                                                    </select>
                                                                    <input
                                                                        type="number" min="0" max="10" step="0.5"
                                                                        className="w-12 input bg-white py-1 px-1 h-8 text-center text-xs"
                                                                        value={ex.intensity_value}
                                                                        onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'intensity_value', Number(e.target.value))}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number" step="15"
                                                                    className="w-20 input bg-white text-center py-1 px-2 h-8"
                                                                    value={ex.rest_seconds}
                                                                    onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'rest_seconds', Number(e.target.value))}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    className="w-full input bg-white py-1 px-2 h-8 text-xs"
                                                                    placeholder="Notas..."
                                                                    value={ex.notes || ''}
                                                                    onChange={(e) => updateExercise(editingPlan.id, dIdx, exIdx, 'notes', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <button onClick={() => deleteExercise(editingPlan.id, dIdx, exIdx)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addDay(editingPlan.id)}
                                    className="w-full py-4 border-2 border-dashed border-stone-300 rounded-2xl text-stone-500 font-bold hover:bg-stone-50 hover:border-lime-400 transition-all"
                                >
                                    + Añadir Nuevo Día de Entrenamiento
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'log' && (
                <div>
                    <h3 className="font-bold text-lg mb-4">Sesiones Reportadas (Diario)</h3>
                    {loading ? <p>Cargando diario...</p> : (
                        <div className="space-y-4">
                            {logs.map(log => (
                                <div key={log.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <span className="font-bold text-lg">{log.user_name}</span>
                                            <span className="text-stone-500 text-sm ml-2">({log.fecha})</span>
                                        </div>
                                        {log.completado ? (
                                            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">Completado ({log.duration_minutes} min)</span>
                                        ) : (
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">En Progreso</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded inline-block mb-3">Día de Rutina: {log.dia}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {log.ejercicios?.map((ex, i) => (
                                            <div key={i} className="border border-stone-100 rounded-lg p-3 bg-stone-50 text-sm">
                                                <p className="font-bold mb-1 truncate">{ex.exercise_name}</p>
                                                <p className="text-stone-600">Series completadas: <span className="font-bold">{ex.sets_done}</span></p>
                                                <p className="text-stone-600">Reps: <span className="font-bold">{ex.reps_done}</span></p>
                                                <p className="text-stone-600">Carga: <span className="font-bold">{ex.weight_kg} kg</span></p>
                                                <p className="text-stone-600">Intensidad real: <span className="font-bold">{ex.intensity_actual}</span></p>
                                                {ex.notes && (
                                                    <p className="text-amber-700 mt-1 italic text-xs">
                                                        &quot; {ex.notes} &quot;
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {log.wellness && (
                                        <div className="mt-3 p-3 bg-lime-50 border border-lime-100 rounded-xl flex flex-wrap gap-4 text-xs font-semibold text-lime-900">
                                            <div className="flex items-center gap-1">😴 {log.wellness.sleep_hours}h (Calidad: {log.wellness.sleep_quality}/10)</div>
                                            <div className="flex items-center gap-1">⚡ Energía: {log.wellness.energy_level}/10</div>
                                            <div className="flex items-center gap-1">😰 Estrés: {log.wellness.stress_level}/10</div>
                                            <div className="flex items-center gap-1">🍴 Apetito: {log.wellness.appetite}/10</div>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-stone-100">
                                        <label className="text-xs font-bold text-stone-500 block mb-1">NOTAS DEL ENTRENADOR</label>
                                        <textarea
                                            className="w-full input text-sm mb-2 h-16"
                                            placeholder="Escribe un comentario sobre esta sesión..."
                                            defaultValue={log.trainer_notes}
                                            onBlur={(e) => api.put(`/training/admin/log/${log.id}`, { trainer_notes: e.target.value })}
                                        />
                                        <p className="text-xs text-stone-400">Los cambios se guardan automáticamente al salir del recuadro.</p>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-center p-8 text-stone-500 border border-dashed rounded-xl">
                                    Aún no hay sesiones registradas en el diario por los usuarios.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    <h3 className="font-bold text-2xl text-stone-900 mb-2">Dashboard de Evolución del Atleta</h3>
                    <p className="text-stone-600 text-sm">Visualización de métricas de rendimiento y factores de recuperación agregados.</p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card border !border-stone-200 p-5 bg-stone-50">
                            <span className="text-xs font-bold text-stone-500 uppercase">Total Sesiones</span>
                            <p className="text-3xl font-black text-stone-900">{logs.length}</p>
                        </div>
                        <div className="card border !border-stone-200 p-5 bg-stone-50">
                            <span className="text-xs font-bold text-stone-500 uppercase">Promedio Energía</span>
                            <p className="text-3xl font-black text-lime-600">
                                {(logs.reduce((acc, l) => acc + (l.wellness?.energy_level || 0), 0) / (logs.length || 1)).toFixed(1)}/10
                            </p>
                        </div>
                        <div className="card border !border-stone-200 p-5 bg-stone-50">
                            <span className="text-xs font-bold text-stone-500 uppercase">Calidad Sueño Avg</span>
                            <p className="text-3xl font-black text-blue-600">
                                {(logs.reduce((acc, l) => acc + (l.wellness?.sleep_quality || 0), 0) / (logs.length || 1)).toFixed(1)}/10
                            </p>
                        </div>
                        <div className="card border !border-stone-200 p-5 bg-stone-50">
                            <span className="text-xs font-bold text-stone-500 uppercase">Estrés Promedio</span>
                            <p className="text-3xl font-black text-red-600">
                                {(logs.reduce((acc, l) => acc + (l.wellness?.stress_level || 0), 0) / (logs.length || 1)).toFixed(1)}/10
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="p-2 bg-lime-100 text-lime-700 rounded-lg">📈</span>
                            Tendencia de Cargas por Usuario
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-bold text-stone-400 uppercase border-b border-stone-100">
                                        <th className="pb-3">Usuario</th>
                                        <th className="pb-3">Último Entrenamiento</th>
                                        <th className="pb-3 text-center">Ejercicios Totales</th>
                                        <th className="pb-3 text-center">Horas Sueño Avg</th>
                                        <th className="pb-3">Estado Sugerido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {Array.from(new Set(logs.map(l => l.user_id))).map(uid => {
                                        const userLogs = logs.filter(l => l.user_id === uid);
                                        const lastLog = userLogs[userLogs.length - 1];
                                        const avgSleep = userLogs.reduce((acc, l) => acc + (l.wellness?.sleep_hours || 0), 0) / userLogs.length;
                                        const avgStress = userLogs.reduce((acc, l) => acc + (l.wellness?.stress_level || 0), 0) / userLogs.length;
                                        
                                        return (
                                            <tr key={uid} className="text-sm hover:bg-stone-50">
                                                <td className="py-4 font-bold text-stone-800">{lastLog.user_name}</td>
                                                <td className="py-4 text-stone-600">{lastLog.fecha}</td>
                                                <td className="py-4 text-center font-semibold">{userLogs.reduce((acc, l) => acc + (l.ejercicios?.length || 0), 0)}</td>
                                                <td className="py-4 text-center font-bold text-blue-500">{avgSleep.toFixed(1)}h</td>
                                                <td className="py-4">
                                                    {avgStress > 7 ? (
                                                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">SOBRECARGADO</span>
                                                    ) : avgSleep < 6 ? (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">DÉFICIT RECUPERACIÓN</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">OPTIMO PARA CARGA</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
