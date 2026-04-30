import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getClassStatus(item) {
  const now = new Date();
  const start = new Date(item.start_time);
  const end = new Date(item.end_time);
  if (now >= start && now <= end) return 'En curso';
  if (now >= new Date(start.getTime() - 5 * 60000) && now < start) return 'Próxima';
  if (now > end) return 'Completada';
  return 'Programada';
}

export default function LiveClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const resp = await api.get('/live-classes');
        setClasses(resp.data?.data || []);
      } catch (err) {
        setError('No se pudieron cargar las clases en vivo.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const upcoming = useMemo(() => classes.filter((item) => item.active), [classes]);

  return (
    <div className="card max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-stone-900 mb-3">Clases en Vivo</h2>
      <p className="text-stone-600 mb-6">Consulta el calendario de D28D y accede al Zoom cuando las clases estén disponibles.</p>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}
      {loading ? (
        <div className="text-center py-12 text-stone-500">Cargando clases...</div>
      ) : (
        <div className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="p-8 bg-stone-50 rounded-3xl text-center text-stone-600">No hay clases programadas por ahora.</div>
          ) : upcoming.map((item) => {
            const now = new Date();
            const start = new Date(item.start_time);
            const end = new Date(item.end_time);
            const openWindow = now >= new Date(start.getTime() - 5 * 60000) && now <= end;
            const status = getClassStatus(item);
            return (
              <div key={item.id} className="border border-slate-200 rounded-3xl p-6 shadow-sm bg-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-slate-500 font-semibold mb-2">{item.is_global ? 'Global D28D' : item.gym_id ? `Gym ${item.gym_id}` : 'Privado'}</div>
                    <h3 className="text-2xl font-semibold text-stone-900">{item.title}</h3>
                    <p className="text-sm text-stone-600 mt-2">{item.description || 'Clase en vivo de entrenamiento guiado.'}</p>
                  </div>
                  <div className="flex flex-row gap-2 items-center flex-wrap">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>
                    <span className="text-sm text-stone-500">{formatDateTime(item.start_time)} → {formatDateTime(item.end_time)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-stone-600">
                    Enlace Zoom: <span className="font-medium text-stone-900 break-all">{item.zoom_link}</span>
                  </div>
                  <a
                    href={openWindow ? item.zoom_link : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`btn-primary ${!openWindow ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {openWindow ? 'Unirse ahora' : 'Disponible 5 min antes'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
