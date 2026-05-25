import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function WorkoutPage() {
  const navigate = useNavigate();
  const [day, setDay] = useState(1);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(true);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/training/logs', {
      day,
      completado: done,
      trainerNotes: notes,
      exercises: [{ name: 'Sesión libre', sets: [] }],
      durationMinutes: 45,
    });
    navigate('/athlete', { replace: true });
  }

  return (
    <div>
      <h1>Registrar entreno</h1>
      <form className="card" onSubmit={onSubmit}>
        <label>Día<input type="number" min={1} value={day} onChange={(e) => setDay(Number(e.target.value))} /></label>
        <label style={{ display: 'block', marginTop: '1rem' }}>Notas<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Completado
        </label>
        <button type="submit" className="btn" style={{ marginTop: '1rem' }}>Guardar</button>
      </form>
    </div>
  );
}
