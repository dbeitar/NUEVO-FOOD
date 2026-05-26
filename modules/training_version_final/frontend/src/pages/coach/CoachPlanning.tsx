import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CoachPlanning() {
  const [athletes, setAthletes] = useState<{ id: string; firstName: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [daysJson, setDaysJson] = useState('[]');

  useEffect(() => {
    api.get('/coach/athletes').then((r) => {
      setAthletes(r.data);
      if (r.data[0]) setSelected(r.data[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/training/coach/plan/${selected}`).then((r) => {
      setDaysJson(JSON.stringify(r.data.days || [], null, 2));
    }).catch(() => setDaysJson('[]'));
  }, [selected]);

  async function save() {
    if (!selected) return;
    let days: unknown[] = [];
    try { days = JSON.parse(daysJson); } catch { alert('JSON inválido'); return; }
    await api.put(`/training/coach/plan/${selected}`, { days });
    alert('Plan guardado');
  }

  return (
    <div>
      <h1>Planificación</h1>
      <div className="card">
        <label>Atleta
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.firstName}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block', marginTop: '1rem' }}>Días (JSON)
          <textarea rows={12} value={daysJson} onChange={(e) => setDaysJson(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={save}>Guardar plan</button>
      </div>
    </div>
  );
}
