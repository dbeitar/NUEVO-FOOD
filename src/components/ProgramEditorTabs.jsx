import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AdminPlans from './AdminPlans';
import { Save, X, Video, Calendar, CreditCard, Settings } from 'lucide-react';
import { formatCycleDate, computeCycleEnd } from '../utils/cycleUtils';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ciclos', label: 'Ciclos', icon: Calendar },
  { id: 'zoom', label: 'Zoom', icon: Video },
  { id: 'planes', label: 'Planes', icon: CreditCard },
];

export default function ProgramEditorTabs({ program, cycles, onClose, onSaved }) {
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState({
    name: program?.name || '',
    color: program?.color || '#10b981',
    active: program?.active !== false,
    active_cycle_id: Number(program?.active_cycle_id) || '',
    zoom_email: program?.zoom_email || '',
    zoom_accounts: Array.isArray(program?.zoom_accounts) ? program.zoom_accounts : [],
  });
  const [zoomStatus, setZoomStatus] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/programs/zoom-master')
      .then((res) => setZoomStatus(res.data?.data || []))
      .catch(() => setZoomStatus([]));
  }, []);

  const saveProgram = async (e) => {
    e?.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        active: form.active,
        active_cycle_id: Number(form.active_cycle_id) || null,
        zoom_email: form.zoom_email.trim() || undefined,
      };
      if (form.zoom_accounts?.length) {
        payload.zoom_accounts = form.zoom_accounts.map((a) => ({
          id: a.id,
          label: a.label,
          email: a.email,
          activo: a.activo !== false,
          observaciones: a.observaciones || '',
        }));
      }
      await api.put(`/programs/${program.id}`, payload);
      setMessage('Programa guardado');
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error guardando programa');
    } finally {
      setSaving(false);
    }
  };

  const updateZoomAccount = (idx, field, value) => {
    setForm((prev) => {
      const accounts = [...(prev.zoom_accounts || [])];
      accounts[idx] = { ...accounts[idx], [field]: value };
      return { ...prev, zoom_accounts: accounts };
    });
  };

  const addZoomAccount = () => {
    setForm((prev) => ({
      ...prev,
      zoom_accounts: [
        ...(prev.zoom_accounts || []),
        { id: `${program.id}_${Date.now()}`, label: 'Nueva cuenta', email: '', activo: true, observaciones: '' },
      ],
    }));
  };

  const programCycles = cycles.filter((c) =>
    Number(c.id) === Number(form.active_cycle_id)
    || cycles.some(() => true),
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-stone-50">
        <div>
          <h4 className="text-lg font-bold text-stone-900">Editar programa: {program.name}</h4>
          <p className="text-xs text-stone-500">ID: {program.id}</p>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-1" onClick={onClose}>
          <X className="w-4 h-4" /> Cerrar
        </button>
      </div>

      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-white">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium ${
              tab === id ? 'bg-indigo-100 text-indigo-800' : 'text-stone-600 hover:bg-stone-100'
            }`}
            onClick={() => setTab(id)}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {error && <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
      {message && <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm">{message}</div>}

      <div className="p-5">
        {tab === 'general' && (
          <form onSubmit={saveProgram} className="space-y-4 max-w-2xl">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Color</label>
                <input type="color" className="h-10 w-full rounded border" value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Programa activo
                </label>
              </div>
            </div>
            <div>
              <label className="label">Ciclo activo</label>
              <select className="input" value={form.active_cycle_id}
                onChange={(e) => setForm({ ...form, active_cycle_id: Number(e.target.value) })}>
                <option value="">— Sin asignar —</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatCycleDate(c.startDate)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar general'}
            </button>
          </form>
        )}

        {tab === 'ciclos' && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Ciclo activo del programa. Los ciclos globales se administran en la sección inferior de esta pantalla.
            </p>
            <div className="bg-stone-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-stone-400 uppercase">Ciclo asignado</p>
              {form.active_cycle_id ? (() => {
                const c = cycles.find((x) => Number(x.id) === Number(form.active_cycle_id));
                return c ? (
                  <>
                    <p className="text-lg font-bold">{c.name}</p>
                    <p className="text-sm text-stone-500">
                      {formatCycleDate(c.startDate)} → {formatCycleDate(computeCycleEnd(c.startDate))}
                    </p>
                  </>
                ) : <p className="text-stone-500">Ciclo no encontrado</p>;
              })() : <p className="text-stone-500">Sin ciclo asignado</p>}
            </div>
            <select className="input max-w-md" value={form.active_cycle_id}
              onChange={(e) => setForm({ ...form, active_cycle_id: Number(e.target.value) })}>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({formatCycleDate(c.startDate)})</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={saveProgram}>Guardar ciclo activo</button>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-sm">
                <thead><tr className="text-left text-stone-500">
                  <th className="py-2">Ciclo</th><th>Inicio</th><th>Fin</th><th>Etiqueta</th>
                </tr></thead>
                <tbody>
                  {programCycles.map((c) => (
                    <tr key={c.id} className="border-t border-stone-100">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td>{formatCycleDate(c.startDate)}</td>
                      <td>{formatCycleDate(computeCycleEnd(c.startDate))}</td>
                      <td>{c.label || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'zoom' && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-xs text-stone-500">
              Las contraseñas Zoom se configuran en variables de entorno del servidor. Aquí solo se administra el correo asociado al programa.
            </p>
            {!form.zoom_accounts?.length ? (
              <div>
                <label className="label">Correo Zoom</label>
                <input className="input" value={form.zoom_email}
                  onChange={(e) => setForm({ ...form, zoom_email: e.target.value })}
                  placeholder="zoom@programa.com" />
                {zoomStatus.filter((z) => z.program_id === program.id).map((z) => (
                  <p key={z.account_id || z.email} className="text-xs mt-2 text-stone-500">
                    Estado API: {z.configured ? '✓ configurado' : '— sin credenciales env'}
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {form.zoom_accounts.map((acc, idx) => (
                  <div key={acc.id || idx} className="border border-slate-200 rounded-2xl p-4 space-y-2">
                    <input className="input" placeholder="Etiqueta" value={acc.label || ''}
                      onChange={(e) => updateZoomAccount(idx, 'label', e.target.value)} />
                    <input className="input" placeholder="Correo Zoom" value={acc.email || ''}
                      onChange={(e) => updateZoomAccount(idx, 'email', e.target.value)} />
                    <textarea className="input" rows={2} placeholder="Observaciones"
                      value={acc.observaciones || ''}
                      onChange={(e) => updateZoomAccount(idx, 'observaciones', e.target.value)} />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={acc.activo !== false}
                        onChange={(e) => updateZoomAccount(idx, 'activo', e.target.checked)} />
                      Activo
                    </label>
                  </div>
                ))}
                <button type="button" className="btn-secondary text-sm" onClick={addZoomAccount}>+ Cuenta Zoom</button>
              </div>
            )}
            <button type="button" className="btn-primary" onClick={saveProgram}>Guardar Zoom</button>
          </div>
        )}

        {tab === 'planes' && (
          <AdminPlans
            embedded
            mode="d28d"
            programId={program.id}
            hideProgramColumn
            title={`Planes — ${program.name}`}
          />
        )}
      </div>
    </div>
  );
}
