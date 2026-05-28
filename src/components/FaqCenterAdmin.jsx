import { useState, useEffect } from 'react';
import api from '../services/api';
import HelpAssistantWidget from './HelpAssistantWidget';

const MODULOS = ['d28d', 'training', 'platform'];

export default function FaqCenterAdmin() {
  const [modulo, setModulo] = useState('d28d');
  const [data, setData] = useState({ categories: [], items: [] });
  const [form, setForm] = useState({ category_id: '', pregunta: '', respuesta: '', tags: '' });

  const load = () => api.get(`/faq/${modulo}`).then((r) => setData(r.data?.data || { categories: [], items: [] }));

  useEffect(() => { load(); }, [modulo]);

  const save = async (e) => {
    e.preventDefault();
    await api.post(`/faq/${modulo}/items`, {
      category_id: Number(form.category_id) || data.categories[0]?.id,
      pregunta: form.pregunta,
      respuesta: form.respuesta,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setForm({ category_id: '', pregunta: '', respuesta: '', tags: '' });
    load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">FAQ Center</h2>
      <div className="flex gap-2">
        {MODULOS.map((m) => (
          <button key={m} type="button" className={`px-3 py-1 rounded-xl text-sm ${modulo === m ? 'bg-indigo-100' : 'bg-stone-100'}`} onClick={() => setModulo(m)}>{m.toUpperCase()}</button>
        ))}
      </div>
      <form onSubmit={save} className="card space-y-2">
        <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Categoría</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input className="input" placeholder="Pregunta" required value={form.pregunta} onChange={(e) => setForm({ ...form, pregunta: e.target.value })} />
        <textarea className="input" placeholder="Respuesta" required rows={3} value={form.respuesta} onChange={(e) => setForm({ ...form, respuesta: e.target.value })} />
        <input className="input" placeholder="tags separados por coma" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button type="submit" className="btn-primary">Guardar FAQ</button>
      </form>
      <div className="space-y-2">
        {data.items.map((i) => (
          <div key={i.id} className="card text-sm">
            <p className="font-semibold">{i.pregunta}</p>
            <p className="text-stone-600">{i.respuesta}</p>
            <p className="text-xs text-stone-400">Útil: {i.util_count || 0}</p>
          </div>
        ))}
      </div>
      <HelpAssistantWidget modulo={modulo} />
    </div>
  );
}
