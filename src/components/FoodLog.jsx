import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AISuggestions from './AISuggestions';
import './FoodLog.css';

export default function FoodLog() {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMeal, setSelectedMeal] = useState('Desayuno');
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dayLogs, setDayLogs] = useState([]);
  const [dayTotals, setDayTotals] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [cantidadConsumida, setCantidadConsumida] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar alimentos y categorías
  useEffect(() => {
    loadFoods();
    loadCategories();
  }, []);

  // Cargar registros del día cuando cambia la fecha
  useEffect(() => {
    loadDayLogs();
  }, [selectedDate]);

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

  const loadDayLogs = async () => {
    try {
      setLoading(true);
      const [logsResponse, totalsResponse] = await Promise.all([
        api.get('/food-log/day', { params: { fecha: selectedDate } }),
        api.get('/food-log/totals', { params: { fecha: selectedDate } }),
      ]);
      setDayLogs(logsResponse.data.data);
      setDayTotals(totalsResponse.data.data);
    } catch (error) {
      console.error('Error cargando registros del día:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood) {
      setMessage('Por favor selecciona un alimento');
      return;
    }

    if (cantidadConsumida <= 0) {
      setMessage('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await api.post('/food-log', {
        foodId: selectedFood.id,
        cantidadConsumida: parseFloat(cantidadConsumida),
        comida: selectedMeal,
        fecha: selectedDate,
      });

      setMessage('✅ Alimento agregado al registro');
      setSelectedFood(null);
      setCantidadConsumida(1);
      setTimeout(() => setMessage(''), 3000);
      loadDayLogs();
    } catch (error) {
      setMessage('❌ Error al agregar alimento');
      console.error('Error:', error);
    }
  };

  const handleRemoveFood = async (entryId) => {
    if (window.confirm('¿Estás seguro que deseas eliminar este registro?')) {
      try {
        await api.delete(`/food-log/${entryId}`);
        setMessage('✅ Registro eliminado');
        setTimeout(() => setMessage(''), 2000);
        loadDayLogs();
      } catch (error) {
        setMessage('❌ Error al eliminar registro');
        console.error('Error:', error);
      }
    }
  };

  // Filtrar alimentos
  let filteredFoods = foods;
  if (searchQuery) {
    filteredFoods = filteredFoods.filter((food) =>
      food.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (selectedCategory) {
    filteredFoods = filteredFoods.filter(
      (food) => food.categoria === selectedCategory
    );
  }

  // Agrupar logs por comida
  const mealGroups = {
    Desayuno: dayLogs.filter((log) => log.comida === 'Desayuno'),
    Almuerzo: dayLogs.filter((log) => log.comida === 'Almuerzo'),
    Cena: dayLogs.filter((log) => log.comida === 'Cena'),
    Snack: dayLogs.filter((log) => log.comida === 'Snack'),
  };

  return (
    <div className="food-log-container">
      <h1>📋 Registro de Alimentos</h1>

      {/* Selector de fecha */}
      <div className="date-selector">
        <label>Fecha:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={today}
        />
      </div>

      {/* Búsqueda de alimentos */}
      <div className="search-section">
        <h2>Buscar y Agregar Alimentos</h2>

        <div className="search-filters">
          <input
            type="text"
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Grid de alimentos */}
        <div className="foods-grid">
          {filteredFoods.slice(0, 12).map((food) => (
            <div
              key={food.id}
              className={`food-card ${selectedFood?.id === food.id ? 'active' : ''}`}
              onClick={() => setSelectedFood(food)}
            >
              <h3>{food.nombre}</h3>
              <p className="category">{food.categoria}</p>
              <div className="macros-preview">
                <span>🔥 {Math.round(food.calorias * (cantidadConsumida / food.cantidad))}</span>
                <span>🥚 {Math.round(food.proteina * (cantidadConsumida / food.cantidad))}g</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle del alimento seleccionado */}
        {selectedFood && (
          <div className="selected-food-detail">
            <div className="detail-info">
              <h3>{selectedFood.nombre}</h3>
              <p>{selectedFood.categoria}</p>
              <p className="portion">Porción base: {selectedFood.cantidad} {selectedFood.unidad}</p>

              <div className="quantity-picker">
                <label>Cantidad consumida:</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={cantidadConsumida}
                  onChange={(e) => setCantidadConsumida(e.target.value)}
                />
                <span>{selectedFood.unidad}</span>
              </div>

              <select
                value={selectedMeal}
                onChange={(e) => setSelectedMeal(e.target.value)}
              >
                <option value="Desayuno">🌅 Desayuno</option>
                <option value="Almuerzo">🌞 Almuerzo</option>
                <option value="Cena">🌙 Cena</option>
                <option value="Snack">🍿 Snack</option>
              </select>
            </div>

            <div className="detail-macros">
              <div className="macro calorias">
                <span>Calorías</span>
                <strong>{Math.round(selectedFood.calorias * (cantidadConsumida / selectedFood.cantidad))}</strong>
              </div>
              <div className="macro proteina">
                <span>Proteína</span>
                <strong>{(selectedFood.proteina * (cantidadConsumida / selectedFood.cantidad)).toFixed(1)}g</strong>
              </div>
              <div className="macro carbohidratos">
                <span>Carbohidratos</span>
                <strong>{(selectedFood.carbohidratos * (cantidadConsumida / selectedFood.cantidad)).toFixed(1)}g</strong>
              </div>
              <div className="macro grasas">
                <span>Grasas</span>
                <strong>{(selectedFood.grasas * (cantidadConsumida / selectedFood.cantidad)).toFixed(1)}g</strong>
              </div>
            </div>

            <button onClick={handleAddFood} className="btn-add-food">
              ➕ Agregar al Registro
            </button>
          </div>
        )}

        {message && <div className="message">{message}</div>}
      </div>

      {/* Resumen del día */}
      <div className="day-summary-section">
        <h2>Resumen del Día - {selectedDate}</h2>

        {dayTotals && (
          <div className="totals-card">
            <div className="progress-item">
              <label>Calorías</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalCalorias / 2000) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalCalorias)} / 2000 cal</span>
            </div>

            <div className="progress-item">
              <label>Proteína</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalProteina / 150) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalProteina)}g / 150g</span>
            </div>

            <div className="progress-item">
              <label>Carbohidratos</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalCarbohidratos / 250) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalCarbohidratos)}g / 250g</span>
            </div>

            <div className="progress-item">
              <label>Grasas</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalGrasas / 65) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalGrasas)}g / 65g</span>
            </div>
          </div>
        )}
      </div>

      {/* Registros por comida */}
      <div className="meal-logs-section">
        {Object.entries(mealGroups).map(([meal, logs]) => (
          <div key={meal} className="meal-group">
            <h3>
              {meal === 'Desayuno' && '🌅'}
              {meal === 'Almuerzo' && '🌞'}
              {meal === 'Cena' && '🌙'}
              {meal === 'Snack' && '🍿'}
              {' '}{meal}
            </h3>

            {logs.length === 0 ? (
              <p className="no-foods">No hay registros para esta comida</p>
            ) : (
              <div className="logs-list">
                {logs.map((log) => (
                  <div key={log.id} className="log-item">
                    <div className="log-info">
                      <h4>{log.foodNombre}</h4>
                      <p className="portion">
                        {log.cantidad} {log.unidad}
                      </p>
                    </div>
                    <div className="log-macros">
                      <span>🔥 {Math.round(log.calorias)}</span>
                      <span>🥚 {log.proteina.toFixed(1)}g</span>
                      <span>🥣 {log.carbohidratos.toFixed(1)}g</span>
                      <span>🧈 {log.grasas.toFixed(1)}g</span>
                    </div>
                    <button
                      className="btn-delete"
                      onClick={() => handleRemoveFood(log.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Asistente IA de Sugerencias */}
      {dayTotals && (
        <AISuggestions 
          dayTotals={dayTotals}
          targetGoals={{
            calorias: 2000,
            proteina: 150,
            carbohidratos: 250,
            grasas: 65
          }}
          objetivo="Mantenimiento"
        />
      )}
    </div>
  );
}
