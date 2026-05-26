import { useCallback, useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import TrainingBodyMeasurements from '../components/training/TrainingBodyMeasurements';

function rolesOf(user) {
  return Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol].filter(Boolean);
}

function isCoachActor(user) {
  const roles = rolesOf(user);
  return roles.some((r) => [
    'entrenador', 'nutricionista', 'admin_training', 'admin_entrenador',
    'admin_marca', 'admin_gimnasio', 'super_admin',
  ].includes(r));
}

function SeverityBadge({ severity }) {
  const cls = severity === 'high'
    ? 'bg-red-100 text-red-800 border-red-200'
    : severity === 'medium'
      ? 'bg-amber-100 text-amber-900 border-amber-200'
      : 'bg-stone-100 text-stone-700 border-stone-200';
  const label = severity === 'high' ? 'Alta' : severity === 'medium' ? 'Media' : 'Baja';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function Heatmap({ data }) {
  // data: [{date, intensity, completed, total}]
  if (!Array.isArray(data) || !data.length) return null;
  const color = (i) => (i === 0 ? 'bg-stone-100' : i === 1 ? 'bg-lime-200' : i === 2 ? 'bg-lime-400' : 'bg-lime-600');
  return (
    <div className="grid grid-cols-7 gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          className={`h-5 rounded ${color(d.intensity)} border border-stone-200`}
          title={`${d.date}: ${d.completed}/${d.total} sesiones`}
        />
      ))}
    </div>
  );
}

