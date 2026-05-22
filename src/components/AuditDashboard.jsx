import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

export default function AuditDashboard() {
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTrace, setFilterTrace] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/admin/audit-logs', {
        params: {
          level: filterLevel || undefined,
          traceId: filterTrace || undefined,
          limit: pageSize,
          page,
        },
      });
      setLogs(resp.data.data || []);
      setPagination(resp.data.pagination || { page, totalPages: 1, total: (resp.data.data || []).length });
    } catch (err) {
      console.error('Error fetching logs', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterTrace, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'ERROR': return 'audit-level audit-level-error';
      case 'WARN': return 'audit-level audit-level-warn';
      case 'INFO': return 'audit-level audit-level-info';
      default: return 'audit-level';
    }
  };

  return (
    <div className="dashboard-main-view admin-appearance">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className="d28d-page-title">{t('audit.title', 'Dashboard de Auditoría')}</h2>
          <p className="d28d-text-muted" style={{ margin: 0 }}>{t('audit.subtitle', '')}</p>
        </div>
        <button type="button" className="btn-primary" onClick={fetchLogs}>
          {t('audit.refresh', 'Actualizar')}
        </button>
      </header>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="p-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', borderBottom: '1px solid var(--d28d-border)' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="d28d-label">{t('audit.filter_level', 'Filtrar por Nivel')}</label>
            <select className="input w-full mt-1" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">{t('audit.all_levels', 'Todos los niveles')}</option>
              <option value="INFO">{t('audit.level_info', 'Información')}</option>
              <option value="WARN">{t('audit.level_warn', 'Advertencias')}</option>
              <option value="ERROR">{t('audit.level_error', 'Errores Críticos')}</option>
            </select>
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label className="d28d-label">{t('audit.trace_id', 'Buscar por Trace ID')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input
                type="text"
                className="input flex-1"
                value={filterTrace}
                onChange={(e) => setFilterTrace(e.target.value)}
                placeholder={t('audit.trace_ph', 'Ej: ORD-12345...')}
              />
              <button type="button" className="btn-secondary" onClick={handleSearch}>
                {t('audit.search', 'Buscar')}
              </button>
            </div>
          </div>
          <div style={{ minWidth: 120 }}>
            <label className="d28d-label">{t('audit.per_page', 'Por página')}</label>
            <select
              className="input w-full mt-1"
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="d28d-text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_datetime', 'Fecha / Hora')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_level', 'Nivel')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_event', 'Evento')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_trace', 'Trace ID')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_user', 'Usuario')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('audit.col_message', 'Mensaje')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="d28d-text-muted">
                    {t('audit.loading', 'Cargando registros...')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }} className="d28d-text-muted">
                    {t('audit.empty', 'No se encontraron registros de auditoría.')}
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} style={{ borderTop: '1px solid var(--d28d-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }} className="d28d-text-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={getLevelClass(log.level)}>{log.level}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{log.event}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.65rem' }} className="d28d-text-muted">
                    {log.trace_id || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                    {log.user_id ? `ID: ${log.user_id}` : t('audit.user_public', 'Público')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', maxWidth: 280 }} className="d28d-text-muted" title={log.message}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--d28d-border)' }}>
          <p className="d28d-text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {pagination.total > 0
              ? t('audit.pagination', 'Mostrando página {page} de {totalPages} · Total: {total} registros', {
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
              })
              : t('audit.no_records', 'Sin registros')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('audit.prev', '← Anterior')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              {t('audit.next', 'Siguiente →')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
