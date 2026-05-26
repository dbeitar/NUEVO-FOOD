import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { emitToast } from '../context/toast';

const emptyForm = {
  code: '',
  program_id: 'virtual_d28d',
  label: '',
  suggested_plan_nombre: '',
  module_preset: '{\n  "d28d": true,\n  "live_classes": true,\n  "d28d_program": "virtual_d28d"\n}',
  active: true,
};

export default function AdminProgramInvites({ onBack, embedded = false }) {
  const [invites, setInvites] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filterProgram, setFilterProgram] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchInvites = useCallback(async () => {
    try {
      const params = filterProgram ? { program_id: filterProgram } : {};
      const res = await api.get('/program-invites', { params });
      setInvites(res.data?.data || []);
    } catch {
      setError('Error cargando códigos de programa');
    } finally {
      setLoading(false);
    }
  }, [filterProgram]);

  const fetchMeta = useCallback(async () => {
    try {
      const [progRes, plansRes] = await Promise.all([
        api.get('/programs'),
        api.get('/accounts/plans', { params: { kind: 'd28d' } }),
      ]);
      setPrograms(progRes.data?.data || []);
      setPlans(plansRes.data || []);
    } catch {
      console.warn('Error cargando metadatos de invites');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const plansForProgram = (programId) => plans.filter(
    (p) => String(p.program_id) === String(programId),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let module_preset = {};
    try {
      module_preset = JSON.parse(form.module_preset || '{}');
    } catch {
      setError('module_preset debe ser JSON válido');
      return;
    }
    const payload = {
      code: form.code,
      program_id: form.program_id,
      label: form.label,
      suggested_plan_nombre: form.suggested_plan_nombre || null,
      module_preset,
      active: !!form.active,
    };
    try {
      if (editingCode) {
        await api.put(`/program-invites/${editingCode}`, payload);
        emitToast({ type: 'success', title: 'Código actualizado' });
      } else {
        await api.post('/program-invites', payload);
        emitToast({ type: 'success', title: 'Código creado' });
      }
      setShowForm(false);
      setEditingCode(null);
      setForm(emptyForm);
      fetchInvites();
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando código');
    }
  };

  const startEdit = (inv) => {
    setEditingCode(inv.code);
    setForm({
      code: inv.code,
      program_id: inv.program_id,
      label: inv.label || '',
      suggested_plan_nombre: inv.suggested_plan_nombre || '',
      module_preset: JSON.stringify(inv.module_preset || {}, null, 2),
      active: inv.active !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`¿Eliminar código ${code}?`)) return;
    try {
      await api.delete(`/program-invites/${code}`);
      emitToast({ type: 'success', title: 'Código eliminado' });
      fetchInvites();
    } catch {
      setError('No se pudo eliminar el código');
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Volver
            </button>
          )}
          <h3 className="text-lg font-bold text-stone-900">Códigos de invitación por programa</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => {
              setEditingCode(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo código
          </button>
        )}
      </div>
      )}

      {error && (
        <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-md text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="label mb-0">Filtrar programa</label>
        <select
          className="input max-w-xs"
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
        >
          <option value="">Todos</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {showForm ? (
        <div className="card space-y-4">
          <h4 className="font-semibold">{editingCode ? 'Editar código' : 'Crear código'}</h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Código</label>
              <input
                className="input font-mono"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={!!editingCode}
                required
              />
            </div>
            <div>
              <label className="label">Programa</label>
              <select
                className="input"
                value={form.program_id}
                onChange={(e) => setForm({
                  ...form,
                  program_id: e.target.value,
                  suggested_plan_nombre: '',
                })}
                required
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Etiqueta</label>
              <input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div>
              <label className="label">Plan sugerido</label>
              <select
                className="input"
                value={form.suggested_plan_nombre}
                onChange={(e) => setForm({ ...form, suggested_plan_nombre: e.target.value })}
              >
                <option value="">Ninguno</option>
                {plansForProgram(form.program_id).map((pl) => (
                  <option key={pl.nombre} value={pl.nombre}>{pl.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">module_preset (JSON)</label>
              <textarea
                className="input font-mono text-xs"
                rows={6}
                value={form.module_preset}
                onChange={(e) => setForm({ ...form, module_preset: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Activo
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Programa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Plan sugerido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Cargando…</td></tr>
              ) : invites.length ? invites.map((inv) => (
                <tr key={inv.code}>
                  <td className="px-4 py-3 font-mono text-sm">{inv.code}</td>
                  <td className="px-4 py-3 text-sm">{programs.find((p) => p.id === inv.program_id)?.name || inv.program_id}</td>
                  <td className="px-4 py-3 text-sm">{inv.suggested_plan_nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm">{inv.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="p-2 rounded-lg bg-stone-100" onClick={() => startEdit(inv)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-2 rounded-lg bg-red-600 text-white" onClick={() => handleDelete(inv.code)} title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin códigos. Crea uno o ejecuta hydrate para seeds.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
