import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  adminImportBible,
  adminListDevotionals,
  adminListEvents,
  adminListStudies,
  adminListVerses,
  adminSaveAuthor,
  adminSaveCategory,
  adminSaveDevotional,
  adminSaveEvent,
  adminSaveStudy,
  adminSaveVerse,
  adminUploadStudy,
  adminImportBible,
  adminAiStatus,
  adminNicolasTrainer,
  adminAiGenerateVerse,
  adminAiGenerateDevotional,
  adminAiGenerateStudy,
} from '../../../utils/spiritualApi';

const TABS = [
  { id: 'bible', label: 'Biblia' },
  { id: 'assistant', label: 'Asistente IA' },
  { id: 'verse', label: 'Versículo del día' },
  { id: 'devotional', label: 'Devocionales' },
  { id: 'studies', label: 'Estudios' },
  { id: 'events', label: 'Eventos' },
];

const SCOPES = [
  { value: 'global', label: 'Global' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'trainer', label: 'Entrenador' },
];

export default function SpiritualCenterShell({ onBack }) {
  const [tab, setTab] = useState('verse');
  const [msg, setMsg] = useState('');
  const [verses, setVerses] = useState([]);
  const [devotionals, setDevotionals] = useState([]);
  const [studies, setStudies] = useState([]);
  const [events, setEvents] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [nicolas, setNicolas] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [verseForm, setVerseForm] = useState({
    scheduled_date: new Date().toISOString().slice(0, 10),
    custom_text: '',
    reflection: '',
    published: true,
    scope_type: 'global',
    scope_gym_id: '',
    scope_trainer_id: '',
  });

  const [devForm, setDevForm] = useState({
    title: '',
    duration_days: 7,
    description: '',
    scope_type: 'global',
    days: [{ day_index: 1, reflection: '', prayer: '', challenge: '' }],
  });

  const [studyForm, setStudyForm] = useState({
    title: '',
    media_type: 'pdf',
    media_url: '',
    description: '',
    scope_type: 'global',
    category_name: '',
    author_name: '',
    tags: '',
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    mode: 'virtual',
    start_time: '',
    end_time: '',
    zoom_link: '',
    meet_link: '',
    location: '',
    scope_type: 'global',
  });

  const reload = useCallback(async () => {
    try {
      const [v, d, s, e, ai, tr] = await Promise.all([
        adminListVerses(),
        adminListDevotionals(),
        adminListStudies(),
        adminListEvents(),
        adminAiStatus().catch(() => null),
        adminNicolasTrainer().catch(() => null),
      ]);
      setVerses(v);
      setDevotionals(d);
      setStudies(s);
      setEvents(e);
      setAiStatus(ai);
      setNicolas(tr);
      if (tr?.id) {
        setVerseForm((f) => ({ ...f, scope_type: 'trainer', scope_trainer_id: String(tr.id) }));
        setDevForm((f) => ({ ...f, scope_type: 'trainer', scope_trainer_id: tr.id }));
        setStudyForm((f) => ({ ...f, scope_type: 'trainer' }));
        setEventForm((f) => ({ ...f, scope_type: 'trainer', scope_trainer_id: tr.id }));
      }
    } catch {
      /* admin only */
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const saveVerse = async (e) => {
    e.preventDefault();
    await adminSaveVerse({
      ...verseForm,
      scope_gym_id: verseForm.scope_type === 'gym' ? Number(verseForm.scope_gym_id) : null,
      scope_trainer_id: verseForm.scope_type === 'trainer' ? Number(verseForm.scope_trainer_id) : null,
    });
    flash('Versículo guardado y publicado.');
    reload();
  };

  const saveDevotional = async (e) => {
    e.preventDefault();
    await adminSaveDevotional(devForm);
    flash('Devocional guardado.');
    reload();
  };

  const saveStudy = async (e) => {
    e.preventDefault();
    let categoryId = null;
    let authorId = null;
    if (studyForm.category_name) {
      const c = await adminSaveCategory(studyForm.category_name);
      categoryId = c.id;
    }
    if (studyForm.author_name) {
      const a = await adminSaveAuthor(studyForm.author_name);
      authorId = a.id;
    }
    await adminSaveStudy({
      title: studyForm.title,
      media_type: studyForm.media_type,
      media_url: studyForm.media_url,
      description: studyForm.description,
      scope_type: studyForm.scope_type,
      category_id: categoryId,
      author_id: authorId,
      tags: studyForm.tags ? studyForm.tags.split(',').map((t) => t.trim()) : [],
    });
    flash('Estudio guardado.');
    reload();
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    await adminSaveEvent(eventForm);
    flash('Evento guardado.');
    reload();
  };

  const onBibleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const out = await adminImportBible(file);
    flash(`Biblia importada: ${out.imported} versículos.`);
  };

  const runAi = async (kind) => {
    setAiBusy(true);
    try {
      if (kind === 'verse') {
        const out = await adminAiGenerateVerse({ assign_nicolas: true, published: true });
        flash(`Versículo generado para ${out.trainer?.nombre || 'Nicolas'}.`);
      } else if (kind === 'devotional') {
        await adminAiGenerateDevotional({ duration_days: 7, assign_nicolas: true });
        flash('Devocional 7 días generado para comunidad Nicolas del Rio.');
      } else if (kind === 'study') {
        await adminAiGenerateStudy({
          topic: 'Enseñanzas de Jesús aplicadas al bienestar integral',
          assign_nicolas: true,
        });
        flash('Estudio generado para comunidad Nicolas del Rio.');
      }
      reload();
    } catch (err) {
      flash(err?.response?.data?.error || 'Error del asistente. Verifica Ollama o usa npm run spiritual:bootstrap-nicolas');
    } finally {
      setAiBusy(false);
    }
  };

  const onStudyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const out = await adminUploadStudy(file);
    setStudyForm((f) => ({ ...f, media_url: out.media_url }));
    flash('Archivo subido.');
  };

  return (
    <div className="dashboard-main-view space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Volver
          </button>
        ) : null}
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Centro de Formación Espiritual</h2>
          <p className="text-sm text-stone-600">Administración exclusiva SuperAdmin — VIENTO RECIO V1</p>
        </div>
      </header>

      {msg ? <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</p> : null}

      <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? 'bg-amber-100 font-semibold text-amber-900' : 'text-stone-600 hover:bg-stone-100'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'bible' ? (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold">Importar Biblia (JSON)</h3>
          <p className="text-sm text-stone-600">
            Una versión (RVR1960). Formato: book, chapter, verse, text.
            Guía completa: <code>docs/VIENTO_RECIO_BIBLE_AND_AI.md</code>
          </p>
          <input type="file" accept=".json,application/json" onChange={onBibleImport} />
        </div>
      ) : null}

      {tab === 'assistant' ? (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-6">
          <h3 className="font-semibold">Asistente espiritual gratuito (Ollama)</h3>
          <p className="text-sm text-stone-600">
            Formación centrada en las enseñanzas de Jesús — visión espiritual, no denominacional.
            Contenido asignado a la comunidad de <strong>Nicolas del Rio</strong>.
          </p>
          {nicolas ? (
            <p className="text-sm text-green-800">
              Entrenador vinculado: {nicolas.nombre} (ID {nicolas.id}) · {nicolas.email}
            </p>
          ) : (
            <p className="text-sm text-red-700">
              Nicolas del Rio no encontrado. Ejecuta: <code>npm run seed:coach-nicolas</code>
            </p>
          )}
          {aiStatus ? (
            <p className="text-xs text-stone-500">
              Ollama: {aiStatus.ollama_available ? 'activo' : 'no disponible — se usa contenido fallback'}
              {aiStatus.model ? ` · modelo ${aiStatus.model}` : ''}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={aiBusy || !nicolas} onClick={() => runAi('verse')}>
              Generar versículo del día (Nicolas)
            </button>
            <button type="button" className="btn-secondary" disabled={aiBusy || !nicolas} onClick={() => runAi('devotional')}>
              Generar devocional 7 días
            </button>
            <button type="button" className="btn-secondary" disabled={aiBusy || !nicolas} onClick={() => runAi('study')}>
              Generar estudio bíblico
            </button>
          </div>
          <p className="text-xs text-stone-500">
            CLI completo: <code>npm run spiritual:bootstrap-nicolas</code> · Instalar IA: <code>ollama pull llama3.1:8b</code>
          </p>
        </div>
      ) : null}

      {tab === 'verse' ? (
        <form onSubmit={saveVerse} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold">Versículo del día</h3>
          <label className="block text-sm">
            Fecha
            <input type="date" className="input mt-1 w-full" value={verseForm.scheduled_date} onChange={(ev) => setVerseForm({ ...verseForm, scheduled_date: ev.target.value })} />
          </label>
          <label className="block text-sm">
            Texto (opcional si usa versículo importado)
            <textarea className="input mt-1 w-full" rows={3} value={verseForm.custom_text} onChange={(ev) => setVerseForm({ ...verseForm, custom_text: ev.target.value })} />
          </label>
          <label className="block text-sm">
            Reflexión
            <textarea className="input mt-1 w-full" rows={2} value={verseForm.reflection} onChange={(ev) => setVerseForm({ ...verseForm, reflection: ev.target.value })} />
          </label>
          <label className="block text-sm">
            Alcance
            <select className="input mt-1 w-full" value={verseForm.scope_type} onChange={(ev) => setVerseForm({ ...verseForm, scope_type: ev.target.value })}>
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          {verseForm.scope_type === 'gym' ? (
            <input className="input w-full" placeholder="ID gimnasio" value={verseForm.scope_gym_id} onChange={(ev) => setVerseForm({ ...verseForm, scope_gym_id: ev.target.value })} />
          ) : null}
          {verseForm.scope_type === 'trainer' ? (
            <input className="input w-full" placeholder="ID entrenador" value={verseForm.scope_trainer_id} onChange={(ev) => setVerseForm({ ...verseForm, scope_trainer_id: ev.target.value })} />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verseForm.published} onChange={(ev) => setVerseForm({ ...verseForm, published: ev.target.checked })} />
            Publicar ahora (notifica vía Communication Center)
          </label>
          <button type="submit" className="btn-primary">Guardar</button>
          {verses.length ? (
            <ul className="mt-4 text-sm text-stone-600">
              {verses.slice(0, 5).map((v) => (
                <li key={v.id}>{String(v.scheduledDate).slice(0, 10)} — {v.scopeType} {v.published ? '✓' : 'borrador'}</li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : null}

      {tab === 'devotional' ? (
        <form onSubmit={saveDevotional} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold">Devocional</h3>
          <input className="input w-full" placeholder="Título" value={devForm.title} onChange={(ev) => setDevForm({ ...devForm, title: ev.target.value })} required />
          <select className="input w-full" value={devForm.duration_days} onChange={(ev) => setDevForm({ ...devForm, duration_days: Number(ev.target.value) })}>
            {[7, 21, 30, 40].map((n) => <option key={n} value={n}>{n} días</option>)}
          </select>
          <textarea className="input w-full" placeholder="Descripción" value={devForm.description} onChange={(ev) => setDevForm({ ...devForm, description: ev.target.value })} />
          <label className="block text-sm">
            Día 1 — reflexión
            <textarea className="input mt-1 w-full" value={devForm.days[0]?.reflection || ''} onChange={(ev) => setDevForm({ ...devForm, days: [{ ...devForm.days[0], day_index: 1, reflection: ev.target.value, prayer: devForm.days[0]?.prayer || '', challenge: devForm.days[0]?.challenge || '' }] })} />
          </label>
          <label className="block text-sm">
            Oración
            <textarea className="input mt-1 w-full" value={devForm.days[0]?.prayer || ''} onChange={(ev) => setDevForm({ ...devForm, days: [{ ...devForm.days[0], day_index: 1, prayer: ev.target.value, reflection: devForm.days[0]?.reflection || '', challenge: devForm.days[0]?.challenge || '' }] })} />
          </label>
          <label className="block text-sm">
            Desafío
            <input className="input mt-1 w-full" value={devForm.days[0]?.challenge || ''} onChange={(ev) => setDevForm({ ...devForm, days: [{ ...devForm.days[0], day_index: 1, challenge: ev.target.value, reflection: devForm.days[0]?.reflection || '', prayer: devForm.days[0]?.prayer || '' }] })} />
          </label>
          <button type="submit" className="btn-primary">Guardar devocional</button>
          {devotionals.length ? <p className="text-sm text-stone-500">{devotionals.length} planes registrados</p> : null}
        </form>
      ) : null}

      {tab === 'studies' ? (
        <form onSubmit={saveStudy} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold">Estudio bíblico</h3>
          <input className="input w-full" placeholder="Título" value={studyForm.title} onChange={(ev) => setStudyForm({ ...studyForm, title: ev.target.value })} required />
          <select className="input w-full" value={studyForm.media_type} onChange={(ev) => setStudyForm({ ...studyForm, media_type: ev.target.value })}>
            {['pdf', 'video', 'audio', 'youtube'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {studyForm.media_type === 'youtube' ? (
            <input className="input w-full" placeholder="URL YouTube" value={studyForm.media_url} onChange={(ev) => setStudyForm({ ...studyForm, media_url: ev.target.value })} />
          ) : (
            <>
              <input type="file" onChange={onStudyUpload} />
              {studyForm.media_url ? <p className="text-xs text-stone-500">{studyForm.media_url}</p> : null}
            </>
          )}
          <input className="input w-full" placeholder="Categoría" value={studyForm.category_name} onChange={(ev) => setStudyForm({ ...studyForm, category_name: ev.target.value })} />
          <input className="input w-full" placeholder="Autor" value={studyForm.author_name} onChange={(ev) => setStudyForm({ ...studyForm, author_name: ev.target.value })} />
          <input className="input w-full" placeholder="Etiquetas (coma)" value={studyForm.tags} onChange={(ev) => setStudyForm({ ...studyForm, tags: ev.target.value })} />
          <button type="submit" className="btn-primary">Guardar estudio</button>
          {studies.length ? <p className="text-sm text-stone-500">{studies.length} estudios</p> : null}
        </form>
      ) : null}

      {tab === 'events' ? (
        <form onSubmit={saveEvent} className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h3 className="font-semibold">Evento espiritual</h3>
          <input className="input w-full" placeholder="Título" value={eventForm.title} onChange={(ev) => setEventForm({ ...eventForm, title: ev.target.value })} required />
          <select className="input w-full" value={eventForm.mode} onChange={(ev) => setEventForm({ ...eventForm, mode: ev.target.value })}>
            {['presencial', 'virtual', 'hybrid'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="datetime-local" className="input w-full" value={eventForm.start_time} onChange={(ev) => setEventForm({ ...eventForm, start_time: ev.target.value })} required />
          <input type="datetime-local" className="input w-full" value={eventForm.end_time} onChange={(ev) => setEventForm({ ...eventForm, end_time: ev.target.value })} required />
          <input className="input w-full" placeholder="Zoom link" value={eventForm.zoom_link} onChange={(ev) => setEventForm({ ...eventForm, zoom_link: ev.target.value })} />
          <input className="input w-full" placeholder="Google Meet link" value={eventForm.meet_link} onChange={(ev) => setEventForm({ ...eventForm, meet_link: ev.target.value })} />
          <input className="input w-full" placeholder="Ubicación (presencial)" value={eventForm.location} onChange={(ev) => setEventForm({ ...eventForm, location: ev.target.value })} />
          <button type="submit" className="btn-primary">Guardar evento</button>
          {events.length ? <p className="text-sm text-stone-500">{events.length} eventos</p> : null}
        </form>
      ) : null}
    </div>
  );
}
