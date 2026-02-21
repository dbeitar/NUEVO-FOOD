import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminFoodsManager() {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState('json');
  const [importResult, setImportResult] = useState(null);

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

  const handleImport = async () => {
    try {
      let payload;
      if (importMode === 'json') {
        const parsed = JSON.parse(importText);
        payload = Array.isArray(parsed) ? { items: parsed } : parsed;
      } else {
        const rows = parseCSV(importText);
        payload = { items: rows };
      }
      const response = await api.post('/foods/import', payload);
      setImportResult(response.data);
      loadFoods();
      setTimeout(() => setImportResult(null), 5000);
    } catch (error) {
      setImportResult({ success: false, error: 'Error al importar. Revisa el JSON.' });
    }
  };
  
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''));
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => (row[h] = cells[idx] ?? ''));
      const item = {
        nombre: row['nombre'] || row['name'],
        categoria: row['categoria'] || row['category'],
        marca: row['marca'] || row['brand'] || 'Genérica',
        cantidad: row['cantidad'] || row['portion'] || row['serving'] || 0,
        unidad: row['unidad'] || row['unit'] || 'g',
        calorias: row['calorias'] || row['calories'] || row['kcal'] || 0,
        proteina: row['proteina'] || row['protein'] || 0,
        carbohidratos: row['carbohidratos'] || row['carbs'] || row['carbohydrates'] || 0,
        grasas: row['grasas'] || row['fat'] || row['fats'] || 0,
        barcode: row['barcode'] || row['codigo'] || '',
      };
      items.push(item);
    }
    return items;
  };

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
    <div className="admin-foods-manager">
      <h1>Gestión de Alimentos Maestros</h1>

      {message && <div className="message">{message}</div>}

      {/* Botón para mostrar/ocultar formulario */}
      {!showForm && !showImport && (
        <button onClick={() => setShowForm(true)} className="btn-create">
          Nuevo Alimento
        </button>
      )}
      {!showForm && !showImport && (
        <button onClick={() => setShowImport(true)} className="btn-create" style={{ marginLeft: 10 }}>
          Importar desde JSON
        </button>
      )}
      {showImport && (
        <div className="form-section">
          <h2>Importar Alimentos</h2>
          <div style={{display:'flex', gap:8, marginBottom:10}}>
            <button onClick={() => setImportMode('json')} className="btn-create" style={{opacity: importMode==='json'?1:0.7}}>Pegar JSON</button>
            <button onClick={() => setImportMode('csv')} className="btn-create" style={{opacity: importMode==='csv'?1:0.7}}>Pegar CSV</button>
          </div>
          <p style={{margin:'8px 0 12px 0', color:'#666', fontSize:13}}>
            {importMode === 'json' ? 'Pega un JSON con formato:' : 'Pega CSV con encabezados: nombre,categoria,marca,cantidad,unidad,calorias,proteina,carbohidratos,grasas,barcode'}
          </p>
          <pre style={{background:'#f8f9fa', padding:12, borderRadius:8, fontSize:12, overflow:'auto', display: importMode==='json'?'block':'none'}}>
{`[
  {"nombre":"Yogur natural","categoria":"Proteínas","marca":"Genérica","cantidad":100,"unidad":"g","calorias":63,"proteina":3.5,"carbohidratos":4.7,"grasas":3.3,"barcode":"5901234123457"},
  {"nombre":"Avena","categoria":"Carbohidratos","marca":"Genérica","cantidad":100,"unidad":"g","calorias":389,"proteina":16.9,"carbohidratos":66.3,"grasas":6.9}
]`}
          </pre>
          <pre style={{background:'#f8f9fa', padding:12, borderRadius:8, fontSize:12, overflow:'auto', display: importMode==='csv'?'block':'none'}}>
{`nombre,categoria,marca,cantidad,unidad,calorias,proteina,carbohidratos,grasas,barcode
Yogur natural,Proteínas,Genérica,100,g,63,3.5,4.7,3.3,5901234123457
Avena,Carbohidratos,Genérica,100,g,389,16.9,66.3,6.9,`}
          </pre>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={importMode==='json' ? 'Pega aquí el JSON a importar' : 'Pega aquí el CSV a importar'}
            style={{width:'100%', minHeight:180, padding:12, border:'2px solid #e0e0e0', borderRadius:8}}
          />
          <div className="form-actions">
            <button onClick={handleImport} className="btn-save">Importar</button>
            <button onClick={() => { setShowImport(false); setImportText(''); setImportResult(null); }} className="btn-cancel">Cancelar</button>
          </div>
          {importResult && (
            <div className="message" style={{marginTop:10}}>
              {importResult.success 
                ? `✅ Importados: ${importResult.created} | Omitidos: ${importResult.skipped}` 
                : `❌ ${importResult.error}`}
            </div>
          )}
        </div>
      )}

      {/* Formulario de creación/edición */}
      {showForm && (
        <div className="form-section">
          <h2>{editingId ? 'Editar Alimento' : 'Crear Nuevo Alimento'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Pechuga de Pollo"
              />
            </div>

            <div className="form-group">
              <label>Código de Barras</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder="Escanear o escribir código..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Categoría *</label>
                <select name="categoria" value={formData.categoria} onChange={handleInputChange}>
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Marca</label>
                <input
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleInputChange}
                  placeholder="Ej: Genérica"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cantidad *</label>
                <input
                  type="number"
                  name="cantidad"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  placeholder="100"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Unidad *</label>
                <select name="unidad" value={formData.unidad} onChange={handleInputChange}>
                  <option value="g">Gramos (g)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="unidad">Unidad</option>
                  <option value="cucharada">Cucharada</option>
                  <option value="taza">Taza</option>
                </select>
              </div>
            </div>

            <h3>Valores Nutricionales por Porción</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Calorías</label>
                <input
                  type="number"
                  name="calorias"
                  value={formData.calorias}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Proteína (g)</label>
                <input
                  type="number"
                  name="proteina"
                  value={formData.proteina}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Carbohidratos (g)</label>
                <input
                  type="number"
                  name="carbohidratos"
                  value={formData.carbohidratos}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Grasas (g)</label>
                <input
                  type="number"
                  name="grasas"
                  value={formData.grasas}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                💾 Guardar
              </button>
              <button type="button" onClick={resetForm} className="btn-cancel">
                ✕ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Búsqueda y filtros */}
      <div className="search-section">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de alimentos */}
      <div className="foods-table-section">
        <table className="foods-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Alimento</th>
              <th>Categoría</th>
              <th>Porción</th>
              <th>Cal</th>
              <th>Proteína</th>
              <th>Carbos</th>
              <th>Grasas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredFoods.map((food) => (
              <tr key={food.id}>
                <td className="barcode">{food.barcode || '-'}</td>
                <td>
                  <strong>{food.nombre}</strong>
                  <br />
                  <small>{food.marca}</small>
                </td>
                <td>{food.categoria}</td>
                <td>{food.cantidad} {food.unidad}</td>
                <td>{Math.round(food.calorias)}</td>
                <td>{food.proteina.toFixed(1)}g</td>
                <td>{food.carbohidratos.toFixed(1)}g</td>
                <td>{food.grasas.toFixed(1)}g</td>
                <td className="actions">
                  <button onClick={() => handleEdit(food)} className="btn-edit">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(food.id)} className="btn-delete">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFoods.length === 0 && (
          <p className="no-results">No se encontraron alimentos</p>
        )}

        <p className="count">
          Total: <strong>{filteredFoods.length}</strong> alimentos
        </p>
      </div>
    </div>
  );
}
