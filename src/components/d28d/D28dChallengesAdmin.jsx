import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Trophy, Plus, Pencil, Copy, Play, Lock, Megaphone, XCircle } from 'lucide-react';

const emptyForm = {
  nombre: '', descripcion: '', objetivo: '', premio: '', program_id: 'vital',
  fecha_inicio: '', fecha_fin: '', cantidad_ganadores: 3, reglas: '',
};

export default function D28dChallengesAdmin({ onBack }) {
  const [challenges, setChallenges] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [scoreForm, setScoreForm] = useState({ entry_id: '', puntuacion: 0 });
  const [podium, setPodium] = useState({ first: '', second: '', third: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      api.get('/d28d/challenges'),
      api.get('/programs'),
    ]);
    setChallenges(cRes.data?.data || []);
    setPrograms(pRes.data?.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const payload = { ...form, reglas: form.reglas ? { texto: form.reglas } : null };
      if (editing) await api.put(`/d28d/challenges/${editing}`, payload);
      else await api.post('/d28d/challenges', payload);
      setForm(emptyForm);
      setEditing(null);
      setMsg('Guardado');
      load();
    } catch (ex) {
      setErr(ex?.response?.data?.error || 'Error');
    }
  };

  const action = async (id, path) => {
    await api.post(`/d28d/challenges/${id}/${path}`);
    load();
  };

  const openDetail = async (id) => {
    const res = await api.get(`/d28d/challenges/${id}`);
    setSelected(res.data?.data);
  };

  const submitScore = async () => {
    await api.post(`/d28d/challenges/${selected.id}/score`, scoreForm);
    openDetail(selected.id);
  };

  const submitPodium = async () => {
    await api.post(`/d28d/challenges/${selected.id}/podium`, podium);
    await action(selected.id, 'publish');
    openDetail(selected.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6" /> Retos D28D</h2>
        {onBack && <button type="button" className="btn-secondary" onClick={onBack}>Volver</button>}
      </div>
      {msg && <p className="text-emerald-700 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <form onSubmit={save} className="card space-y-3">
        <h3 className="font-semibold">{editing ? 'Editar reto' : 'Nuevo reto'}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <select className="input" value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input md:col-span-2" placeholder="Descripción" required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <input className="input" type="datetime-local" required value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
          <input className="input" type="datetime-local" required value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
          <input className="input" placeholder="Premio" value={form.premio} onChange={(e) => setForm({ ...form, premio: e.target.value })} />
          <input className="input" placeholder="Objetivo" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Guardar</button>
      </form>

      <div className="grid gap-4">
        {challenges.map((c) => (
          <div key={c.id} className="card flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-bold">{c.nombre}</p>
              <p className="text-sm text-stone-600">{c.estado} · {c.participants_count || 0} participantes</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => { setEditing(c.id); setForm({ ...form, ...c, fecha_inicio: c.fecha_inicio?.slice(0, 16), fecha_fin: c.fecha_fin?.slice(0, 16) }); }}><Pencil className="w-3 h-3 inline" /></button>
              <button type="button" className="btn-secondary text-xs" onClick={() => api.post(`/d28d/challenges/${c.id}/duplicate`).then(load)}><Copy className="w-3 h-3 inline" /></button>
              <button type="button" className="btn-secondary text-xs" onClick={() => action(c.id, 'activate')}><Play className="w-3 h-3 inline" /></button>
              <button type="button" className="btn-secondary text-xs" onClick={() => action(c.id, 'close')}><Lock className="w-3 h-3 inline" /></button>
              <button type="button" className="btn-secondary text-xs" onClick={() => openDetail(c.id)}>Evaluar</button>
              <button type="button" className="btn-secondary text-xs" onClick={() => action(c.id, 'cancel')}><XCircle className="w-3 h-3 inline" /></button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="card space-y-4">
          <h3 className="font-bold">Evaluación: {selected.nombre}</h3>
          {(selected.participants || []).map((p) => (
            <div key={p.id} className="border rounded-xl p-3 text-sm">
              <p className="font-medium">{p.user_name} — {p.estado} {p.puntuacion != null ? `(${p.puntuacion} pts)` : ''}</p>
              <p className="text-stone-500">{p.evidences?.length || 0} evidencias</p>
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <input className="input" placeholder="entry_id" value={scoreForm.entry_id} onChange={(e) => setScoreForm({ ...scoreForm, entry_id: e.target.value })} />
            <input className="input" type="number" placeholder="Puntos" value={scoreForm.puntuacion} onChange={(e) => setScoreForm({ ...scoreForm, puntuacion: e.target.value })} />
            <button type="button" className="btn-primary" onClick={submitScore}>Calificar</button>
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            <input className="input" placeholder="1° entry_id" value={podium.first} onChange={(e) => setPodium({ ...podium, first: e.target.value })} />
            <input className="input" placeholder="2° entry_id" value={podium.second} onChange={(e) => setPodium({ ...podium, second: e.target.value })} />
            <input className="input" placeholder="3° entry_id" value={podium.third} onChange={(e) => setPodium({ ...podium, third: e.target.value })} />
          </div>
          <button type="button" className="btn-primary inline-flex gap-2" onClick={submitPodium}><Megaphone className="w-4 h-4" /> Publicar podio</button>
          <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
