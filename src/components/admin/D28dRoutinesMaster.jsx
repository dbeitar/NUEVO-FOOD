import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const BLOCK_TYPES = [
  'REST_PAUSE', 'TABATA', 'HIIT', 'AMRAP', 'EMOM', 'SUPER_SET', 'BLOQUE_LIBRE',
];

const BLOCK_LABELS = {
  REST_PAUSE: 'Rest-Pause',
  TABATA: 'Tabata',
  HIIT: 'HIIT',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  SUPER_SET: 'Super Set',
  BLOQUE_LIBRE: 'Bloque libre',
};

const emptyExercise = () => ({
  nombre: '',
  orden: 0,
  repeticiones: '',
  duracion: '',
  descanso: '',
  observaciones: '',
  video_url: '',
  imagen_url: '',
});

const emptyBlock = (orden = 0) => ({
  tipo: 'BLOQUE_LIBRE',
  orden,
  nombre: '',
  config: {},
  exercises: [emptyExercise()],
});

const emptyRoutine = () => ({
  nombre: '',
  categoria: 'Full Body',
  subcategoria: '',
  nivel: 'intermedio',
  descripcion: '',
  estado: 'activa',
  blocks: [emptyBlock(0)],
});

export default function D28dRoutinesMaster({ onBack }) {
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
      const [listRes, catRes] = await Promise.all([
        api.get('/d28d/routines', { params: filterCategoria ? { categoria: filterCategoria } : {} }),
        api.get('/d28d/routines/categories'),
      ]);
      setRoutines(listRes.data?.data || []);
      setCategories(catRes.data?.data || []);
    } catch {
      setError('No se pudo cargar el maestro de rutinas (requiere PostgreSQL).');
    } finally {
      setLoading(false);
    }
  }, [filterCategoria]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = async (id) => {
    const res = await api.get(`/d28d/routines/${id}`);
    const data = res.data?.data;
    if (!data) return;
    setSelectedId(data.id);
    setForm({
      nombre: data.nombre,
      categoria: data.categoria,
      subcategoria: data.subcategoria || '',
      nivel: data.nivel || '',
      descripcion: data.descripcion || '',
      estado: data.estado,
      blocks: (data.blocks || []).map((b, i) => ({
        ...b,
        orden: b.orden ?? i,
        exercises: (b.exercises || []).map((ex, j) => ({ ...ex, orden: ex.orden ?? j })),
      })),
    });
    if (data.root_id) {
      const hist = await api.get(`/d28d/routines/history/${data.root_id}`);
      setHistory(hist.data?.data || []);
    } else {
      setHistory([]);
    }
  };

  const handleSave = async (newVersion = false) => {
    try {
      setSaving(true);
      setError('');
      const payload = { ...form, new_version: newVersion };
      if (selectedId) {
        await api.put(`/d28d/routines/${selectedId}`, payload);
      } else {
        const res = await api.post('/d28d/routines', form);
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
    if (!selectedId) return;
    const res = await api.post(`/d28d/routines/${selectedId}/duplicate`);
    await loadList();
    await loadDetail(res.data?.data?.id);
  };

  const handleArchive = async () => {
    if (!selectedId || !window.confirm('¿Archivar esta rutina?')) return;
    await api.post(`/d28d/routines/${selectedId}/archive`);
    await loadList();
    setSelectedId(null);
    setForm(emptyRoutine());
  };

  const handleImport = async () => {
    if (!window.confirm('Importar plantillas D28D del catálogo base? (omite duplicados)')) return;
    const res = await api.post('/d28d/routines/import/bundled');
    const r = res.data?.data;
    alert(`Importación: ${r.created} creadas, ${r.skipped} omitidas.`);
    await loadList();
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await api.post('/d28d/routines/categories', { nombre: newCategory.trim() });
    setNewCategory('');
    await loadList();
  };

  const updateBlock = (idx, patch) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      blocks[idx] = { ...blocks[idx], ...patch };
      return { ...prev, blocks };
    });
  };

  const updateExercise = (bIdx, eIdx, patch) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const exercises = [...(blocks[bIdx].exercises || [])];
      exercises[eIdx] = { ...exercises[eIdx], ...patch };
      blocks[bIdx] = { ...blocks[bIdx], exercises };
      return { ...prev, blocks };
    });
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
            ← Maestros
          </button>
          <h2 className="d28d-page-title">Maestro de Rutinas D28D</h2>
          <p className="d28d-text-muted">
            Plantillas reutilizables para clases en vivo. Evolución sin destrucción: la programación manual sigue disponible.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-secondary" onClick={handleImport}>Importar catálogo D28D</button>
          <button type="button" className="btn-primary" onClick={() => { setSelectedId(null); setForm(emptyRoutine()); setHistory([]); }}>
            Nueva rutina
          </button>
        </div>
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
          <div className="flex gap-2 mb-4">
            <input className="input flex-1 text-sm" placeholder="Nueva categoría" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button type="button" className="btn-secondary text-sm" onClick={addCategory}>+</button>
          </div>
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
                    <div className="text-xs text-slate-500">{r.categoria} · v{r.version}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold">Nombre</span>
              <input className="input w-full" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Categoría</span>
              <select className="input w-full" value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Subcategoría</span>
              <input className="input w-full" value={form.subcategoria} onChange={(e) => setForm((p) => ({ ...p, subcategoria: e.target.value }))} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Nivel</span>
              <input className="input w-full" value={form.nivel} onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Descripción</span>
            <textarea className="input w-full min-h-[80px]" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
          </label>

          <h3 className="font-bold text-lg">Bloques</h3>
          {form.blocks.map((block, bIdx) => (
            <div key={bIdx} className="rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block sm:col-span-1">
                  <span className="text-xs font-semibold">Tipo</span>
                  <select className="input w-full" value={block.tipo} onChange={(e) => updateBlock(bIdx, { tipo: e.target.value })}>
                    {BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold">Nombre bloque</span>
                  <input className="input w-full" value={block.nombre || ''} onChange={(e) => updateBlock(bIdx, { nombre: e.target.value })} />
                </label>
              </div>
              {(block.exercises || []).map((ex, eIdx) => (
                <div key={eIdx} className="grid sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                  <input className="input" placeholder="Ejercicio" value={ex.nombre} onChange={(e) => updateExercise(bIdx, eIdx, { nombre: e.target.value })} />
                  <input className="input" placeholder="Reps" value={ex.repeticiones || ''} onChange={(e) => updateExercise(bIdx, eIdx, { repeticiones: e.target.value })} />
                  <input className="input" placeholder="Duración" value={ex.duracion || ''} onChange={(e) => updateExercise(bIdx, eIdx, { duracion: e.target.value })} />
                  <input className="input" placeholder="Descanso" value={ex.descanso || ''} onChange={(e) => updateExercise(bIdx, eIdx, { descanso: e.target.value })} />
                  <input className="input sm:col-span-2" placeholder="Video URL" value={ex.video_url || ''} onChange={(e) => updateExercise(bIdx, eIdx, { video_url: e.target.value })} />
                </div>
              ))}
              <button type="button" className="btn-secondary text-sm" onClick={() => updateBlock(bIdx, { exercises: [...(block.exercises || []), emptyExercise()] })}>
                + Ejercicio
              </button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setForm((p) => ({ ...p, blocks: [...p.blocks, emptyBlock(p.blocks.length)] }))}>
            + Bloque
          </button>

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
