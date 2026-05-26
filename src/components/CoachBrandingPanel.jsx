import { useEffect, useState } from 'react';
import api from '../services/api';

export default function CoachBrandingPanel({ trainerId, readOnly = false }) {
  const [form, setForm] = useState({
    brand_name: '',
    logo_url: '',
    primary_color: '#65a30d',
    secondary_color: '#1c1917',
    welcome_message: '',
    support_whatsapp: '',
    white_label_enabled: false,
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!trainerId) return;
    api.get(`/trainers/${trainerId}/branding`)
      .then((r) => setForm((f) => ({ ...f, ...r.data })))
      .catch(() => setMsg('No se pudo cargar branding del coach'));
  }, [trainerId]);

  const save = async () => {
    setMsg('');
    try {
      await api.put(`/trainers/${trainerId}/branding`, form);
      setMsg('Branding guardado');
    } catch {
      setMsg('Error al guardar');
    }
  };

  if (!trainerId) return null;

  return (
    <div className="card p-4 space-y-3 mt-4">
      <h3 className="font-semibold">Marca del coach</h3>
      {readOnly && <p className="text-sm text-stone-500">Solo lectura</p>}
      <input className="input" placeholder="Nombre de marca" value={form.brand_name || ''} disabled={readOnly}
        onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
      <input className="input" placeholder="URL logo" value={form.logo_url || ''} disabled={readOnly}
        onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="#65a30d" value={form.primary_color || ''} disabled={readOnly}
          onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
        <input className="input" placeholder="#1c1917" value={form.secondary_color || ''} disabled={readOnly}
          onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
      </div>
      {!readOnly && (
        <button type="button" className="btn-primary" onClick={save}>Guardar marca coach</button>
      )}
      {msg && <p className="text-sm text-stone-600">{msg}</p>}
    </div>
  );
}
