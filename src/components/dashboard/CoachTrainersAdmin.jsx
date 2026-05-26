import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import InviteCodeCell from '../admin/InviteCodeCell';

const emptyForm = () => ({
  nombre: '',
  email: '',
  telefono: '',
  especialidad: 'Entrenamiento personalizado',
});

export default function CoachTrainersAdmin({ onBack = null }) {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/trainers');
      setTrainers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch {
      setError('No se pudo cargar entrenadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveInviteCode = async (trainerId, code) => {
    const { data } = await api.put(`/trainers/${trainerId}`, { invite_code: code });
    const updated = data.trainer || data;
    setTrainers((prev) => prev.map((t) => (t.id === trainerId ? { ...t, invite_code: updated.invite_code } : t)));
    return updated.invite_code;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim() || !form.email?.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/trainers', {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono?.trim() || null,
        especialidad: form.especialidad?.trim() || null,
      });
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear entrenador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header panel-admin-header">
        <div>
          {onBack && (
            <button type="button" className="btn-secondary panel-back-btn" onClick={onBack}>
              ← Panel Entrenadores
            </button>
          )}
          <h2 className="d28d-page-title">Admin de entrenadores</h2>
          <p className="d28d-text-muted">
            Crea coaches, asigna su código de vinculación y gestiona solo los usuarios que pertenecen a un entrenador.
          </p>
        </div>
      </header>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleCreate} className="card p-5 mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">Nombre</span>
          <input className="input mt-1 w-full" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input className="input mt-1 w-full" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Teléfono</span>
          <input className="input mt-1 w-full" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Especialidad</span>
          <input className="input mt-1 w-full" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
        </label>
        <div className="md:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : '+ Crear entrenador'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-900">Entrenadores activos</h3>
        </div>
        {loading ? (
          <p className="p-6 text-stone-500 text-sm">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Código invitación</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((tr) => (
                  <tr key={tr.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium">{tr.nombre}</td>
                    <td className="px-4 py-3 text-stone-600">{tr.email}</td>
                    <td className="px-4 py-3">
                      <InviteCodeCell
                        value={tr.invite_code}
                        onSave={(code) => saveInviteCode(tr.id, code)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
