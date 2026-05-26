import { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';
import { useAuth } from '../context/useAuth';

export default function Recipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useI18n();

  // AI Generator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({
    mealType: 'Almuerzo',
    ingredients: '',
    preferences: ''
  });
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  // Detalle de receta
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState(null);
  const [detailPortions, setDetailPortions] = useState(1);
  const canManageRecipeBase = user?.rol === 'super_admin' || user?.roles?.includes('super_admin');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const res = await api.get('/recipes');
      setRecipes(res.data.data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/recipes/search?query=${searchTerm}`);
      setRecipes(res.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAiRecipe = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/ai/generate-recipe', {
        mealType: aiForm.mealType,
        ingredients: aiForm.ingredients.split(',').map(i => i.trim()),
        preferences: aiForm.preferences
      });
      if (res.data.success) {
        setAiResult(res.data.recipe);
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Error al generar la receta. Intenta de nuevo.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">{t('recipes.library_title', 'Biblioteca de recetas')}</h2>
          <div className="flex gap-2">
            {import.meta.env.VITE_ENABLE_RECIPE_MOCK === 'true' && (
              <button className="inline-flex items-center justify-center px-4 py-2 rounded-2xl font-medium bg-white text-stone-700 border border-slate-300 hover:bg-slate-100 transition-colors" onClick={() => setShowAiModal(true)}>
                {t('recipes.ai_button', 'Chef IA')}
              </button>
            )}
            {canManageRecipeBase && (
              <button className="inline-flex items-center justify-center px-4 py-2 rounded-2xl font-medium bg-white text-stone-700 border border-slate-300 hover:bg-slate-100 transition-colors" onClick={() => setShowImport(true)}>
                {t('recipes.import_add', 'Agregar')}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <input
              type="text"
              placeholder={t('recipes.search_ph', 'Buscar recetas (ej. Pollo, Keto...)')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
            />
            <button type="submit" className="inline-flex items-center justify-center px-4 py-2 rounded-2xl font-medium bg-lime-500 text-black hover:bg-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400">
              {t('recipes.search', 'Buscar')}
            </button>
          </form>
        </div>

      {showImport && (
        <div className="form-modal-overlay" onClick={() => !importBusy && setShowImport(false)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: 840}}>
            <button className="policy-close-btn" onClick={() => !importBusy && setShowImport(false)}>✕</button>
            <h3>{t('recipes.import_replace', 'Reemplazar biblioteca')}</h3>
            <p className="text-sm text-stone-600">{t('recipes.import_help', 'Pega una tabla con columnas: ID Receta, Nombre del Plato, Ingredientes Clave (IDs), Cal Totales, Proteína T, Carbos T, Grasas T. Se admiten secciones como "--Desayunos...---ID Receta..."')}</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t('recipes.import_ph', 'Pega aquí las recetas...')}
              className="w-full h-64 p-3 rounded-2xl border border-slate-300"
            />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" disabled={importBusy} onClick={() => setShowImport(false)}>{t('common.cancel', 'Cancelar')}</button>
              <button
                className="btn-secondary"
                disabled={importBusy || !importText.trim()}
                onClick={async () => {
                  const raw = importText.trim();
                  const toNumber = (v) => {
                    if (typeof v !== 'string') return Number(v) || 0;
                    return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                  };
                    const splitCsv = (line) => {
                    const out = [];
                    let cur = '';
                    let inQ = false;
                    for (let i = 0; i < line.length; i++) {
                      const ch = line[i];
                      if (ch === '"') {
                        inQ = !inQ;
                        continue;
                      }
                      if (ch === ',' && !inQ) {
                        out.push(cur.trim());
                        cur = '';
                      } else {
                        cur += ch;
                      }
                    }
                    out.push(cur.trim());
                    return out;
                  };
                  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                  let section = null;
                  const items = [];
                  for (const line of lines) {
                    const lower = line.toLowerCase();
                    if (lower.includes('id receta')) {
                      const idx = lower.indexOf('id receta');
                      const before = line.slice(0, idx).replace(/[-–—]/g, '').trim();
                      if (before) section = before;
                      continue;
                    }
                    if (/^[-–—]/.test(line)) {
                      const clean = line.replace(/[-–—]/g, '').trim();
                      if (clean) section = clean;
                      continue;
                    }
                    if (!/^[r]\d+/i.test(line)) continue;
                    const cols = splitCsv(line);
                    if (cols.length < 7) continue;
                    const [codigo, nombre, ingStr, cal, prot, carb, gras] = cols;
                    if (!nombre) continue;
                    const ingList = (ingStr || '')
                      .replace(/^"|"$|^'|'$/g, '')
                      .split(',')
                      .map(s => s.trim())
                      .map(s => s.replace(/\s*\([^)]*\)\s*/g, '').trim())
                      .filter(Boolean);
                    items.push({
                      codigo: codigo || null,
                      nombre,
                      ingredientes: ingList,
                      macros: {
                        calorias: toNumber(cal),
                        proteina: toNumber(prot),
                        carbohidratos: toNumber(carb),
                        grasas: toNumber(gras),
                      },
                      tags: section ? [section] : []
                    });
                  }
                  if (items.length === 0) {
                    alert(t('recipes.import_parse_error', 'No se encontraron filas válidas.'));
                    return;
                  }
                  try {
                    setImportBusy(true);
                    const resp = await api.post('/recipes/import', { items, mode: 'add' });
                    if (resp?.data?.success) {
                      alert(t('recipes.import_done_add', '✅ Recetas agregadas'));
                      setShowImport(false);
                      setImportText('');
                      await fetchRecipes();
                    } else {
                      alert(t('recipes.import_error', '❌ Error al importar recetas'));
                    }
                  } catch {
                    alert(t('recipes.import_error', '❌ Error al importar recetas'));
                  } finally {
                    setImportBusy(false);
                  }
                }}
              >
                {importBusy ? t('common.loading', 'Cargando...') : t('recipes.import_add', 'Agregar')}
              </button>
              <button
                className="btn-primary"
                disabled={importBusy || !importText.trim()}
                onClick={async () => {
                  const raw = importText.trim();
                  const toNumber = (v) => {
                    if (typeof v !== 'string') return Number(v) || 0;
                    return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                  };
                    const splitCsv = (line) => {
                    const out = [];
                    let cur = '';
                    let inQ = false;
                    for (let i = 0; i < line.length; i++) {
                      const ch = line[i];
                      if (ch === '"') {
                        inQ = !inQ;
                        continue;
                      }
                      if (ch === ',' && !inQ) {
                        out.push(cur.trim());
                        cur = '';
                      } else {
                        cur += ch;
                      }
                    }
                    out.push(cur.trim());
                    return out;
                  };
                  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                  let section = null;
                  const items = [];
                  for (const line of lines) {
                    const lower = line.toLowerCase();
                    if (lower.includes('id receta')) {
                      const idx = lower.indexOf('id receta');
                      const before = line.slice(0, idx).replace(/[-–—]/g, '').trim();
                      if (before) section = before;
                      continue;
                    }
                    if (/^[-–—]/.test(line)) {
                      const clean = line.replace(/[-–—]/g, '').trim();
                      if (clean) section = clean;
                      continue;
                    }
                    if (!/^[r]\d+/i.test(line)) continue;
                    const cols = splitCsv(line);
                    if (cols.length < 7) continue;
                    const [codigo, nombre, ingStr, cal, prot, carb, gras] = cols;
                    if (!nombre) continue;
                    const ingList = (ingStr || '')
                      .replace(/^"|"$|^'|'$/g, '')
                      .split(',')
                      .map(s => s.trim())
                      .map(s => s.replace(/\s*\([^)]*\)\s*/g, '').trim())
                      .filter(Boolean);
                    items.push({
                      codigo: codigo || null,
                      nombre,
                      ingredientes: ingList,
                      macros: {
                        calorias: toNumber(cal),
                        proteina: toNumber(prot),
                        carbohidratos: toNumber(carb),
                        grasas: toNumber(gras),
                      },
                      tags: section ? [section] : []
                    });
                  }
                  if (items.length === 0) {
                    alert(t('recipes.import_parse_error', 'No se encontraron filas válidas.'));
                    return;
                  }
                  try {
                    setImportBusy(true);
                    const resp = await api.post('/recipes/import', { items, mode: 'replace' });
                    if (resp?.data?.success) {
                      alert(t('recipes.import_done', '✅ Recetas reemplazadas'));
                      setShowImport(false);
                      setImportText('');
                      await fetchRecipes();
                    } else {
                      alert(t('recipes.import_error', '❌ Error al importar recetas'));
                    }
                  } catch {
                    alert(t('recipes.import_error', '❌ Error al importar recetas'));
                  } finally {
                    setImportBusy(false);
                  }
                }}
              >
                {importBusy ? t('common.loading', 'Cargando...') : t('recipes.import_replace', 'Reemplazar biblioteca')}
              </button>
            </div>
          </div>
        </div>
      )}

        {loading ? (
          <div className="text-stone-600">{t('recipes.loading', 'Cargando recetas...')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.length > 0 ? recipes.map(recipe => (
              <div key={recipe.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:scale-[1.02] transition-transform duration-200 cursor-default">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-stone-900">{recipe.nombre}</h3>
                  <span className="text-sm text-stone-600">⏱ {recipe.tiempo_preparacion}</span>
                </div>
                <p className="text-sm text-stone-600 mb-3">{recipe.descripcion}</p>
                <div className="flex items-center gap-4 text-sm text-stone-700 mb-3">
                  <span>🔥 {recipe.macros?.calorias} kcal</span>
                  <span>🥩 {recipe.macros?.proteina}g</span>
                  <span>🍚 {recipe.macros?.carbohidratos}g</span>
                  <span>🧈 {recipe.macros?.grasas}g</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {recipe.tags?.map((tag, i) => <span key={i} className="px-2 py-1 rounded-xl bg-slate-100 text-stone-700 text-xs">{tag}</span>)}
                </div>
                <button
                  className="inline-flex items-center justify-center px-4 py-2 rounded-2xl font-medium bg-white text-stone-700 border border-slate-300 hover:bg-slate-100 transition-colors"
                  onClick={() => { setDetailRecipe(recipe); setDetailPortions(1); setDetailOpen(true); }}
                >
                  {t('recipes.view', 'Ver Detalles')}
                </button>
              </div>
            )) : (
              <p className="text-stone-500 italic">{t('recipes.none', 'No se encontraron recetas.')}</p>
            )}
          </div>
        )}

      {/* Modal Detalle */}
      {detailOpen && detailRecipe && (
        <div className="policy-modal-overlay" onClick={() => setDetailOpen(false)}>
          <div className="policy-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <button className="policy-close-btn" onClick={() => setDetailOpen(false)}>✕</button>
            <div className="flex flex-col md:flex-row gap-6">
              {detailRecipe.imagen && (
                <img src={detailRecipe.imagen} alt={detailRecipe.nombre} style={{ maxWidth: 260, borderRadius: 16 }} />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-stone-900">{detailRecipe.nombre}</h3>
                  <div className="text-sm text-stone-600">⏱ {detailRecipe.tiempo_preparacion} · {detailRecipe.dificultad || '—'}</div>
                </div>
                {detailRecipe.descripcion && <p className="text-stone-700 mt-1">{detailRecipe.descripcion}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(detailRecipe.tags || []).map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-xl bg-slate-100 text-stone-700 text-xs">{tag}</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(() => {
                    const m = detailRecipe.macros || {};
                    const p = Math.max(1, Number(detailPortions) || 1);
                    const fmt = (v) => v != null ? Math.round(v * p) : 0;
                    return (
                      <>
                        <div className="p-3 bg-stone-50 rounded-2xl border border-slate-200 text-sm">
                          <div className="text-stone-600 mb-1">Calorías</div>
                          <div className="text-stone-900 font-semibold">🔥 {fmt(m.calorias)} kcal</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-2xl border border-slate-200 text-sm">
                          <div className="text-stone-600 mb-1">Proteína</div>
                          <div className="text-stone-900 font-semibold">🥩 {fmt(m.proteina)} g</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-2xl border border-slate-200 text-sm">
                          <div className="text-stone-600 mb-1">Carbohidratos</div>
                          <div className="text-stone-900 font-semibold">🍚 {fmt(m.carbohidratos)} g</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-2xl border border-slate-200 text-sm">
                          <div className="text-stone-600 mb-1">Grasas</div>
                          <div className="text-stone-900 font-semibold">🧈 {fmt(m.grasas)} g</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-stone-700 mb-1">{t('recipes.portions', 'Porciones')}</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={detailPortions}
                    onChange={(e) => setDetailPortions(e.target.value)}
                    className="w-32 px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-stone-900 mb-2">{t('recipes.ingredients', 'Ingredientes')}</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {(detailRecipe.ingredientes || []).map((ing, i) => {
                    if (typeof ing === 'string') return <li key={i}>{ing}</li>;
                    const p = Math.max(1, Number(detailPortions) || 1);
                    const cant = (typeof ing.cantidad === 'number') ? (ing.cantidad * p) : ing.cantidad;
                    return <li key={i}>{cant} {ing.unidad || ''} {ing.nombre || ''}</li>;
                  })}
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-stone-900 mb-2">{t('recipes.steps', 'Preparación')}</h4>
                {Array.isArray(detailRecipe.instrucciones) && detailRecipe.instrucciones.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-1">
                    {detailRecipe.instrucciones.map((st, i) => <li key={i}>{st}</li>)}
                  </ol>
                ) : (
                  <p className="text-stone-600">{t('recipes.no_steps', 'Sin instrucciones detalladas')}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setDetailOpen(false)}>{t('common.close', 'Cerrar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {showAiModal && (
        <div className="form-modal-overlay">
          <div className="form-modal" style={{ padding: '1.25rem' }}>
            <button className="policy-close-btn" onClick={() => setShowAiModal(false)}>✕</button>
            <h3>{t('recipes.ai_title', '👨‍🍳 Chef Inteligente')}</h3>
            
            {!aiResult ? (
              <form onSubmit={generateAiRecipe}>
                <div className="form-group">
                  <label>{t('recipes.ai_type', 'Tipo de Comida')}</label>
                  <select 
                    value={aiForm.mealType}
                    onChange={e => setAiForm({...aiForm, mealType: e.target.value})}
                  >
                    <option>Desayuno</option>
                    <option>Almuerzo</option>
                    <option>Cena</option>
                    <option>Snack</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('recipes.ai_ingredients', 'Ingredientes disponibles (separados por coma)')}</label>
                  <input 
                    placeholder="Ej: Pollo, arroz, tomate"
                    value={aiForm.ingredients}
                    onChange={e => setAiForm({...aiForm, ingredients: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('recipes.ai_prefs', 'Preferencias / Restricciones')}</label>
                  <input 
                    placeholder="Ej: Sin gluten, Keto, Picante..."
                    value={aiForm.preferences}
                    onChange={e => setAiForm({...aiForm, preferences: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={aiLoading}>
                  {aiLoading ? t('recipes.ai_cooking', '🍳 Cocinando idea...') : t('recipes.ai_generate', '✨ Generar Receta')}
                </button>
              </form>
            ) : (
              <div className="ai-result">
                <h4>{aiResult.nombre}</h4>
                <p><em>{aiResult.descripcion}</em></p>
                <div className="ai-details">
                  <p><strong>Tiempo:</strong> {aiResult.tiempo_preparacion}</p>
                  <p><strong>Dificultad:</strong> {aiResult.dificultad}</p>
                </div>
                
                <h5>Ingredientes:</h5>
                <ul>
                  {aiResult.ingredientes.map((ing, i) => (
                    <li key={i}>{ing.cantidad} {ing.nombre}</li>
                  ))}
                </ul>

                <h5>Instrucciones:</h5>
                <ol>
                  {aiResult.instrucciones.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>

                <div className="macros-box">
                  <p>Calorías: {aiResult.macros.calorias}</p>
                  <p>Proteína: {aiResult.macros.proteina}g</p>
                  <p>Carbs: {aiResult.macros.carbohidratos}g</p>
                  <p>Grasas: {aiResult.macros.grasas}g</p>
                </div>

                <button className="btn-secondary" onClick={() => setAiResult(null)}>Generar Otra</button>
              </div>
            )}
          </div>
        </div>
      )}

      {canManageRecipeBase && (
      <div className="add-link">
        <h3>{t('recipes.add_link_title', 'Agregar enlace de receta')}</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const name = e.currentTarget.name.value.trim();
          const url = e.currentTarget.url.value.trim();
          const tags = e.currentTarget.tags.value.split(',').map(s => s.trim()).filter(Boolean);
          if (!name || !url) return;
          try {
            const res = await api.post('/recipes', { nombre: name, url, tags });
            if (res?.data?.success) {
              setRecipes(prev => [res.data.recipe, ...prev]);
              e.currentTarget.reset();
            } else {
              setRecipes(prev => prev);
            }
          } catch {
            alert('No fue posible guardar el enlace');
          }
        }}>
          <input name="name" placeholder={t('recipes.link_name', 'Nombre')} />
          <input name="url" placeholder={t('recipes.link_url', 'URL')} />
          <input name="tags" placeholder={t('recipes.link_tags', 'Etiquetas (coma separadas)')} />
          <button type="submit" className="btn-primary">{t('recipes.add_link', 'Agregar')}</button>
        </form>
      </div>
      )}
    </div>
    </div>
  );
}
