import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminFoodsManager.css';

export default function AdminFoodsManager() {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
      <h1>🍽️ Gestión de Alimentos Maestros</h1>

      {message && <div className="message">{message}</div>}

      {/* Botón para mostrar/ocultar formulario */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-create">
          ➕ Nuevo Alimento
        </button>
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
