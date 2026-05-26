import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function D28dZoomAccountsMaster({ onBack = null }) {
  const [rows, setRows] = useState([]);
  const [apiEnabled, setApiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resp = await api.get('/programs/zoom-master');
        setRows(resp.data?.data || []);
        setApiEnabled(!!resp.data?.zoom_api_enabled);
      } catch {
        setError('No se pudo cargar el maestro de cuentas Zoom.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header page-header">
        <div>
          <h1 className="d28d-page-title">Maestro Zoom D28D</h1>
          <p className="d28d-text-muted subtitle">
            Cuentas por programa (Virtual 1 y 2, Pancitas, Vital). Las contraseñas solo viven en el servidor (.env).
          </p>
        </div>
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            ← Volver
          </button>
        )}
      </header>

      <div className={`card p-4 mb-6 border ${apiEnabled ? 'border-lime-300 bg-lime-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
        <p className="text-sm font-semibold text-stone-800">
          API Zoom Server-to-Server: {apiEnabled ? 'configurada ✓' : 'pendiente'}
        </p>
        {!apiEnabled && (
          <p className="text-xs text-stone-600 mt-2">
            Define <code>ZOOM_S2S_ACCOUNT_ID</code>, <code>ZOOM_S2S_CLIENT_ID</code> y <code>ZOOM_S2S_CLIENT_SECRET</code> en{' '}
            <code>backend/.env</code> para crear reuniones automáticas. Sin API se puede usar enlace PMI de respaldo.
          </p>
        )}
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="space-y-6">
        {rows.map((prog) => (
          <section key={prog.program_id} className="card border border-stone-200 p-5">
            <h3 className="font-bold text-lg text-stone-900">{prog.program_name}</h3>
            <p className="text-xs text-stone-500 mb-3">ID: {prog.program_id}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="p-2 text-left">Cuenta</th>
                    <th className="p-2 text-left">Email Zoom</th>
                    <th className="p-2 text-left">Contraseña en servidor</th>
                  </tr>
                </thead>
                <tbody>
                  {prog.accounts.map((acc) => (
                    <tr key={acc.id} className="border-t border-stone-100">
                      <td className="p-2 font-medium">{acc.label || acc.id}</td>
                      <td className="p-2">{acc.email || '—'}</td>
                      <td className="p-2">
                        {acc.password_configured ? (
                          <span className="text-lime-700 font-semibold">Configurada</span>
                        ) : (
                          <span className="text-amber-700">Falta variable .env</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 text-xs text-stone-500 space-y-1">
        <p><strong>Virtual:</strong> cuenta 1 y 2 · <strong>P:</strong> Pancitas · <strong>V:</strong> Vital</p>
        <p>Al programar una clase, el entrenador D28D asignado recibe notificación con el enlace y queda como co-anfitrión en Zoom (email alternativo).</p>
      </div>
    </div>
  );
}
