import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { useI18n } from '../../context/useI18n';

const TABS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  CLASSES: 'classes',
  NOTES: 'notes',
  LOGS: 'logs',
};

export default function D28dCoachTracking({ onBack = null }) {
  const { t } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
  const [tab, setTab] = useState(TABS.USERS);
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await api.get('/d28d/coach/overview', {
        params: { start_date: startDate, end_date: endDate },
      });
      setOverview(resp.data?.data || null);
    } catch {
      setError(t('d28d.tracking.load_error', 'No se pudo cargar el seguimiento.'));
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, t]);

  const loadTrainingLogs = useCallback(async () => {
    try {
      const params = selectedUserId ? { user_id: selectedUserId } : {};
      const resp = await api.get('/d28d/coach/training-logs', { params });
      setTrainingLogs(resp.data?.data || []);
    } catch {
      setTrainingLogs([]);
    }
  }, [selectedUserId]);

  const loadAttendance = useCallback(async () => {
    try {
      const resp = await api.get('/live-classes/admin/attendance');
      setAttendanceRows(resp.data?.data || []);
    } catch {
      setAttendanceRows([]);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (tab === TABS.LOGS) loadTrainingLogs();
  }, [tab, loadTrainingLogs]);

  useEffect(() => {
    if (tab === TABS.CLASSES) loadAttendance();
  }, [tab, loadAttendance]);

  const kpis = overview?.kpis || {};
  const users = overview?.users || [];
  const sessions = overview?.sessions || [];
  const hostNotes = overview?.host_notes || [];

  const exportUsersCsv = () => {
    const header = 'Usuario,Email,Asistencias,Ultima asistencia,Programa\n';
    const body = users
      .map((u) => `"${u.nombre}","${u.email}",${u.classes_attended},"${u.last_attendance || ''}","${u.program_id || ''}"`)
      .join('\n');
    downloadCsv(header + body, `d28d-seguimiento-usuarios-${endDate}.csv`);
  };

  return (
    <div className="dashboard-main-view food-log-container">
      <header className="dashboard-header page-header">
        <div>
          <h1 className="d28d-page-title">{t('d28d.tracking.title', 'Seguimiento D28D')}</h1>
          <p className="d28d-text-muted subtitle">
            {t('d28d.tracking.subtitle', 'Usuarios de tus clases, asistencia, rutinas y diario de entrenamiento.')}
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            {t('panel.back', '← Volver')}
          </button>
        )}
      </header>

      <div className="range-card mb-4">
        <h2 className="text-lg font-bold mb-2">{t('progress.range_filters', 'Rango y filtros')}</h2>
        <div className="range-grid">
          <div>
            <label className="block text-sm font-semibold mb-1">{t('progress.start', 'Inicio')}</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-2xl border border-slate-300"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">{t('progress.end', 'Fin')}</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-2xl border border-slate-300"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <button type="button" className="btn-primary mt-3" onClick={loadOverview} disabled={loading}>
          {loading ? t('common.loading', 'Cargando…') : t('d28d.tracking.refresh', 'Actualizar')}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label={t('d28d.tracking.kpi_users', 'Usuarios')} value={kpis.total_users ?? 0} />
        <KpiCard label={t('d28d.tracking.kpi_sessions', 'Asistencias')} value={kpis.total_sessions ?? 0} />
        <KpiCard label={t('d28d.tracking.kpi_classes', 'Mis clases')} value={kpis.total_classes ?? 0} />
        <KpiCard
          label={t('d28d.tracking.kpi_avg', 'Promedio / clase')}
          value={kpis.avg_attendees_per_class ?? 0}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-4">
        {[
          [TABS.USERS, t('d28d.tracking.tab_users', 'Mis usuarios')],
          [TABS.SESSIONS, t('d28d.tracking.tab_sessions', 'Historial')],
          [TABS.CLASSES, t('d28d.tracking.tab_classes', 'Por clase')],
          [TABS.NOTES, t('d28d.tracking.tab_notes', 'Notas rutina')],
          [TABS.LOGS, t('d28d.tracking.tab_logs', 'Diario entreno')],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 ${tab === id ? 'border-lime-600 text-stone-900' : 'border-transparent text-stone-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && tab === TABS.USERS && <p>{t('common.loading', 'Cargando…')}</p>}

      {tab === TABS.USERS && !loading && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">{t('d28d.tracking.users_heading', 'Participantes en tus clases')}</h3>
            {users.length > 0 && (
              <button type="button" className="btn-secondary text-sm" onClick={exportUsersCsv}>
                {t('progress.export_csv', 'Exportar CSV')}
              </button>
            )}
          </div>
          {users.length === 0 ? (
            <EmptyState message={t('d28d.tracking.no_users', 'Aún no hay asistencias registradas en el rango.')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-stone-200 rounded-xl overflow-hidden">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="p-2 text-left">Usuario</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-right">Asistencias</th>
                    <th className="p-2 text-left">Última</th>
                    <th className="p-2 text-left">Programa</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-t border-stone-100">
                      <td className="p-2 font-semibold">{u.nombre}</td>
                      <td className="p-2 text-stone-600">{u.email}</td>
                      <td className="p-2 text-right">{u.classes_attended}</td>
                      <td className="p-2 text-stone-600">{formatDate(u.last_attendance)}</td>
                      <td className="p-2 text-stone-600">{u.program_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === TABS.SESSIONS && (
        <section className="space-y-3">
          {sessions.length === 0 ? (
            <EmptyState message={t('d28d.tracking.no_sessions', 'Sin sesiones en el rango.')} />
          ) : (
            sessions.map((s, idx) => {
              const u = users.find((x) => x.user_id === s.user_id);
              return (
                <div key={`${s.class_id}-${s.user_id}-${idx}`} className="card p-4 border border-stone-200">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">{u?.nombre || `Usuario ${s.user_id}`}</span>
                    <span className="text-sm text-stone-500">{formatDate(s.joined_at)}</span>
                  </div>
                  <p className="text-sm text-stone-700 mt-1">{s.class_title}</p>
                </div>
              );
            })
          )}
        </section>
      )}

      {tab === TABS.CLASSES && (
        <section className="space-y-4">
          {attendanceRows.length === 0 ? (
            <EmptyState message={t('d28d.tracking.no_classes', 'Sin clases asignadas o sin reporte.')} />
          ) : (
            attendanceRows.map((row) => (
              <div key={row.class_id} className="card p-4 border border-stone-200">
                <div className="flex justify-between flex-wrap gap-2">
                  <h4 className="font-bold">{row.title}</h4>
                  <span className="text-sm text-stone-600">{formatDate(row.start_time)}</span>
                </div>
                <p className="text-sm mt-1">
                  {t('d28d.tracking.attendees', 'Asistentes')}: <strong>{row.total_attendees}</strong>
                </p>
                {row.by_gym?.map((g) => (
                  <div key={g.gym_name} className="mt-2 text-sm">
                    <span className="font-semibold">{g.gym_name}</span> ({g.count})
                    <ul className="list-disc ml-5 text-stone-600">
                      {g.attendees?.map((a) => (
                        <li key={a.user_id}>{a.nombre} — {a.email}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))
          )}
        </section>
      )}

      {tab === TABS.NOTES && (
        <section className="space-y-3">
          {hostNotes.length === 0 ? (
            <EmptyState message={t('d28d.tracking.no_notes', 'Sin observaciones de rutina en el periodo.')} />
          ) : (
            hostNotes.map((n) => (
              <div key={n.id} className="card p-4 border border-lime-200 bg-lime-50/40">
                <p className="text-xs text-stone-500 mb-1">
                  {formatDate(n.created_at)} · {t('d28d.tracking.class_id', 'Clase')} #{n.live_class_id || '—'}
                </p>
                <p className="text-sm text-stone-800 whitespace-pre-wrap">{n.texto}</p>
              </div>
            ))
          )}
        </section>
      )}

      {tab === TABS.LOGS && (
        <section>
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-semibold mb-1">{t('d28d.tracking.filter_user', 'Usuario')}</label>
              <select
                className="input max-w-xs"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">{t('progress.all', 'Todos')}</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {trainingLogs.length === 0 ? (
            <EmptyState message={t('d28d.tracking.no_logs', 'Sin sesiones en el diario de entrenamiento de tus participantes.')} />
          ) : (
            <div className="space-y-4">
              {trainingLogs.map((log) => (
                <div key={log.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{log.user_name}</span>
                    <span className="text-stone-500 text-sm">{log.fecha}</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-700 mb-2">
                    {t('d28d.tracking.routine_day', 'Día de rutina')}: {log.dia}
                    {log.completado ? ' · ✓' : ''}
                  </p>
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <label className="text-xs font-bold text-stone-500 block mb-1">
                      {t('d28d.tracking.coach_notes', 'Notas del entrenador')}
                    </label>
                    <textarea
                      className="w-full input text-sm h-16"
                      defaultValue={log.trainer_notes || ''}
                      placeholder={t('d28d.tracking.coach_notes_ph', 'Comentario sobre esta sesión…')}
                      onBlur={(e) => api.put(`/d28d/coach/training-logs/${log.id}`, { trainer_notes: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="card border border-stone-200 p-4 bg-stone-50">
      <span className="text-xs font-bold text-stone-500 uppercase">{label}</span>
      <p className="text-2xl font-black text-stone-900 mt-1">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-center p-8 text-stone-500 border border-dashed rounded-xl">
      {message}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso).slice(0, 16);
  }
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
