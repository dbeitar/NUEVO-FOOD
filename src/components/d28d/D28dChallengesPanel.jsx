import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trophy, Upload } from 'lucide-react';

export default function D28dChallengesPanel() {
  const [challenges, setChallenges] = useState([]);
  const [active, setActive] = useState(null);
  const [textEvidence, setTextEvidence] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/d28d/challenges').then((r) => setChallenges(r.data?.data || [])).catch(() => {});
  }, []);

  const enroll = async (id) => {
    await api.post(`/d28d/challenges/${id}/enroll`);
    setMsg('Inscripción confirmada');
  };

  const withdraw = async (id) => {
    await api.post(`/d28d/challenges/${id}/withdraw`);
    setMsg('Te retiraste del reto');
  };

  const submitText = async (id) => {
    await api.post(`/d28d/challenges/${id}/evidence`, { tipo: 'text', contenido: textEvidence });
    setTextEvidence('');
    setMsg('Evidencia enviada');
  };

  const uploadFile = async (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tipo', file.type.startsWith('image/') ? 'image' : 'pdf');
    await api.post(`/d28d/challenges/${id}/evidence`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setMsg('Archivo subido');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5" /> Mis Retos</h3>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      {challenges.map((c) => (
        <div key={c.id} className="card">
          <p className="font-semibold">{c.nombre}</p>
          <p className="text-sm text-stone-600">{c.descripcion}</p>
          {c.premio && <p className="text-sm text-lime-700">Premio: {c.premio}</p>}
          <p className="text-xs text-stone-500">Estado: {c.estado}</p>
          {c.estado === 'active' && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button type="button" className="btn-primary text-sm" onClick={() => enroll(c.id)}>Participar</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => withdraw(c.id)}>Retirarme</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setActive(active === c.id ? null : c.id)}>Subir evidencia</button>
            </div>
          )}
          {active === c.id && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <textarea className="input" rows={2} placeholder="Comentario o texto" value={textEvidence} onChange={(e) => setTextEvidence(e.target.value)} />
              <button type="button" className="btn-primary text-sm" onClick={() => submitText(c.id)}>Enviar texto</button>
              <label className="btn-secondary text-sm inline-flex items-center gap-1 cursor-pointer">
                <Upload className="w-4 h-4" /> Archivo
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files[0] && uploadFile(c.id, e.target.files[0])} />
              </label>
            </div>
          )}
          {c.estado === 'published' && c.podium?.length > 0 && (
            <div className="mt-3 bg-lime-50 rounded-xl p-3">
              <p className="text-sm font-semibold">Ganadores</p>
              {c.podium.map((p) => (
                <p key={p.lugar} className="text-sm">{p.lugar}° — {p.user_name} ({p.puntuacion} pts)</p>
              ))}
            </div>
          )}
          {c.ranking?.length > 0 && (
            <div className="mt-2 text-xs text-stone-500">
              Ranking: {c.ranking.slice(0, 5).map((r) => `#${r.position} ${r.user_name}`).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
