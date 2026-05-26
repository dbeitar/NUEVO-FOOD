import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function CoachProgress() {
  const { id } = useParams();
  const [data, setData] = useState<{ plan?: { days?: unknown[] }; logs?: { logDate: string; completado: boolean }[] } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/coach/athletes/${id}/progress`).then((r) => setData(r.data)).catch(console.error);
  }, [id]);

  async function saveNote() {
    if (!id || !note.trim()) return;
    await api.post(`/coach/athletes/${id}/notes`, { texto: note });
    setNote('');
  }

  return (
    <div>
      <h1>Seguimiento atleta</h1>
      <div className="card">
        <h3>Plan activo</h3>
        <p className="muted">Días configurados: {Array.isArray(data?.plan?.days) ? data!.plan!.days!.length : 0}</p>
      </div>
      <div className="card">
        <h3>Últimos registros</h3>
        <ul>
          {(data?.logs || []).slice(0, 10).map((l, i) => (
            <li key={i}>{l.logDate} — {l.completado ? 'Completado' : 'Pendiente'}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Nota coach</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <button type="button" className="btn" style={{ marginTop: '0.5rem' }} onClick={saveNote}>Guardar nota</button>
      </div>
    </div>
  );
}
