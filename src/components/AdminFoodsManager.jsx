import { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

export default function AdminFoodsManager() {
  const [foods, setFoods] = useState([]);
  const [stats, setStats] = useState({ total: 0, byCategory: {} });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    nombre: '',
    barcode: '',
    categoria: '',
    marca: '',
    cantidad: '',
    unidad: 'g',
    calorias: '',
    proteina: '',
    carbohidratos: '',
    grasas: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadFoods(1, pageSize);
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFoods = async (pageToLoad = page, size = pageSize) => {
    try {
      const endpoint = (searchQuery || selectedCategory) ? '/foods/search' : '/foods';
      const params = { page: pageToLoad, pageSize: size };
      if (searchQuery) params.query = searchQuery;
      if (selectedCategory) params.categoria = selectedCategory;
      const response = await api.get(endpoint, { params });
      setFoods(response.data.data || []);
      setTotal(response.data.total || (response.data.data || []).length || 0);
      setPage(response.data.page || pageToLoad);
      setPageSize(response.data.pageSize || size);
      // cargar stats en paralelo
      try {
        const statsResp = await api.get('/foods/stats');
        setStats({
          total: statsResp.data.total || 0,
          byCategory: statsResp.data.byCategory || {},
        });
      } catch (e) {
        console.error('Error cargando estadísticas de alimentos:', e);
      }
    } catch (error) {
      console.error('Error cargando alimentos:', error);
    }
  };

  // Reactualizar al cambiar filtros
  useEffect(() => {
    // Reiniciar a página 1 cuando cambian filtros
    loadFoods(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/foods/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.categoria || !formData.cantidad || !formData.unidad) {
      setMessage(t('foods.form_required', '❌ Por favor completa todos los campos requeridos'));
      return;
    }

    try {
      if (editingId) {
        // Actualizar
        await api.put(`/foods/${editingId}`, formData);
        setMessage(t('foods.updated_ok', '✅ Alimento actualizado exitosamente'));
      } else {
        // Crear
        await api.post('/foods', formData);
        setMessage(t('foods.created_ok', '✅ Alimento creado exitosamente'));
      }

      resetForm();
      loadFoods();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(t('foods.save_error', '❌ Error al guardar alimento'));
      console.error('Error:', error);
    }
  };

  const handleEdit = (food) => {
    setEditingId(food.id);
    setFormData({
      nombre: food.nombre,
      barcode: food.barcode || '',
      categoria: food.categoria,
      marca: food.marca || '',
      cantidad: food.cantidad.toString(),
      unidad: food.unidad,
      calorias: food.calorias.toString(),
      proteina: food.proteina.toString(),
      carbohidratos: food.carbohidratos.toString(),
      grasas: food.grasas.toString(),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('foods.delete_confirm', '¿Estás seguro que deseas eliminar este alimento?'))) {
      try {
        await api.delete(`/foods/${id}`);
        setMessage(t('foods.deleted_ok', '✅ Alimento eliminado exitosamente'));
        loadFoods();
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        setMessage(t('foods.delete_error', '❌ Error al eliminar alimento'));
        console.error('Error:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      barcode: '',
      categoria: '',
      marca: '',
      cantidad: '',
      unidad: 'g',
      calorias: '',
      proteina: '',
      carbohidratos: '',
      grasas: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // flujo de importación removido al no estar en uso

  // Filtrar alimentos (sobre la página actual)
  let filteredFoods = foods;
  if (searchQuery) {
    filteredFoods = filteredFoods.filter((food) =>
      food.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (selectedCategory) {
    filteredFoods = filteredFoods.filter((food) => food.categoria === selectedCategory);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 font-['Playfair_Display']">{t('foods.title', 'Catálogo de Alimentos')}</h2>
          <p className="text-stone-600">{t('foods.subtitle', 'Administra el catálogo de alimentos con valores nutricionales.')}</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors">
              {t('foods.new', 'Nuevo Alimento')}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-colors"
              title={t('foods.import_replace_hint', 'Reemplaza el catálogo pegando una tabla')}
            >
              {t('foods.import_replace', 'Reemplazar catálogo')}
            </button>
            <button
              onClick={async () => {
                const toDelete = foods.filter(f => !f.barcode || String(f.barcode).trim() === '');
                if (toDelete.length === 0) {
                  setMessage(t('foods.bulk_none', 'No hay alimentos sin código.'));
                  setTimeout(() => setMessage(''), 2500);
                  return;
                }
                if (!window.confirm(t('foods.bulk_delete_confirm', '¿Eliminar todos los alimentos sin código de barras?'))) return;
                let ok = 0, fail = 0;
                for (const f of toDelete) {
                  try { 
                    await api.delete(`/foods/${f.id}`);
                    ok++;
                  } catch { 
                    fail++; 
                  }
                }
                setMessage(t('foods.bulk_delete_done', 'Eliminación completada') + ` (${ok} OK, ${fail} error)`);
                loadFoods();
                setTimeout(() => setMessage(''), 4000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
              title={t('foods.bulk_delete_hint', 'Borra entradas sin código de barras')}
            >
              {t('foods.bulk_delete_no_code', 'Eliminar sin código')}
            </button>
          </div>
        )}
      </div>

      {/* Resumen por categoría */}
      {!showForm && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-stone-900 mb-3">{t('foods.summary_title', 'Resumen por categoría')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(stats.byCategory || {}).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-stone-50 border border-slate-200">
                <span className="text-stone-700">{cat}</span>
                <span className="font-semibold text-stone-900">{count}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-stone-600 mt-3">{t('foods.total', 'Total:')} <strong>{stats.total}</strong> {t('foods.items', 'alimentos')}</div>
        </div>
      )}

      {message && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-3">{message}</div>}
      

      {/* Formulario de creación/edición */}
      {showForm && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">{editingId ? t('foods.edit', 'Editar Alimento') : t('foods.create', 'Crear Nuevo Alimento')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="block text-sm font-semibold text-stone-700 mb-1">{t('common.name_required', 'Nombre *')}</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder={t('foods.name_ph', 'Ej: Pechuga de Pollo')}
                className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.barcode', 'Código de Barras')}</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder={t('foods.barcode_ph', 'Escanear o escribir código...')}
                className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.category_required', 'Categoría *')}</label>
                <select name="categoria" value={formData.categoria} onChange={handleInputChange} className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors">
                  <option value="">{t('foods.select_category', 'Seleccionar categoría')}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.brand', 'Marca')}</label>
                <input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleInputChange}
                  placeholder={t('foods.brand_ph', 'Ej: Genérica')}
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.amount_required', 'Cantidad *')}</label>
                <input
                  type="number"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  placeholder="100"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.unit_required', 'Unidad *')}</label>
                <select name="unidad" value={formData.unidad} onChange={handleInputChange} className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors">
                  <option value="g">{t('foods.unit_g', 'Gramos (g)')}</option>
                  <option value="ml">{t('foods.unit_ml', 'Mililitros (ml)')}</option>
                  <option value="unidad">{t('foods.unit_unidad', 'Unidad')}</option>
                  <option value="cucharada">{t('foods.unit_tbsp', 'Cucharada')}</option>
                  <option value="taza">{t('foods.unit_cup', 'Taza')}</option>
                </select>
              </div>
            </div>

            <h3 className="text-md font-semibold text-stone-900 mb-2">{t('foods.nutrients_title', 'Valores Nutricionales por Porción')}</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.calories', 'Calorías')}</label>
                <input
                  type="number"
                  name="calorias"
                  value={formData.calorias}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.protein', 'Proteína (g)')}</label>
                <input
                  type="number"
                  name="proteina"
                  value={formData.proteina}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.carbs', 'Carbohidratos (g)')}</label>
                <input
                  type="number"
                  name="carbohidratos"
                  value={formData.carbohidratos}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foods.fats', 'Grasas (g)')}</label>
                <input
                  type="number"
                  name="grasas"
                  value={formData.grasas}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  className="w-full px-4 py-2 rounded-2xl border border-slate-300 bg-white text-stone-800 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors">{t('common.save', 'Guardar')}</button>
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-stone-800 border border-slate-300 hover:bg-slate-100 shadow-sm transition-colors">{t('common.cancel', 'Cancelar')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="search-section">
        <div className="search-filters">
          <input
            type="text"
            placeholder={t('foods.search_ph', 'Buscar alimento...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">{t('foods.all_categories', 'Todas las categorías')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select value={pageSize} onChange={(e) => { const v = Number(e.target.value); setPageSize(v); loadFoods(1, v); }}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{t('foods.page_size', 'Por página')}: {n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal de importación y reemplazo */}
      {showImport && (
        <div className="policy-modal-overlay" onClick={() => !importBusy && setShowImport(false)}>
          <div className="policy-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: 820}}>
            <div className="policy-modal-header">
              <h2>{t('foods.import_replace', 'Reemplazar catálogo')}</h2>
              <button className="policy-close-btn" onClick={() => !importBusy && setShowImport(false)}>✕</button>
            </div>
            <div className="policy-modal-content space-y-3">
              <p className="text-sm text-stone-600">{t('foods.import_help', 'Pega una tabla con columnas: Código de Barras, Alimento, Categoría, Cal, Prot, Carb, Gras. Usaremos porción 100 g por defecto.')}</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t('foods.import_ph', 'Pega aquí los datos...')}
                className="w-full h-64 p-3 rounded-2xl border border-slate-300"
              />
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" disabled={importBusy} onClick={() => setShowImport(false)}>{t('common.cancel', 'Cancelar')}</button>
                <button
                  className="btn-secondary"
                  disabled={importBusy || !importText.trim()}
                  onClick={async () => {
                    // Agregar sin borrar
                    // Parsear tabla pegada (soporta bloques por filas o CSV)
                    const raw = importText.trim();
                    const toNumber = (v) => {
                      if (typeof v !== 'string') return Number(v) || 0;
                      return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                    };
                    let items = [];
                    if (/,/.test(raw)) {
                      // CSV
                      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                      const isHeaderOrComment = (cols) => {
                        const [c0='', c1='', c2='', c3='', c4='', c5='', c6=''] = cols.map(s => (s || '').toLowerCase());
                        if (!cols || cols.length < 7) return true;
                        if (/^\(.*\)$/.test(cols[0])) return true;
                        if (/^c(ó|o)digo/.test(c0)) return true;
                        if (/^alimento/.test(c1)) return true;
                        if (/^categor(í|i)a/.test(c2)) return true;
                        if (/^(cal|kcal)$/.test(c3)) return true;
                        if (/^(prot|prote(í|i)na|protein)s?$/.test(c4)) return true;
                        if (/^(carb|carbos|carbohidratos|carbohydrates)$/.test(c5)) return true;
                        if (/^(gras|grasas|fat|fats)$/.test(c6)) return true;
                        if (!/^\d/.test(cols[0]) && cols[0] !== '-' && cols[0] !== '') return true;
                        return false;
                      };
                      for (let i = 0; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(s => s.trim());
                        if (isHeaderOrComment(cols)) continue;
                        const [barcode, nombre, categoria, cal, prot, carb, gras] = cols;
                        if (!nombre || /^alimento$/i.test(nombre)) continue;
                        items.push({
                          barcode: barcode && barcode !== '-' ? barcode : null,
                          nombre,
                          categoria,
                          marca: 'Genérica',
                          cantidad: 100,
                          unidad: 'g',
                          calorias: toNumber(cal),
                          proteina: toNumber(prot),
                          carbohidratos: toNumber(carb),
                          grasas: toNumber(gras),
                        });
                      }
                    } else {
                      // Bloques de 7 líneas
                      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                      const headerIdx = lines.findIndex(l => /c(ó|o)digo.*barras/i.test(l) || /alimento/i.test(l));
                      const rows = headerIdx !== -1 ? lines.slice(headerIdx + 1) : lines;
                      for (let i = 0; i + 6 < rows.length; i += 7) {
                        const barcode = rows[i];
                        const nombre = rows[i + 1];
                        const categoria = rows[i + 2];
                        const cal = rows[i + 3];
                        const prot = rows[i + 4];
                        const carb = rows[i + 5];
                        const gras = rows[i + 6];
                        if (!nombre) continue;
                        items.push({
                          barcode: barcode && barcode !== '-' ? barcode : null,
                          nombre,
                          categoria,
                          marca: 'Genérica',
                          cantidad: 100,
                          unidad: 'g',
                          calorias: toNumber(cal),
                          proteina: toNumber(prot),
                          carbohidratos: toNumber(carb),
                          grasas: toNumber(gras),
                        });
                      }
                    }
                    if (items.length === 0) {
                      setMessage(t('foods.import_parse_error', '❌ No se encontraron filas válidas. Verifica el formato.'));
                      setTimeout(() => setMessage(''), 3500);
                      return;
                    }
                    try {
                      setImportBusy(true);
                      const resp = await api.post('/foods/import', { items });
                      if (resp?.data?.success) {
                        setMessage(t('foods.import_done_add', '✅ Datos agregados') + ` (${resp.data.created} creados, ${resp.data.skipped} omitidos)`);
                        setShowImport(false);
                        setImportText('');
                        await loadFoods();
                      } else {
                        setMessage(t('foods.import_error', '❌ Error al importar alimentos'));
                      }
                      setTimeout(() => setMessage(''), 4000);
                    } catch (e) {
                      console.error(e);
                      setMessage(t('foods.import_error', '❌ Error al importar alimentos'));
                      setTimeout(() => setMessage(''), 4000);
                    } finally {
                      setImportBusy(false);
                    }
                  }}
                >
                  {importBusy ? t('common.loading', 'Cargando...') : t('foods.import_add', 'Agregar')}
                </button>
                <button
                  className="btn-primary"
                  disabled={importBusy || !importText.trim()}
                  onClick={async () => {
                    // Reemplazar: borrar y volver a cargar
                    // Parsear tabla pegada (soporta bloques por filas o CSV)
                    const raw = importText.trim();
                    const toNumber = (v) => {
                      if (typeof v !== 'string') return Number(v) || 0;
                      return Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                    };
                    let items = [];
                    if (/,/.test(raw)) {
                      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                      const isHeaderOrComment = (cols) => {
                        const [c0='', c1='', c2='', c3='', c4='', c5='', c6=''] = cols.map(s => (s || '').toLowerCase());
                        if (!cols || cols.length < 7) return true;
                        if (/^\(.*\)$/.test(cols[0])) return true;
                        if (/^c(ó|o)digo/.test(c0)) return true;
                        if (/^alimento/.test(c1)) return true;
                        if (/^categor(í|i)a/.test(c2)) return true;
                        if (/^(cal|kcal)$/.test(c3)) return true;
                        if (/^(prot|prote(í|i)na|protein)s?$/.test(c4)) return true;
                        if (/^(carb|carbos|carbohidratos|carbohydrates)$/.test(c5)) return true;
                        if (/^(gras|grasas|fat|fats)$/.test(c6)) return true;
                        if (!/^\d/.test(cols[0]) && cols[0] !== '-' && cols[0] !== '') return true;
                        return false;
                      };
                      for (let i = 0; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(s => s.trim());
                        if (isHeaderOrComment(cols)) continue;
                        const [barcode, nombre, categoria, cal, prot, carb, gras] = cols;
                        if (!nombre || /^alimento$/i.test(nombre)) continue;
                        items.push({
                          barcode: barcode && barcode !== '-' ? barcode : null,
                          nombre,
                          categoria,
                          marca: 'Genérica',
                          cantidad: 100,
                          unidad: 'g',
                          calorias: toNumber(cal),
                          proteina: toNumber(prot),
                          carbohidratos: toNumber(carb),
                          grasas: toNumber(gras),
                        });
                      }
                    } else {
                      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                      const headerIdx = lines.findIndex(l => /c(ó|o)digo.*barras/i.test(l) || /alimento/i.test(l));
                      const rows = headerIdx !== -1 ? lines.slice(headerIdx + 1) : lines;
                      for (let i = 0; i + 6 < rows.length; i += 7) {
                        const barcode = rows[i];
                        const nombre = rows[i + 1];
                        const categoria = rows[i + 2];
                        const cal = rows[i + 3];
                        const prot = rows[i + 4];
                        const carb = rows[i + 5];
                        const gras = rows[i + 6];
                        if (!nombre) continue;
                        items.push({
                          barcode: barcode && barcode !== '-' ? barcode : null,
                          nombre,
                          categoria,
                          marca: 'Genérica',
                          cantidad: 100,
                          unidad: 'g',
                          calorias: toNumber(cal),
                          proteina: toNumber(prot),
                          carbohidratos: toNumber(carb),
                          grasas: toNumber(gras),
                        });
                      }
                    }
                    if (items.length === 0) {
                      setMessage(t('foods.import_parse_error', '❌ No se encontraron filas válidas. Verifica el formato.'));
                      setTimeout(() => setMessage(''), 3500);
                      return;
                    }
                    try {
                      setImportBusy(true);
                      let deleted = 0;
                      for (const f of foods) {
                        await api.delete(`/foods/${f.id}`);
                        deleted++;
                      }
                      const resp = await api.post('/foods/import', { items });
                      if (resp?.data?.success) {
                        setMessage(t('foods.import_done', '✅ Importación completa') + ` (${resp.data.created} creados, ${resp.data.skipped} omitidos, ${deleted} eliminados)`);
                        setShowImport(false);
                        setImportText('');
                        await loadFoods();
                      } else {
                        setMessage(t('foods.import_error', '❌ Error al importar alimentos'));
                      }
                      setTimeout(() => setMessage(''), 4000);
                    } catch (e) {
                      console.error(e);
                      setMessage(t('foods.import_error', '❌ Error al importar alimentos'));
                      setTimeout(() => setMessage(''), 4000);
                    } finally {
                      setImportBusy(false);
                    }
                  }}
                >
                  {importBusy ? t('common.loading', 'Cargando...') : t('foods.import_replace', 'Reemplazar catálogo')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de alimentos */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.code', 'Código')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.food', 'Alimento')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.category', 'Categoría')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.serving', 'Porción')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.cal', 'Cal')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.protein_short', 'Proteína')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.carbs_short', 'Carbos')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('foods.fats_short', 'Grasas')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-stone-600 uppercase tracking-wider">{t('common.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredFoods.map((food) => (
                <tr key={food.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{food.barcode || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <strong>{food.nombre}</strong>
                    <div className="text-xs text-stone-500">{food.marca || t('foods.generic', 'Genérica')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{food.categoria}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{food.cantidad} {food.unidad}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{Math.round(food.calorias)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{food.proteina.toFixed(1)}g</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{food.carbohidratos.toFixed(1)}g</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">{food.grasas.toFixed(1)}g</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => handleEdit(food)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-lime-300 text-lime-700 bg-white hover:bg-lime-100 transition-colors">✏️</button>
                      <button onClick={() => handleDelete(food.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-stone-50 border-t border-slate-200 text-sm text-stone-600">
          {filteredFoods.length === 0 ? t('foods.none', 'No se encontraron alimentos') : <>{t('foods.total', 'Total:')} <strong>{total}</strong> {t('foods.items', 'alimentos')} · {t('foods.showing', 'Mostrando')} {filteredFoods.length} {t('foods.items', 'alimentos')}</>}
        </div>
        {/* Paginador */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border border-slate-200 rounded-3xl">
          <button
            className="inline-flex items-center px-4 py-2 rounded-2xl bg-white text-stone-800 border border-slate-300 hover:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
            onClick={() => page > 1 && loadFoods(page - 1, pageSize)}
            disabled={page <= 1}
          >
            ← {t('common.prev', 'Anterior')}
          </button>
          <div className="text-sm text-stone-700">
            {t('common.page', 'Página')} <strong>{page}</strong>
          </div>
          <button
            className="inline-flex items-center px-4 py-2 rounded-2xl bg-white text-stone-800 border border-slate-300 hover:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
            onClick={() => {
              const nextStart = page * pageSize;
              if (nextStart < total) loadFoods(page + 1, pageSize);
            }}
            disabled={page * pageSize >= total}
          >
            {t('common.next', 'Siguiente')} →
          </button>
        </div>
      </div>
    </div>
  );
}