export default function TrainingExpertProgress({ onBack = null }) {
  const { user } = useAuth();
  const coachMode = isCoachActor(user);
  const [clients, setClients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [insights, setInsights] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [error, setError] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const loadCoachData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientsRes, notifRes] = await Promise.all([
        api.get('/training/coach/clients'),
        api.get('/training/coach/notifications', { params: { unread: 'true' } }),
      ]);
      const list = clientsRes.data?.data || [];
      setClients(list);
      setNotifications(notifRes.data?.data || []);
      setSelectedUserId((prev) => prev || (list[0] ? String(list[0].id) : ''));
    } catch {
      setError('No se pudo cargar el panel de seguimiento.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    if (!selectedUserId) {
      setInsights(null);
      setLogs([]);
      return;
    }
    try {
      const [insRes, logRes] = await Promise.all([
        api.get(`/training/coach/clients/${selectedUserId}/insights`),
        api.get('/training/admin/log', { params: { user_id: selectedUserId } }),
      ]);
      setInsights(insRes.data?.data || null);
      setLogs(logRes.data?.data || []);
    } catch {
      setError('No se pudo cargar la ficha del entrenado.');
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (coachMode) loadCoachData();
    else loadAthleteLogs();
  }, [coachMode, loadCoachData]);

  const loadAthleteLogs = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/training/admin/log');
      setLogs(resp.data?.data || []);
    } catch {
      setError('No se pudo cargar el diario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (coachMode && selectedUserId) loadInsights();
  }, [coachMode, selectedUserId, loadInsights]);

  const kpis = useMemo(() => {
    if (coachMode && insights) {
      const s = insights.summary || {};
      return {
        sessions: s.totalSessions || 0,
        completed: s.completedSessions || 0,
        adherence: s.totalSessions
          ? Math.round((s.completedSessions / s.totalSessions) * 100)
          : 0,
        totalMin: s.totalMinutes || 0,
      };
    }
    const completed = logs.filter((l) => l.completado).length;
    const totalMin = logs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    return {
      sessions: logs.length,
      completed,
      adherence: logs.length ? Math.round((completed / logs.length) * 100) : 0,
      totalMin,
    };
  }, [coachMode, insights, logs]);

  const coachDashboard = useMemo(() => {
    if (!coachMode || !insights) return null;
    const k = insights.coach_kpis || {};
    const w7 = k.window_7d || {};
    const w14 = k.window_14d || {};
    const w30 = k.window_30d || {};
    return {
      adherence7: w7.adherence ?? 0,
      sessions7: w7.sessions ?? 0,
      adherence14: w14.adherence ?? 0,
      adherence30: w30.adherence ?? 0,
      streak: k.streak?.current ?? 0,
      bestStreak: k.streak?.best ?? 0,
      weightDelta4w: k.weight_delta_4w,
      prs: insights.prs || [],
      volumeChart: insights.volume_chart || [],
    };
  }, [coachMode, insights]);

  const markAllNotifsRead = async () => {
    await api.post('/training/coach/notifications/read', {});
    setNotifications([]);
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const list = [...clients];
    const score = (c) => {
      let s = 0;
      if (!c.has_plan) s += 3;
      if ((c.unread_notifications || 0) > 0) s += 2;
      const days = c.last_session?.fecha
        ? Math.floor((Date.now() - new Date(c.last_session.fecha).getTime()) / 86400000)
        : 999;
      if (days >= 7) s += 3;
      if ((c.adherence || 0) < 50) s += 2;
      return s;
    };
    const out = q
      ? list.filter((c) => String(c.nombre || '').toLowerCase().includes(q) || String(c.email || '').toLowerCase().includes(q))
      : list;
    out.sort((a, b) => score(b) - score(a));
    return out;
  }, [clients, clientSearch]);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header page-header">
        <div className="flex flex-wrap justify-between gap-3 w-full">
          <div>
            {onBack && (
              <button type="button" className="btn-secondary mb-2" onClick={onBack}>
                ← Volver
              </button>
            )}
            <h1 className="d28d-page-title">Seguimiento</h1>
            <p className="d28d-text-muted subtitle">
              {coachMode
                ? 'Adherencia, cargas, bienestar y alertas de tus entrenados.'
                : 'Tu historial de entrenamiento.'}
            </p>
          </div>
          {coachMode && notifications.length > 0 && (
            <button type="button" className="btn-secondary text-sm" onClick={markAllNotifsRead}>
              Marcar {notifications.length} alertas leídas
            </button>
          )}
        </div>
      </header>

      {coachMode && notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm">
              <strong>{n.title}</strong> — {n.body}
              <span className="text-amber-700 text-xs ml-2">{new Date(n.created_at).toLocaleString('es')}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Sesiones" value={kpis.sessions} />
        <Kpi label="Completadas" value={kpis.completed} />
        <Kpi label="Adherencia" value={`${kpis.adherence}%`} />
        <Kpi label="Minutos" value={kpis.totalMin} />
      </div>

      {coachMode && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="card p-4 space-y-2 max-h-[70vh] overflow-y-auto">
            <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wide">Asesorados</h3>
            <input
              type="search"
              className="input w-full text-sm"
              placeholder="Buscar por nombre o email…"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            {loading && <p className="text-sm text-stone-500">Cargando…</p>}
            {filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedUserId(String(c.id))}
                className={`w-full text-left rounded-xl border p-3 text-sm transition-colors ${
                  String(selectedUserId) === String(c.id)
                    ? 'border-lime-500 bg-lime-50'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="font-semibold text-stone-900">{c.nombre}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {c.has_plan ? 'Con plan' : 'Sin plan'} · {c.adherence}% adherencia
                </div>
                {c.unread_notifications > 0 && (
                  <span className="inline-block mt-1 text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    {c.unread_notifications} nueva(s)
                  </span>
                )}
              </button>
            ))}
          </aside>

          <section>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            {!insights && !loading && (
              <p className="text-stone-500 p-8 border border-dashed rounded-xl text-center">Selecciona un entrenado.</p>
            )}
            {insights && (
              <>
                {coachDashboard && (
                  <div className="grid md:grid-cols-4 gap-3 mb-4">
                    <Kpi label="Adherencia 7d" value={`${coachDashboard.adherence7}%`} />
                    <Kpi label="Sesiones 7d" value={coachDashboard.sessions7} />
                    <Kpi label="Racha" value={`${coachDashboard.streak}d`} />
                    <Kpi label="Δ peso 4w" value={coachDashboard.weightDelta4w != null ? `${coachDashboard.weightDelta4w}kg` : '—'} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {['resumen', 'medidas', 'progresion', 'bienestar', 'sesiones'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                        tab === t ? 'bg-lime-500 text-black' : 'bg-stone-100 text-stone-700'
                      }`}
                      onClick={() => setTab(t)}
                    >
                      {t === 'resumen' && 'Resumen'}
                      {t === 'medidas' && 'Medidas'}
                      {t === 'progresion' && 'Cargas'}
                      {t === 'bienestar' && 'Bienestar'}
                      {t === 'sesiones' && 'Sesiones'}
                    </button>
                  ))}
                </div>

                {tab === 'resumen' && (
                  <div className="grid lg:grid-cols-3 gap-4">
                    <div className="card p-4">
                      <h4 className="font-bold mb-2">Perfil y alertas</h4>
                      <ul className="text-sm text-stone-700 space-y-1">
                        <li><strong>Email:</strong> {insights.user.email}</li>
                        <li><strong>Objetivo:</strong> {insights.user.objetivo || '—'}</li>
                        <li><strong>Última sesión:</strong> {insights.summary?.lastSession?.fecha || 'Sin registros'}</li>
                        {insights.days_since_last_session != null && (
                          <li className={insights.days_since_last_session > 6 ? 'text-red-700 font-semibold' : insights.days_since_last_session > 3 ? 'text-amber-700 font-semibold' : ''}>
                            {insights.days_since_last_session === 0 ? 'Entrenó hoy' : `Sin entrenar hace ${insights.days_since_last_session} días`}
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="card p-4">
                      <h4 className="font-bold mb-2">Plan activo</h4>
                      {insights.plan ? (
                        <div className="text-sm text-stone-700 space-y-1">
                          <div><strong>Método:</strong> {insights.plan.method}</div>
                          <div><strong>Nivel:</strong> {insights.plan.level}</div>
                          <div><strong>Días:</strong> {insights.plan.dias_count}</div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">Sin plan asignado — usa Asignar planes o el Asistente IA.</p>
                      )}
                    </div>
                    <div className="card p-4">
                      <h4 className="font-bold mb-2">Logros (PRs)</h4>
                      {(insights.prs || []).length === 0 ? (
                        <p className="text-sm text-stone-500">Sin PRs aún (falta registrar cargas/reps).</p>
                      ) : (
                        <ul className="text-xs text-stone-700 space-y-1 max-h-44 overflow-y-auto pr-1">
                          {(insights.prs || []).slice(0, 8).map((p) => (
                            <li key={p.exercise_name}>
                              <strong>{p.exercise_name}</strong>
                              {p.max_weight ? ` · ${p.max_weight}kg` : ''}
                              {p.max_reps ? ` · ${p.max_reps} reps` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {(insights.alerts || []).length > 0 && (
                      <div className="card p-4 lg:col-span-3 border border-amber-200 bg-amber-50/40">
                        <h4 className="font-bold mb-2">Alertas accionables</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          {(insights.alerts || []).slice(0, 6).map((a) => (
                            <div key={a.code} className="bg-white rounded-xl border border-stone-200 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-stone-900 text-sm">{a.title}</div>
                                <SeverityBadge severity={a.severity} />
                              </div>
                              <p className="text-xs text-stone-600 mt-1">{a.message}</p>
                              {a.action && <p className="text-xs text-stone-700 mt-2"><strong>Acción:</strong> {a.action}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(insights.heatmap || []).length > 0 && (
                      <div className="card p-4 lg:col-span-2">
                        <h4 className="font-bold mb-2">Calendario de sesiones (35 días)</h4>
                        <Heatmap data={insights.heatmap} />
                        <p className="text-xs text-stone-500 mt-2">Más oscuro = más cumplimiento ese día.</p>
                      </div>
                    )}
                    {(insights.improvements || []).length > 0 && (
                      <div className="card p-4">
                        <h4 className="font-bold mb-2">Top mejoras (últimas 4 semanas)</h4>
                        <ul className="text-xs text-stone-700 space-y-1 max-h-44 overflow-y-auto pr-1">
                          {(insights.improvements || []).slice(0, 8).map((im) => (
                            <li key={im.exercise_name}>
                              <strong>{im.exercise_name}</strong>
                              {im.delta_kg ? ` · ${im.delta_kg > 0 ? '+' : ''}${im.delta_kg}kg` : ''}
                              {im.delta_reps ? ` · ${im.delta_reps > 0 ? '+' : ''}${im.delta_reps} reps` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(coachDashboard?.volumeChart || []).length > 1 && (
                      <div className="card p-4 lg:col-span-3">
                        <h4 className="font-bold mb-2">Volumen semanal (tendencia)</h4>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={coachDashboard.volumeChart}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="volume" stroke="#84cc16" name="Volumen" dot />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'medidas' && (
                  <div className="space-y-4">
                    {(insights.measurement_chart || []).length > 1 && (
                      <div className="card p-4">
                        <h4 className="font-bold mb-2">Evolución peso / cintura</h4>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={insights.measurement_chart}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="weight_kg" stroke="#84cc16" name="Peso" dot />
                              <Line type="monotone" dataKey="waist_cm" stroke="#3b82f6" name="Cintura" dot />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    <TrainingBodyMeasurements readOnlyUserId={selectedUserId} />
                  </div>
                )}

                {tab === 'progresion' && (
                  <div className="space-y-3">
                    {(insights.progression || []).length === 0 && (
                      <p className="text-stone-500 text-sm">Aún no hay datos de cargas registradas.</p>
                    )}
                    {(insights.progression || []).map((p) => (
                      <div key={p.exercise_name} className="card p-4 border border-stone-200">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold">{p.exercise_name}</span>
                          <span className={`text-sm font-bold ${
                            p.trend === 'up' ? 'text-lime-700' : p.trend === 'down' ? 'text-red-600' : 'text-stone-500'
                          }`}
                          >
                            {p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'}
                            {' '}
                            {p.delta_kg > 0 ? '+' : ''}
                            {p.delta_kg} kg
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {p.first_weight} kg → {p.last_weight} kg ({p.points.length} registros)
                        </p>
                        <div className="flex gap-1 mt-2 h-8 items-end">
                          {p.points.slice(-12).map((pt, i) => (
                            <div
                              key={`${p.exercise_name}-${i}`}
                              className="flex-1 bg-lime-400 rounded-t min-w-[4px]"
                              style={{ height: `${Math.max(8, (pt.weight_kg || 0) * 3)}px` }}
                              title={`${pt.fecha}: ${pt.weight_kg} kg`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'bienestar' && (
                  <div className="card p-4">
                    {insights.wellness ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <WellnessKpi label="Sueño (h)" value={insights.wellness.sleep_hours} />
                        <WellnessKpi label="Calidad sueño" value={insights.wellness.sleep_quality} />
                        <WellnessKpi label="Energía" value={insights.wellness.energy_level} />
                        <WellnessKpi label="Estrés" value={insights.wellness.stress_level} />
                        <WellnessKpi label="Apetito" value={insights.wellness.appetite} />
                        <WellnessKpi label="Molestias" value={insights.wellness.soreness} />
                      </div>
                    ) : (
                      <p className="text-stone-500">Sin encuestas de bienestar aún.</p>
                    )}
                  </div>
                )}

                {tab === 'sesiones' && (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <LogCard key={log.id} log={log} coachMode />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {!coachMode && (
        <div className="space-y-4">
          {loading && <p>Cargando…</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {logs.map((log) => (
            <LogCard key={log.id} log={log} coachMode={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogCard({ log, coachMode }) {
  return (
    <div className="card border border-stone-200 p-4">
      <div className="flex justify-between flex-wrap gap-2">
        <span className="font-bold">{log.user_name || 'Yo'}</span>
        <span className="text-sm text-stone-500">{log.fecha}</span>
      </div>
      <p className="text-sm mt-1">
        Día {log.dia} · {log.completado ? 'Completado' : 'En progreso'}
        {log.duration_minutes ? ` · ${log.duration_minutes} min` : ''}
      </p>
      {(log.ejercicios || []).length > 0 && (
        <ul className="text-xs text-stone-600 mt-2 space-y-0.5">
          {log.ejercicios.map((ex, i) => (
            <li key={i}>
              {ex.exercise_name}: {ex.sets_done}×{ex.reps_done}
              {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
            </li>
          ))}
        </ul>
      )}
      {coachMode && (
        <textarea
          className="input w-full text-sm mt-3 h-14"
          defaultValue={log.trainer_notes || ''}
          placeholder="Notas del entrenador…"
          onBlur={(e) => api.put(`/training/admin/log/${log.id}`, { trainer_notes: e.target.value })}
        />
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="card border border-stone-200 p-4 bg-stone-50">
      <span className="text-xs font-bold text-stone-500 uppercase">{label}</span>
      <p className="text-2xl font-black text-stone-900 mt-1">{value}</p>
    </div>
  );
}

function WellnessKpi({ label, value }) {
  return (
    <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
      <span className="text-xs text-stone-500 block">{label}</span>
      <span className="text-lg font-bold">{value ?? '—'}</span>
    </div>
  );
}
