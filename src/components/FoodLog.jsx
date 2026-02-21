import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import AISuggestions from './AISuggestions';

export default function FoodLog() {
  const today = new Date().toISOString().split('T')[0];

  const defaultPlan = { calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 };
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMeal, setSelectedMeal] = useState('Desayuno');
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroupTab, setSelectedGroupTab] = useState('Todas');
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const [scanError, setScanError] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickForm, setQuickForm] = useState({
    nombre: '',
    barcode: '',
    categoria: '',
    marca: 'Genérica',
    cantidad: 100,
    unidad: 'g',
    calorias: 0,
    proteina: 0,
    carbohidratos: 0,
    grasas: 0,
  });
  const [dayLogs, setDayLogs] = useState([]);
  const [dayTotals, setDayTotals] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [cantidadConsumida, setCantidadConsumida] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState(24);
  const [plan, setPlan] = useState(defaultPlan);

  // Cargar alimentos y categorías
  useEffect(() => {
    loadFoods();
    loadCategories();
    // Cargar plan real del usuario
    (async () => {
      try {
        const resp = await api.get('/plan/mine');
        if (resp.data?.success && resp.data.data) {
          setPlan(resp.data.data);
        }
      } catch (e) {
        // sigue con plan por defecto
      }
    })();
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
  
  const handleFindByBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const resp = await api.get(`/foods/barcode/${barcode.trim()}`);
      setSelectedFood(resp.data.data);
      setMessage('✅ Producto encontrado por código de barras');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setMessage('❌ No se encontró el producto. Puedes crearlo rápidamente aquí.');
      setShowQuickCreate(true);
      setQuickForm((prev) => ({ ...prev, barcode: barcode.trim() }));
      setTimeout(() => setMessage(''), 3500);
    }
  };

  const stopScan = () => {
    setScanning(false);
    setScanError('');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startScan = async () => {
    try {
      setScanError('');
      if (!('BarcodeDetector' in window)) {
        setScanError('El lector no es compatible en este navegador. Usa la caja de código.');
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      const BarcodeDetector = window.BarcodeDetector;
      detectorRef.current = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'],
      });
      setScanning(true);
      const loop = async () => {
        if (!scanning || !videoRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const value = codes[0].rawValue || codes[0].displayValue;
            if (value) {
              setBarcode(value);
              stopScan();
              handleFindByBarcode();
              return;
            }
          }
        } catch (e) {
          setScanError('Error leyendo el código. Intenta de nuevo.');
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setScanError('No se pudo acceder a la cámara. Revisa permisos.');
    }
  };

  const handleQuickCreate = async () => {
    try {
      const payload = {
        ...quickForm,
        cantidad: parseFloat(quickForm.cantidad),
        calorias: parseFloat(quickForm.calorias),
        proteina: parseFloat(quickForm.proteina),
        carbohidratos: parseFloat(quickForm.carbohidratos),
        grasas: parseFloat(quickForm.grasas),
      };
      const resp = await api.post('/foods', payload);
      const item = resp.data?.data;
      setMessage('✅ Alimento creado');
      await loadFoods();
      if (item) {
        setSelectedFood(item);
      }
      setShowQuickCreate(false);
      setTimeout(() => setMessage(''), 2500);
    } catch (e) {
      setMessage('❌ No tienes permisos o datos incompletos');
      setTimeout(() => setMessage(''), 3500);
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
  if (selectedGroupTab && selectedGroupTab !== 'Todas') {
    filteredFoods = filteredFoods.filter(
      (food) => food.categoria === selectedGroupTab
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
      <div className="page-header">
        <div>
          <h1>Registro de Alimentos</h1>
          <p className="subtitle">Añade tus comidas del día y controla tus metas</p>
        </div>
      </div>
      
      {/* Panel fijo de Plan del Usuario */}
      <div className="plan-summary sticky">
        <h2>Plan Nutricional</h2>
        <div className="totals-card">
          <div className="progress-item">
            <label>Calorías</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: dayTotals ? `${Math.min((dayTotals.totalCalorias / plan.calorias) * 100, 100)}%` : '0%' }}
              />
            </div>
            <span>{dayTotals ? Math.round(dayTotals.totalCalorias) : 0} / {plan.calorias} cal</span>
          </div>
          <div className="progress-item">
            <label>Proteína</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: dayTotals ? `${Math.min((dayTotals.totalProteina / plan.proteina) * 100, 100)}%` : '0%' }}
              />
            </div>
            <span>{dayTotals ? Math.round(dayTotals.totalProteina) : 0}g / {plan.proteina}g</span>
          </div>
          <div className="progress-item">
            <label>Carbohidratos</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: dayTotals ? `${Math.min((dayTotals.totalCarbohidratos / plan.carbohidratos) * 100, 100)}%` : '0%' }}
              />
            </div>
            <span>{dayTotals ? Math.round(dayTotals.totalCarbohidratos) : 0}g / {plan.carbohidratos}g</span>
          </div>
          <div className="progress-item">
            <label>Grasas</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: dayTotals ? `${Math.min((dayTotals.totalGrasas / plan.grasas) * 100, 100)}%` : '0%' }}
              />
            </div>
            <span>{dayTotals ? Math.round(dayTotals.totalGrasas) : 0}g / {plan.grasas}g</span>
          </div>
        </div>
      </div>

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
          <div className="barcode-box">
            <input
              type="text"
              placeholder="Escanear/ingresar código de barras"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button className="btn-primary" onClick={handleFindByBarcode}>Buscar</button>
            {!scanning ? (
              <button className="btn-secondary" onClick={startScan}>Escanear</button>
            ) : (
              <button className="btn-secondary" onClick={stopScan}>Detener</button>
            )}
          </div>
        </div>
        {scanning && (
          <div className="scan-box">
            <video ref={videoRef} muted playsInline className="scan-video" />
            {scanError && <div className="scan-error">{scanError}</div>}
          </div>
        )}
        {showQuickCreate && (
          <div className="selected-food-detail" style={{marginTop:12}}>
            <div className="detail-info">
              <h3>Crear alimento</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={quickForm.nombre}
                  onChange={(e) => setQuickForm({ ...quickForm, nombre: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Categoría (Proteínas/Carbohidratos/Grasas)"
                  value={quickForm.categoria}
                  onChange={(e) => setQuickForm({ ...quickForm, categoria: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <input
                  type="text"
                  placeholder="Código de barras"
                  value={quickForm.barcode}
                  onChange={(e) => setQuickForm({ ...quickForm, barcode: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Marca"
                  value={quickForm.marca}
                  onChange={(e) => setQuickForm({ ...quickForm, marca: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <input
                  type="number"
                  placeholder="Porción (ej. 100)"
                  value={quickForm.cantidad}
                  onChange={(e) => setQuickForm({ ...quickForm, cantidad: e.target.value })}
                />
                <select
                  value={quickForm.unidad}
                  onChange={(e) => setQuickForm({ ...quickForm, unidad: e.target.value })}
                >
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="unidad">unidad</option>
                </select>
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <input
                  type="number"
                  placeholder="Calorías"
                  value={quickForm.calorias}
                  onChange={(e) => setQuickForm({ ...quickForm, calorias: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Proteína (g)"
                  value={quickForm.proteina}
                  onChange={(e) => setQuickForm({ ...quickForm, proteina: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Carbohidratos (g)"
                  value={quickForm.carbohidratos}
                  onChange={(e) => setQuickForm({ ...quickForm, carbohidratos: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Grasas (g)"
                  value={quickForm.grasas}
                  onChange={(e) => setQuickForm({ ...quickForm, grasas: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <button className="btn-primary" onClick={handleQuickCreate}>Crear alimento</button>
                <button className="btn-secondary" onClick={() => setShowQuickCreate(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        
        <div className="group-tabs">
          {['Todas', 'Proteínas', 'Carbohidratos', 'Grasas'].map((tab) => (
            <button
              key={tab}
              className={`tab ${selectedGroupTab === tab ? 'active' : ''}`}
              onClick={() => setSelectedGroupTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid de alimentos */}
        <div className="foods-grid">
          {filteredFoods.slice(0, showCount).map((food) => (
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
        {filteredFoods.length > showCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={() => setShowCount(showCount + 24)}>
              Ver más alimentos
            </button>
          </div>
        )}

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
                  style={{ width: `${Math.min((dayTotals.totalCalorias / plan.calorias) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalCalorias)} / {plan.calorias} cal</span>
            </div>

            <div className="progress-item">
              <label>Proteína</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalProteina / plan.proteina) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalProteina)}g / {plan.proteina}g</span>
            </div>

            <div className="progress-item">
              <label>Carbohidratos</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalCarbohidratos / plan.carbohidratos) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalCarbohidratos)}g / {plan.carbohidratos}g</span>
            </div>

            <div className="progress-item">
              <label>Grasas</label>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min((dayTotals.totalGrasas / plan.grasas) * 100, 100)}%` }}
                />
              </div>
              <span>{Math.round(dayTotals.totalGrasas)}g / {plan.grasas}g</span>
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
