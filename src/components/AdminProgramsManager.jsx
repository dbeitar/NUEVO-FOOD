import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Save, ShieldCheck } from 'lucide-react';

export default function AdminProgramsManager() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

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
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Settings className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Gestión de Programas D28D</h2>
          <p className="text-stone-600">Configura las cuentas de Zoom y planes específicos para cada programa.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

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
                  <div className="flex gap-2">
                    <button className="btn-primary w-full text-xs" onClick={() => handleUpdate(program.id, editForm)}>
                      <Save className="w-3 h-3 mr-1" /> Guardar
                    </button>
                    <button className="btn-secondary w-full text-xs" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {program.zoom_accounts ? (
                    program.zoom_accounts.map((acc, idx) => (
                      <div key={idx} className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-stone-700">Zoom Account {idx + 1}</p>
                        <p className="text-stone-600">User: {acc.email}</p>
                        <p className="text-stone-400">Pass: {acc.password}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-stone-700">Zoom Principal</p>
                      <p className="text-stone-600">User: {program.zoom_email}</p>
                      <p className="text-stone-400">Pass: {program.zoom_password}</p>
                    </div>
                  )}

                  <div className="pt-4 flex gap-2">
                    <button 
                      className="btn-secondary w-full text-xs"
                      onClick={() => startEditing(program)}
                    >
                      Editar Credenciales
                    </button>
                    <button 
                      className={`btn-card text-xs ${program.active ? 'bg-red-50 text-red-600' : 'bg-lime-50 text-lime-600'}`}
                      onClick={() => handleUpdate(program.id, { active: !program.active })}
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
