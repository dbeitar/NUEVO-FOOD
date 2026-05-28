import { useState, useEffect } from 'react';
import api from '../../services/api';

const colors = { green: 'text-emerald-600', yellow: 'text-amber-600', red: 'text-red-600' };

export default function TrainingProgressPanel() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/training/progress/me').then((r) => setData(r.data?.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-stone-500 text-sm">Cargando cumplimiento training…</p>;

  return (
    <div className="card space-y-2">
      <h4 className="font-bold">Mi cumplimiento Training</h4>
      <p className={`text-lg font-bold capitalize ${colors[data.traffic_light] || ''}`}>
        Semáforo: {data.traffic_light || data.status?.toLowerCase()}
      </p>
      <p className="text-sm">Cumplimiento 7 días: <strong>{data.adherence_pct}%</strong></p>
      <p className="text-sm">Sesiones: {data.executed}/{data.planned}</p>
    </div>
  );
}
