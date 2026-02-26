import { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../context/I18nContext';

export default function AdminFoodsManager() {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
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
    loadFoods();
    loadCategories();
  }, []);

  const loadFoods = async () => {
    try {
      const response = await api.get('/foods');
      setFoods(response.data.data);
    } catch (error) {
      console.error('Error cargando alimentos:', error);
    }
  };

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
      setMessage('❌ Por favor completa todos los campos requeridos');
      return;
    }

    try {
      if (editingId) {
        // Actualizar
        await api.put(`/foods/${editingId}`, formData);
        setMessage('✅ Alimento actualizado exitosamente');
      } else {
        // Crear
        await api.post('/foods', formData);
        setMessage('✅ Alimento creado exitosamente');
      }

      resetForm();
      loadFoods();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al guardar alimento');
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
    if (window.confirm('¿Estás seguro que deseas eliminar este alimento?')) {
      try {
        await api.delete(`/foods/${id}`);
        setMessage('✅ Alimento eliminado exitosamente');
        loadFoods();
        setTimeout(() => setMessage(''), 2000);
      } catch (error) {
        setMessage('❌ Error al eliminar alimento');
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

  // Filtrar alimentos
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
          <h2 className="text-2xl font-bold text-stone-900 font-['Playfair_Display']">{t('foods.title', 'Gestión de Alimentos Maestros')}</h2>
          <p className="text-stone-600">{t('foods.subtitle', 'Administra el catálogo de alimentos con valores nutricionales.')}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black shadow-sm transition-colors">
            {t('foods.new', 'Nuevo Alimento')}
          </button>
        )}
      </div>

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
              <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-lime- pipeline pipelines">{t('common.save', 'Guardar')}</button>
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
        </div>
      </div>

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
          {filteredFoods.length === 0 ? t('foods.none', 'No se encontraron alimentos') : <>{t('foods.total', 'Total:')} <strong>{filteredFoods.length}</strong> {t('foods.items', 'alimentos')}</>}
        </div>
      </div>
    </div>
  );
}
