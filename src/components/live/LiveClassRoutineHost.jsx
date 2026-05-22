import { useEffect, useState } from 'react';
import api from '../../services/api';

const BLOCK_LABELS = {
  REST_PAUSE: 'Rest-Pause',
  TABATA: 'Tabata',
  HIIT: 'HIIT',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  SUPER_SET: 'Super Set',
  BLOQUE_LIBRE: 'Bloque libre',
};

export default function LiveClassRoutineHost({ classItem, user }) {
  const routine = classItem?.d28d_routine || classItem?.d28d_routine_snapshot;
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    if (!routine?.id && !classItem?.d28d_routine_id) return;
    try {
      const res = await api.get('/d28d/routines/notes/host', {
        params: {
          live_class_id: classItem?.id,
          routine_id: routine?.id || classItem?.d28d_routine_id,
        },
      });
      setNotes(res.data?.data || []);
    } catch {
      setNotes([]);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [classItem?.id, routine?.id]);

  if (!routine) {
    return (
      <p className="text-sm text-slate-500 mt-4">
        Esta clase no tiene rutina D28D asignada. Puedes programarla manualmente o elegir una plantilla al crear/editar la clase.
      </p>
    );
  }

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post('/d28d/routines/notes/host', {
        routine_id: routine.id || classItem.d28d_routine_id,
        live_class_id: classItem.id,
        texto: note,
      });
      setNote('');
      await loadNotes();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-lime-200 bg-lime-50/50 p-4">
      <h3 className="font-bold text-stone-900">Rutina D28D — vista anfitrión</h3>
      <p className="text-sm text-stone-600 mt-1">
        <strong>{routine.nombre}</strong> · {routine.categoria}
        {routine.subcategoria ? ` · ${routine.subcategoria}` : ''}
        {routine.version ? ` · v${routine.version}` : ''}
      </p>
      <p className="text-xs text-amber-800 mt-2">Solo lectura de plantilla maestra. Tus observaciones no modifican la rutina.</p>

      <div className="mt-4 space-y-3">
        {(routine.blocks || []).map((block) => (
          <div key={block.id || block.orden} className="rounded-xl bg-white border border-slate-200 p-3">
            <div className="font-semibold text-sm">
              {BLOCK_LABELS[block.tipo] || block.tipo}
              {block.nombre ? ` — ${block.nombre}` : ''}
            </div>
            <ul className="mt-2 text-sm space-y-1">
              {(block.exercises || []).map((ex) => (
                <li key={ex.id || ex.orden}>
                  {ex.nombre}
                  {ex.repeticiones ? ` · ${ex.repeticiones} reps` : ''}
                  {ex.duracion ? ` · ${ex.duracion}` : ''}
                  {ex.descanso ? ` · desc ${ex.descanso}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-sm font-semibold block mb-1">Observaciones del anfitrión ({user?.nombre || 'coach'})</label>
        <textarea className="input w-full min-h-[72px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notas para esta sesión (no editan la plantilla)" />
        <button type="button" className="btn-primary mt-2" disabled={saving} onClick={saveNote}>Guardar observación</button>
        {notes.length > 0 && (
          <ul className="mt-3 text-sm space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="bg-white rounded-lg p-2 border border-slate-100">{n.texto}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
