import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

type Athlete = { id: string; email: string; firstName: string; lastName: string };

export default function CoachUsers() {
  const [list, setList] = useState<Athlete[]>([]);

  useEffect(() => {
    api.get('/coach/athletes').then((r) => setList(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Atletas</h1>
      {list.length === 0 && <p className="muted">Sin atletas asignados (provisionados desde D28D).</p>}
      {list.map((a) => (
        <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{a.firstName} {a.lastName}</strong>
            <div className="muted">{a.email}</div>
          </div>
          <Link className="btn" to={`/coach/progress/${a.id}`}>Seguimiento</Link>
        </div>
      ))}
    </div>
  );
}
