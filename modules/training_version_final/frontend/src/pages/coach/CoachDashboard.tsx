import { useEffect, useState } from 'react';
import api from '../../services/api';

type Overview = {
  athletes_total: number;
  workouts_last_7d: number;
  completed_last_7d: number;
};

export default function CoachDashboard() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api.get('/coach/overview').then((r) => setData(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Panel coach</h1>
      <div className="grid-2">
        <div className="card"><div className="stat">{data?.athletes_total ?? '—'}</div><div className="muted">Atletas</div></div>
        <div className="card"><div className="stat">{data?.workouts_last_7d ?? '—'}</div><div className="muted">Entrenos 7d</div></div>
        <div className="card"><div className="stat">{data?.completed_last_7d ?? '—'}</div><div className="muted">Completados</div></div>
      </div>
    </div>
  );
}
