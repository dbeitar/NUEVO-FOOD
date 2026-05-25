import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CoachVigencias() {
  const [data, setData] = useState<{ pending: unknown[]; expiring: unknown[]; notifications: unknown[] }>({
    pending: [],
    expiring: [],
    notifications: [],
  });

  const load = () => {
    api.get('/subscriptions/overview').then((r) => setData(r.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const confirm = async (id: string) => {
    await api.post(`/subscriptions/confirm/${id}`, { days: 30 });
    load();
  };

  const extend = async (userId: string) => {
    const days = Number(window.prompt('Días a extender', '30'));
    if (!days) return;
    await api.post(`/subscriptions/extend/${userId}`, { days });
    load();
  };

  return (
    <div>
      <h1>Pagos y vigencias (Training)</h1>
      <p className="muted">Confirma pagos en sede o Wompi y extiende licencias de tus atletas.</p>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Pendientes</h3>
        {(data.pending as { id: string; user?: { firstName: string; lastName: string }; paymentReference?: string }[]).map((s) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span>{s.user?.firstName} {s.user?.lastName} — {s.paymentReference}</span>
            <button type="button" className="btn" onClick={() => confirm(s.id)}>Confirmar</button>
          </div>
        ))}
        {!data.pending?.length && <p className="muted">Sin pagos pendientes.</p>}
      </div>

      <div className="card">
        <h3>Por vencer (14 días)</h3>
        {(data.expiring as { userId: string; user?: { firstName: string }; endDate: string }[]).map((s) => (
          <div key={s.userId + s.endDate} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>{s.user?.firstName} — {new Date(s.endDate).toLocaleDateString()}</span>
            <button type="button" className="btn-ghost" onClick={() => extend(s.userId)}>Extender</button>
          </div>
        ))}
      </div>
    </div>
  );
}
