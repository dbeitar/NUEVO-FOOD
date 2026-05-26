import { useEffect, useState } from 'react';
import api from '../../services/api';
import RoutineTemplateViewer from '../routines/RoutineTemplateViewer';

export default function LiveClassRoutineHost({ classItem, user }) {
  const routine = classItem?.d28d_routine || classItem?.d28d_routine_snapshot;
  const sessionAdjustments = routine?.session_adjustments
    || classItem?.d28d_session_adjustments
    || '';
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
      <p className="text-xs text-amber-800 mt-2">
        Solo lectura de plantilla maestra. Tus observaciones no modifican la rutina.
      </p>

      <div className="mt-4">
        <RoutineTemplateViewer routine={routine} sessionAdjustments={sessionAdjustments} />
      </div>

      <div className="mt-4 pt-4 border-t border-lime-200">
        <label className="block text-sm font-semibold mb-1">Observaciones del anfitrión</label>
        <textarea
          className="input w-full min-h-[72px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notas para esta clase (no alteran la plantilla)…"
        />
        <button type="button" className="btn-primary mt-2 text-sm" disabled={saving} onClick={saveNote}>
          {saving ? 'Guardando…' : 'Registrar observación'}
        </button>
        {notes.length > 0 && (
          <ul className="mt-3 text-sm space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="bg-white rounded-lg p-2 border border-slate-100">
                <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                <p>{n.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
