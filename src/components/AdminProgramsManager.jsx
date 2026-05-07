import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Save, ShieldCheck, Calendar, Info } from 'lucide-react';
import { CYCLES_DATA, formatCycleDate } from '../utils/cycleUtils';

export default function AdminProgramsManager() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showCycles, setShowCycles] = useState(false);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      setError('Error al cargar programas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleUpdate = async (id, updates) => {
    try {
      setSaving(true);
      await api.put(`/programs/${id}`, updates);
      setEditingId(null);
      await fetchPrograms();
    } catch (err) {
      setError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (program) => {
    setEditingId(program.id);
    setEditForm({ ...program });
  };

  if (loading) return <div className="p-8 text-center">Cargando programas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Gestión de Programas D28D</h2>
            <p className="text-stone-600">Configura las cuentas de Zoom y ciclos para Vital, Pancitas y Virtual.</p>
          </div>
        </div>
        <button 
          className="btn-secondary flex items-center gap-2"
          onClick={() => setShowCycles(!showCycles)}
        >
          <Calendar className="w-4 h-4" />
          {showCycles ? 'Ocultar Ciclos' : 'Ver Estructura de 13 Ciclos'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

      {showCycles && (
        <div className="card bg-stone-900 text-white p-6 border-none shadow-2xl mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-lime-400">
            <Calendar className="w-5 h-5" /> Estructura Anual: 13 Ciclos de 28 Días
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CYCLES_DATA.map((cycle) => (
              <div key={cycle.id} className={`p-4 rounded-2xl border ${cycle.id >= 7 ? 'border-lime-500 bg-lime-500/10' : 'border-white/10 bg-white/5'} transition-all`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Ciclo {cycle.id}</span>
                  {cycle.id === 7 && <span className="text-[10px] bg-lime-500 text-black px-2 py-0.5 rounded-full font-bold">INICIO FECHAS</span>}
                </div>
                <p className="text-xl font-black">{formatCycleDate(cycle.startDate)}</p>
                {cycle.label && <p className="text-xs text-lime-400 font-bold mt-1 uppercase">{cycle.label}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-stone-400 italic">
            <Info className="w-4 h-4" />
            <span>Los ciclos son de 4 semanas exactas (28 días). Las fechas proporcionadas inician desde el Ciclo 7.</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="card bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: program.color || '#ccc' }}></div>
                <h3 className="text-lg font-bold text-stone-900">{program.name}</h3>
              </div>
              <ShieldCheck className={`w-5 h-5 ${program.active ? 'text-lime-500' : 'text-slate-300'}`} />
            </div>

            <div className="space-y-4">
              {editingId === program.id ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-500 uppercase">Credenciales Zoom</label>
                  {program.zoom_accounts ? (
                    editForm.zoom_accounts.map((acc, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-stone-50 rounded-xl">
                        <input 
                          className="input text-xs" 
                          value={acc.email} 
                          onChange={(e) => {
                            const newAccs = [...editForm.zoom_accounts];
                            newAccs[idx].email = e.target.value;
                            setEditForm({ ...editForm, zoom_accounts: newAccs });
                          }}
                          placeholder="Email"
                        />
                        <input 
                          className="input text-xs" 
                          value={acc.password} 
                          onChange={(e) => {
                            const newAccs = [...editForm.zoom_accounts];
                            newAccs[idx].password = e.target.value;
                            setEditForm({ ...editForm, zoom_accounts: newAccs });
                          }}
                          placeholder="Password"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2 p-3 bg-stone-50 rounded-xl">
                      <input 
                        className="input text-xs" 
                        value={editForm.zoom_email} 
                        onChange={(e) => setEditForm({ ...editForm, zoom_email: e.target.value })}
                        placeholder="Email"
                      />
                      <input 
                        className="input text-xs" 
                        value={editForm.zoom_password} 
                        onChange={(e) => setEditForm({ ...editForm, zoom_password: e.target.value })}
                        placeholder="Password"
                      />
                    </div>
                  )}

                  <label className="text-xs font-bold text-stone-500 uppercase mt-4 block">Ciclo Activo</label>
                  <select 
                    className="input text-xs"
                    value={editForm.active_cycle_id || 7}
                    onChange={(e) => setEditForm({ ...editForm, active_cycle_id: Number(e.target.value) })}
                  >
                    {CYCLES_DATA.map(c => (
                      <option key={c.id} value={c.id}>
                        Ciclo {c.id} ({formatCycleDate(c.startDate)})
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 pt-4">
                    <button className="btn-primary w-full text-xs" onClick={() => handleUpdate(program.id, editForm)}>
                      <Save className="w-3 h-3 mr-1" /> Guardar Todo
                    </button>
                    <button className="btn-secondary w-full text-xs" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-1">Ciclo Actual</p>
                    <p className="text-xl font-black text-stone-800">
                      Ciclo {program.active_cycle_id || 7}
                    </p>
                    <p className="text-xs text-stone-500">
                      Inicia: {formatCycleDate(CYCLES_DATA.find(c => c.id === (program.active_cycle_id || 7))?.startDate)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Credenciales Zoom</p>
                    {program.zoom_accounts ? (
                      program.zoom_accounts.map((acc, idx) => (
                        <div key={idx} className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                          <p className="text-stone-600 font-medium truncate">{acc.email}</p>
                          <p className="text-stone-400 font-mono">Pass: {acc.password}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                        <p className="text-stone-600 font-medium truncate">{program.zoom_email}</p>
                        <p className="text-stone-400 font-mono">Pass: {program.zoom_password}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button 
                      className="btn-secondary w-full text-xs"
                      onClick={() => startEditing(program)}
                    >
                      Configurar Programa
                    </button>
                    <button 
                      className={`btn-card text-xs flex-shrink-0 ${program.active ? 'bg-red-50 text-red-600' : 'bg-lime-50 text-lime-600'}`}
                      onClick={() => handleUpdate(program.id, { active: !program.active })}
                      title={program.active ? 'Desactivar' : 'Activar'}
                    >
                      {program.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
