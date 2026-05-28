import { useState, useEffect } from 'react';
import api from '../../services/api';

const lightColor = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-500' };

export default function D28dProgressDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/d28d/progress/me').then((r) => setData(r.data?.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-stone-500">Cargando progreso…</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Mi Progreso D28D</h3>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs uppercase text-stone-500">Semáforo</p>
          <div className={`w-12 h-12 rounded-full mx-auto mt-2 ${lightColor[data.traffic_light] || 'bg-stone-300'}`} />
          <p className="mt-2 font-bold capitalize">{data.traffic_light}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-stone-500">Asistencia</p>
          <p className="text-2xl font-bold">{data.classes_attended}/{data.classes_scheduled}</p>
          <p className="text-sm text-stone-600">{data.attendance_pct}%</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase text-stone-500">Retos</p>
          <p className="text-sm">Inscritos: {data.challenges_joined}</p>
          <p className="text-sm">Completados: {data.challenges_completed}</p>
          <p className="text-sm">Ganados: {data.challenges_won}</p>
        </div>
      </div>
      <div className="card grid md:grid-cols-2 gap-2 text-sm">
        <p>Adherencia compuesta: <strong>{data.adherence_pct}%</strong></p>
        <p>Días activos: <strong>{data.active_days}</strong></p>
        <p>Vigencia: <strong>{data.vigencia_activa ? 'Activa' : '—'}</strong></p>
      </div>
    </div>
  );
}
