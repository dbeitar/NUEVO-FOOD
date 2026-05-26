import { FormEvent, useEffect, useState } from 'react';
import api from '../../services/api';

type Item = { id: number; name: string; muscleGroup: string; videoUrl: string };

export default function CoachGallery() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');

  function load() {
    api.get('/training/gallery').then((r) => setItems(r.data)).catch(console.error);
  }

  useEffect(() => { load(); }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await api.post('/training/gallery', { name, muscleGroup });
    setName('');
    setMuscleGroup('');
    load();
  }

  return (
    <div>
      <h1>Galería de ejercicios</h1>
      <form className="card" onSubmit={onAdd}>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Grupo muscular" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} style={{ marginTop: '0.5rem' }} />
        <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Añadir</button>
      </form>
      {items.map((it) => (
        <div key={it.id} className="card">
          <strong>{it.name}</strong>
          <div className="muted">{it.muscleGroup}</div>
        </div>
      ))}
    </div>
  );
}
