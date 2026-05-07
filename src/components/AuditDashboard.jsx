import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AuditDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTrace, setFilterTrace] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/admin/audit-logs', {
        params: {
          level: filterLevel || undefined,
          traceId: filterTrace || undefined,
          limit: 100
        }
      });
      setLogs(resp.data.data);
    } catch (err) {
      console.error('Error fetching logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterLevel]);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-500 bg-red-100';
      case 'WARN': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-500 bg-blue-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard de Auditoría</h2>
          <p className="text-gray-500 mt-1">Monitoreo de trazabilidad y eventos críticos en tiempo real.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Filtros */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filtrar por Nivel</label>
            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Todos los niveles</option>
              <option value="INFO">Información</option>
              <option value="WARN">Advertencias</option>
              <option value="ERROR">Errores Críticos</option>
            </select>
          </div>
          <div className="flex-[2] min-w-[300px]">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Buscar por Trace ID</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={filterTrace}
                onChange={(e) => setFilterTrace(e.target.value)}
                placeholder="Ej: ORD-12345..."
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button 
                onClick={fetchLogs}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-all"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Nivel</th>
                <th className="px-6 py-4">Evento</th>
                <th className="px-6 py-4">Trace ID</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      Cargando registros...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">No se encontraron registros de auditoría.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">
                    {log.event}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-400 group-hover:text-indigo-600 transition-colors">
                    {log.trace_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.user_id ? `ID: ${log.user_id}` : 'Public'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.message}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
