import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';

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

export default function TrainingExpertProgress({ onBack = null }) {
  const { user } = useAuth();
  const coachMode = isCoachActor(user);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = selectedUserId ? { user_id: selectedUserId } : {};
      const resp = await api.get('/training/admin/log', { params });
      setLogs(resp.data?.data || []);
    } catch {
      setError('No se pudo cargar el diario de entrenamiento.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const users = useMemo(() => {
    const map = new Map();
    for (const l of logs) {
      if (!map.has(l.user_id)) {
        map.set(l.user_id, { user_id: l.user_id, nombre: l.user_name || `Usuario ${l.user_id}` });
      }
    }
    return Array.from(map.values());
  }, [logs]);

  const kpis = useMemo(() => {
    const completed = logs.filter((l) => l.completado).length;
    const totalMin = logs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    return {
      sessions: logs.length,
      completed,
      adherence: logs.length ? Math.round((completed / logs.length) * 100) : 0,
      totalMin,
    };
  }, [logs]);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header page-header">
        <div>
          {onBack && (
            <button type="button" className="btn-secondary mb-2" onClick={onBack}>
              ← Volver
            </button>
          )}
          <h1 className="d28d-page-title">Seguimiento experto</h1>
          <p className="d28d-text-muted subtitle">
            {coachMode
              ? 'Monitorea adherencia, sesiones y notas de tus entrenados.'
              : 'Tu historial de entrenamiento y evolución.'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Sesiones" value={kpis.sessions} />
        <Kpi label="Completadas" value={kpis.completed} />
        <Kpi label="Adherencia" value={`${kpis.adherence}%`} />
        <Kpi label="Minutos" value={kpis.totalMin} />
      </div>

      {coachMode && users.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Filtrar entrenado</label>
          <select className="input max-w-md" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {loading && <p>Cargando…</p>}

      {!loading && logs.length === 0 && (
        <p className="text-stone-500 border border-dashed rounded-xl p-8 text-center">
          Aún no hay registros en el diario. Los entrenados reportan desde Mi entrenamiento.
        </p>
      )}

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="card border border-stone-200 p-4">
            <div className="flex justify-between flex-wrap gap-2">
              <span className="font-bold">{log.user_name}</span>
              <span className="text-sm text-stone-500">{log.fecha}</span>
            </div>
            <p className="text-sm mt-1">
              Día {log.dia} · {log.completado ? 'Completado' : 'En progreso'}
              {log.duration_minutes ? ` · ${log.duration_minutes} min` : ''}
            </p>
            {coachMode && (
              <textarea
                className="input w-full text-sm mt-3 h-14"
                defaultValue={log.trainer_notes || ''}
                placeholder="Notas del entrenador…"
                onBlur={(e) => api.put(`/training/admin/log/${log.id}`, { trainer_notes: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
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
