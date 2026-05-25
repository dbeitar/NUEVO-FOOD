import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AthleteDashboard() {
  const [plan, setPlan] = useState<{ level?: string; method?: string; days?: unknown[] } | null>(null);

  useEffect(() => {
    api.get('/training/plan').then((r) => setPlan(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Mi entrenamiento</h1>
      <div className="card">
        <p>Nivel: <strong>{plan?.level || '—'}</strong> · Método: {plan?.method || 'D28D'}</p>
        <p className="muted">Días en plan: {Array.isArray(plan?.days) ? plan!.days!.length : 0}</p>
        <Link className="btn" to="/athlete/workout">Registrar entreno</Link>
      </div>
    </div>
  );
}
