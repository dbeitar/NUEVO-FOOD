import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import RoutineTemplateEditor from '../routines/RoutineTemplateEditor';
import { emptyRoutine, routineFromApi } from '../../shared/routineTemplateConstants';

export default function D28dRoutinesMaster({ onBack, readOnly = false, variant = 'platform' }) {
  const isCoach = variant === 'coach';
  const [routines, setRoutines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyRoutine());
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const listParams = filterCategoria ? { categoria: filterCategoria } : {};
      if (isCoach) listParams.scope = 'coach';
      const [listRes, catRes] = await Promise.all([
        api.get('/d28d/routines', { params: listParams }),
        api.get('/d28d/routines/categories'),
      ]);
      setRoutines(listRes.data?.data || []);
      setCategories(catRes.data?.data || []);
    } catch {
      setError('No se pudo cargar el maestro de rutinas (requiere PostgreSQL).');
    } finally {
      setLoading(false);
    }
  }, [filterCategoria, isCoach]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = async (id) => {
    const res = await api.get(`/d28d/routines/${id}`);
    const data = res.data?.data;
    if (!data) return;
    setSelectedId(data.id);
    setForm(routineFromApi(data));
    if (data.root_id) {
      const hist = await api.get(`/d28d/routines/history/${data.root_id}`);
      setHistory(hist.data?.data || []);
    } else {
      setHistory([]);
    }
  };

  const handleSave = async (newVersion = false) => {
    if (readOnly) return;
    try {
      setSaving(true);
      setError('');
      const saveBody = {
        ...form,
        scope: form.scope || (isCoach ? 'coach_wl' : 'd28d_platform'),
      };
      if (selectedId) {
        await api.put(`/d28d/routines/${selectedId}`, { ...saveBody, new_version: newVersion });
      } else {
        const res = await api.post('/d28d/routines', saveBody);
        setSelectedId(res.data?.data?.id);
      }
      await loadList();
      if (selectedId) await loadDetail(selectedId);
    } catch (e) {
      setError(e.response?.data?.message || 'Error guardando rutina.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedId || readOnly) return;
    const res = await api.post(`/d28d/routines/${selectedId}/duplicate`);
    await loadList();
    await loadDetail(res.data?.data?.id);
  };

  const handleArchive = async () => {
    if (!selectedId || readOnly || !window.confirm('¿Archivar esta rutina?')) return;
    await api.post(`/d28d/routines/${selectedId}/archive`);
    await loadList();
    setSelectedId(null);
    setForm(emptyRoutine());
  };

  const handleImport = async () => {
    if (readOnly || !window.confirm('Importar plantillas D28D del catálogo base? (omite duplicados)')) return;
    const res = await api.post('/d28d/routines/import/bundled');
    const r = res.data?.data;
    alert(`Importación: ${r.created} creadas, ${r.skipped} omitidas.`);
    await loadList();
  };

  const addCategory = async () => {
    if (readOnly || !newCategory.trim()) return;
    await api.post('/d28d/routines/categories', { nombre: newCategory.trim() });
    setNewCategory('');
    await loadList();
  };

  const categoryOptions = useMemo(() => {
    const names = categories.map((c) => c.nombre);
    if (form.categoria && !names.includes(form.categoria)) names.push(form.categoria);
    return names;
  }, [categories, form.categoria]);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header panel-admin-header">
        <div>
          <button type="button" className="btn-secondary panel-back-btn" onClick={onBack}>
            {isCoach ? '← Entrenadores' : '← Maestros'}
          </button>
          <h2 className="d28d-page-title">
            {isCoach ? 'Mis rutinas de entrenamiento' : 'Maestro de Rutinas D28D'}
          </h2>
          <p className="d28d-text-muted">
            {isCoach
              ? 'Tus plantillas privadas: bloques, ejercicios y videos. No compartes catálogo con D28D.'
              : readOnly
                ? 'Vista de consulta. Las observaciones de sesión se registran en clases en vivo.'
                : 'Plantillas reutilizables (mismo modelo que Training). Versionado sin alterar clases ya programadas.'}
          </p>
        </div>
        {!readOnly && !isCoach && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn-secondary" onClick={handleImport}>Importar catálogo D28D</button>
            <button type="button" className="btn-primary" onClick={() => { setSelectedId(null); setForm(emptyRoutine()); setHistory([]); }}>
              Nueva rutina
            </button>
          </div>
        )}
        {!readOnly && isCoach && (
          <div className="flex gap-2 flex-wrap items-end">
            <button type="button" className="btn-primary" onClick={() => { setSelectedId(null); setForm(emptyRoutine({ scope: 'coach_wl' })); setHistory([]); }}>
              Nueva rutina
            </button>
          </div>
        )}
      </header>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="card p-4">
          <label className="block text-sm font-semibold mb-2">Filtrar categoría</label>
          <select className="input w-full mb-3" value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {!readOnly && (
            <div className="flex gap-2 mb-4">
              <input className="input flex-1 text-sm" placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <button type="button" className="btn-secondary text-sm" onClick={addCategory}>+</button>
            </div>
          )}
          {loading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {routines.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`w-full text-left rounded-xl border p-3 text-sm ${selectedId === r.id ? 'border-lime-500 bg-lime-50' : 'border-slate-200'}`}
                    onClick={() => loadDetail(r.id)}
                  >
                    <div className="font-semibold">{r.nombre}</div>
                    <div className="text-xs text-slate-500">
                      {r.categoria} · v{r.version}
                      {r.duracion ? ` · ${r.duracion}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card p-5 space-y-4">
          <RoutineTemplateEditor
            form={form}
            setForm={setForm}
            categoryOptions={categoryOptions}
            readOnly={readOnly}
          />

          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <button type="button" className="btn-primary" disabled={saving} onClick={() => handleSave(false)}>
                {selectedId ? 'Guardar cambios' : 'Crear rutina'}
              </button>
              {selectedId && (
                <>
                  <button type="button" className="btn-secondary" disabled={saving} onClick={() => handleSave(true)}>Nueva versión</button>
                  <button type="button" className="btn-secondary" onClick={handleDuplicate}>Duplicar</button>
                  <button type="button" className="btn-danger" onClick={handleArchive}>Archivar</button>
                </>
              )}
            </div>
          )}

          {history.length > 1 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Historial de versiones</h4>
              <ul className="text-sm space-y-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <button type="button" className="text-lime-700 underline" onClick={() => loadDetail(h.id)}>
                      v{h.version} — {h.nombre} {h.is_current ? '(actual)' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
