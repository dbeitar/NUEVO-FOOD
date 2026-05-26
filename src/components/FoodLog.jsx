import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import AISuggestions from './AISuggestions';
import './FoodLog.css';
import { useI18n } from '../context/useI18n';
import { userRoles, makeHasAnyRole } from './dashboard/roles';

export default function FoodLog() {
  const { token, user } = useAuth();
  const canCreateFood = useMemo(() => {
    const roles = userRoles(user);
    return makeHasAnyRole(roles)(['super_admin', 'admin_food', 'admin_food_plan']);
  }, [user]);
  const today = new Date().toISOString().split('T')[0];
  const { t } = useI18n();
  const mealLabel = (meal) => {
    if (meal === 'Desayuno') return t('meals.breakfast', 'Desayuno');
    if (meal === 'Almuerzo') return t('meals.lunch', 'Almuerzo');
    if (meal === 'Cena') return t('meals.dinner', 'Cena');
    if (meal === 'Snack') return t('meals.snack', 'Snack');
    return meal;
  };

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
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState(24);
  const [plan, setPlan] = useState(defaultPlan);
  const [combos, setCombos] = useState([]);
  // estado de selección masiva eliminado
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [foodModalFood, setFoodModalFood] = useState(null);
  const [foodModalPortions, setFoodModalPortions] = useState(1);
  const [foodModalMeal, setFoodModalMeal] = useState('Desayuno');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? 6 : day - 1); // lunes inicio
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    return monday.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(today);
  const [history, setHistory] = useState({});
  const [weekly, setWeekly] = useState([]);

  // Cargar alimentos y categorías
  useEffect(() => {
    loadFoods();
    loadCategories();
    // Cargar plan real del usuario
    (async () => {
      try {
        if (!token) return;
        const resp = await api.get('/plan/mine');
        if (resp.data?.success && resp.data.data) {
          setPlan(resp.data.data);
        }
      } catch {
        console.warn('Usando plan por defecto');
      }
    })();
  }, [token]);

  const loadDayLogs = useCallback(async () => {
    if (!token) return;
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
  }, [selectedDate, token]);

  useEffect(() => {
    loadDayLogs();
  }, [loadDayLogs]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const r = await api.get('/food-log/history', { params: { days: 30 } });
        setHistory(r.data?.data || {});
      } catch {
        console.warn('Historial no disponible');
      }
    })();
  }, [token]);

  useEffect(() => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s > e) return;
      const dates = Object.keys(history).sort();
      const inRange = dates.filter((d) => {
        const x = new Date(d);
        return x >= new Date(startDate) && x <= new Date(endDate);
      });
      const list = inRange.map((d) => ({ date: d, totals: history[d] || null }));
      setWeekly(list);
    } catch {
      setWeekly([]);
    }
  }, [startDate, endDate, history]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/food-log/combos', { params: { comida: selectedMeal } });
        setCombos(r.data?.data || []);
      } catch {
        console.warn('No se pudieron cargar combos');
      }
    })();
  }, [selectedMeal]);

  const loadFoods = async () => {
    try {
      const response = await api.get('/foods');
      setFoods(response.data.data);
    } catch (error) {
      console.error('Error cargando alimentos:', error);
    }
  };

  const openFoodModal = (food) => {
    setFoodModalFood(food);
    setFoodModalPortions(1);
    setFoodModalMeal(selectedMeal);
    setFoodModalOpen(true);
  };

  const closeFoodModal = () => {
    setFoodModalOpen(false);
    setFoodModalFood(null);
  };

  const submitFoodModal = async () => {
    if (!foodModalFood) return;
    const pors = parseInt(foodModalPortions, 10);
    if (!Number.isInteger(pors) || pors <= 0) {
      setMessage(t('foodlog.portion_integer_error', 'La porción debe ser un entero mayor a 0'));
      setTimeout(() => setMessage(''), 2500);
      return;
    }
    try {
      const cantidadConsumida = pors * foodModalFood.cantidad;
      await api.post('/food-log', {
        foodId: foodModalFood.id,
        cantidadConsumida,
        comida: foodModalMeal,
        fecha: selectedDate,
      });
      setMessage(t('foodlog.added_ok', '✅ Alimento agregado'));
      setTimeout(() => setMessage(''), 2000);
      closeFoodModal();
      loadDayLogs();
    } catch {
      setMessage(t('foodlog.save_error', '❌ Error al guardar'));
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // función de guardado masivo eliminada por no estar en uso en la UI

  const loadCategories = async () => {
    try {
      const response = await api.get('/foods/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  

  // función de agregado directo eliminada; se usa submitFoodModal
  
  const handleFindByBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const resp = await api.get(`/foods/barcode/${barcode.trim()}`);
      setSelectedFood(resp.data.data);
      setMessage(t('foodlog.barcode_found', '✅ Producto encontrado por código de barras'));
      setTimeout(() => setMessage(''), 2500);
    } catch {
      if (canCreateFood) {
        setMessage(t('foodlog.barcode_not_found_admin', 'No encontramos el producto. Puedes crearlo aquí.'));
        setShowQuickCreate(true);
        setQuickForm((prev) => ({ ...prev, barcode: barcode.trim() }));
      } else {
        setMessage(t('foodlog.barcode_not_found_user', 'No encontramos el producto. Avisa a tu coach para añadirlo al catálogo.'));
      }
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
        setScanError(t('foods.scan_unsupported', 'El lector no es compatible en este navegador. Usa la caja de código.'));
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
        } catch {
          setScanError(t('foods.scan_error', 'Error leyendo el código. Intenta de nuevo.'));
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setScanError(t('foods.camera_denied', 'No se pudo acceder a la cámara. Revisa permisos.'));
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
      setMessage(t('foods.created_ok', '✅ Alimento creado'));
      await loadFoods();
      if (item) {
        setSelectedFood(item);
      }
      setShowQuickCreate(false);
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setMessage(t('foods.create_error', '❌ No tienes permisos o datos incompletos'));
      setTimeout(() => setMessage(''), 3500);
    }
  };

  const handleRemoveFood = async (entryId) => {
    if (window.confirm(t('foodlog.delete_confirm', '¿Estás seguro que deseas eliminar este registro?'))) {
      try {
        await api.delete(`/food-log/${entryId}`);
        setMessage(t('foodlog.deleted_ok', '✅ Registro eliminado'));
        setTimeout(() => setMessage(''), 2000);
        loadDayLogs();
      } catch (error) {
        setMessage(t('foodlog.delete_error', '❌ Error al eliminar registro'));
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
          <h1>{t('foodlog.title', 'Registro de Alimentos')}</h1>
          <p className="subtitle">{t('foodlog.subtitle', 'Añade tus comidas del día y controla tus metas')}</p>
        </div>
      </div>
      {loading && <div className="message">{t('common.loading', 'Cargando...')}</div>}

      <div className="two-col-grid">
        <div className="left-col">
          <div className="plan-summary">
            <h2>{t('foodlog.nutrition_plan', 'Plan Nutricional')}</h2>
            <div className="totals-card">
              <div className="progress-item">
                <label>{t('ai.calories', 'Calorías')}</label>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: dayTotals ? `${Math.min((dayTotals.totalCalorias / plan.calorias) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <span>{dayTotals ? Math.round(dayTotals.totalCalorias) : 0} / {plan.calorias} cal</span>
              </div>
              <div className="progress-item">
                <label>{t('ai.protein', 'Proteína')}</label>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: dayTotals ? `${Math.min((dayTotals.totalProteina / plan.proteina) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <span>{dayTotals ? Math.round(dayTotals.totalProteina) : 0}g / {plan.proteina}g</span>
              </div>
              <div className="progress-item">
                <label>{t('ai.carbs', 'Carbohidratos')}</label>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: dayTotals ? `${Math.min((dayTotals.totalCarbohidratos / plan.carbohidratos) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <span>{dayTotals ? Math.round(dayTotals.totalCarbohidratos) : 0}g / {plan.carbohidratos}g</span>
              </div>
              <div className="progress-item">
                <label>{t('ai.fats', 'Grasas')}</label>
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

          <div className="range-card">
            <h2>{t('foodlog.range_title', 'Rango de Fechas')}</h2>
            <div className="range-grid">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foodlog.start', 'Inicio')}</label>
                <input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">{t('foodlog.end', 'Fin')}</label>
                <input type="date" value={endDate} min={startDate} max={today} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 rounded-2xl border border-slate-300" />
              </div>
            </div>
          </div>

          <div className="weekly-card">
            <h2>{t('foodlog.weekly_progress', 'Avance Semanal')}</h2>
            <div className="space-y-2">
              {weekly.length === 0 ? (
                <p className="text-sm text-stone-600">{t('foodlog.no_range', 'Sin datos para el rango.')}</p>
              ) : (
                weekly.map(({ date, totals }) => (
                  <div key={date} className="weekly-row">
                    <div className="weekly-date">{date}</div>
                    <div className="weekly-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: totals ? `${Math.min(((totals.totalCalorias || 0) / plan.calorias) * 100, 100)}%` : '0%' }} />
                      </div>
                    </div>
                    <div className="text-sm w-24 text-right">{totals ? Math.round(totals.totalCalorias || 0) : 0} kcal</div>
                  </div>
                ))
              )}
            </div>
          </div>

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

        <div className="right-col">
          <div className="date-selector">
            <label>{t('foodlog.date', 'Fecha')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
            />
          </div>
          <div style={{marginBottom:12}}>
            <button className="btn-secondary" onClick={() => setSummaryOpen(true)}>{t('foodlog.summary_btn', 'Resumen de alimentos')}</button>
          </div>

          <div className="search-section" style={{ marginBottom: 16 }}>
            <h2>{t('foodlog.select_meal', 'Selecciona la comida')}</h2>
            <div className="search-filters">
              <select value={selectedMeal} onChange={(e) => setSelectedMeal(e.target.value)}>
                <option value="Desayuno">🌅 {t('meals.breakfast', 'Desayuno')}</option>
                <option value="Almuerzo">🌞 {t('meals.lunch', 'Almuerzo')}</option>
                <option value="Cena">🌙 {t('meals.dinner', 'Cena')}</option>
                <option value="Snack">🍿 {t('meals.snack', 'Snack')}</option>
              </select>
            </div>
            <div className="foods-grid">
              {combos.map((f) => (
                <div key={f.id} className="food-card" onClick={() => openFoodModal(f)}>
                  <h3>{f.nombre}</h3>
                  <p className="category">{f.categoria} · {f.cantidad} {f.unidad}</p>
                  <div className="macros-preview">
                    <span>🔥 {Math.round(f.calorias)}</span>
                    <span>🥚 {f.proteina.toFixed(1)}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sección de búsqueda y agregado de alimentos */}

      {/* Búsqueda de alimentos */}
      <div className="search-section">
        <h2>{t('foods.search_add_title', 'Buscar y Agregar Alimentos')}</h2>

        <div className="search-filters">
          <input
            type="text"
            placeholder={t('foods.search_ph', 'Buscar alimento...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">{t('foods.all_categories', 'Todas las categorías')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="barcode-box">
            <input
              type="text"
              placeholder={t('foods.barcode_ph', 'Escanear o escribir código...')}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button className="btn-primary" onClick={handleFindByBarcode}>{t('common.search', 'Buscar')}</button>
            {!scanning ? (
              <button className="btn-secondary" onClick={startScan}>{t('foods.scan', 'Escanear')}</button>
            ) : (
              <button className="btn-secondary" onClick={stopScan}>{t('foods.stop_scan', 'Detener')}</button>
            )}
          </div>
        </div>
        {scanning && (
          <div className="scan-box">
            <video ref={videoRef} muted playsInline className="scan-video" />
            {scanError && <div className="scan-error">{scanError}</div>}
          </div>
        )}
        {canCreateFood && showQuickCreate && (
          <div className="selected-food-detail" style={{marginTop:12}}>
            <div className="detail-info">
              <h3>{t('foods.quick_create', 'Crear alimento')}</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder={t('common.name', 'Nombre')}
                  value={quickForm.nombre}
                  onChange={(e) => setQuickForm({ ...quickForm, nombre: e.target.value })}
                />
                <input
                  type="text"
                  placeholder={t('foods.category', 'Categoría')}
                  value={quickForm.categoria}
                  onChange={(e) => setQuickForm({ ...quickForm, categoria: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <input
                  type="text"
                  placeholder={t('foods.barcode', 'Código de Barras')}
                  value={quickForm.barcode}
                  onChange={(e) => setQuickForm({ ...quickForm, barcode: e.target.value })}
                />
                <input
                  type="text"
                  placeholder={t('foods.brand', 'Marca')}
                  value={quickForm.marca}
                  onChange={(e) => setQuickForm({ ...quickForm, marca: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <input
                  type="number"
                  placeholder={t('foods.serving_ph', 'Porción (ej. 100)')}
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
                  placeholder={t('foods.calories', 'Calorías')}
                  value={quickForm.calorias}
                  onChange={(e) => setQuickForm({ ...quickForm, calorias: e.target.value })}
                />
                <input
                  type="number"
                  placeholder={t('foods.protein', 'Proteína (g)')}
                  value={quickForm.proteina}
                  onChange={(e) => setQuickForm({ ...quickForm, proteina: e.target.value })}
                />
                <input
                  type="number"
                  placeholder={t('foods.carbs', 'Carbohidratos (g)')}
                  value={quickForm.carbohidratos}
                  onChange={(e) => setQuickForm({ ...quickForm, carbohidratos: e.target.value })}
                />
                <input
                  type="number"
                  placeholder={t('foods.fats', 'Grasas (g)')}
                  value={quickForm.grasas}
                  onChange={(e) => setQuickForm({ ...quickForm, grasas: e.target.value })}
                />
              </div>
              <div className="form-row" style={{marginTop:10}}>
                <button className="btn-primary" onClick={handleQuickCreate}>{t('foods.create_food', 'Crear alimento')}</button>
                <button className="btn-secondary" onClick={() => setShowQuickCreate(false)}>{t('common.cancel', 'Cancelar')}</button>
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
              {tab === 'Todas' ? t('groups.all', 'Todas') :
               tab === 'Proteínas' ? t('groups.protein', 'Proteínas') :
               tab === 'Carbohidratos' ? t('groups.carbs', 'Carbohidratos') :
               t('groups.fats', 'Grasas')}
            </button>
          ))}
        </div>

        {/* Grid de alimentos */}
        <div className="foods-grid">
          {filteredFoods.slice(0, showCount).map((food) => (
            <div
              key={food.id}
              className={`food-card ${selectedFood?.id === food.id ? 'active' : ''}`}
              onClick={() => openFoodModal(food)}
            >
              <h3>{food.nombre}</h3>
              <p className="category">{food.categoria}</p>
              <div className="macros-preview">
                <span>🔥 {Math.round(food.calorias)}</span>
                <span>🥚 {food.proteina.toFixed(1)}g</span>
              </div>
            </div>
          ))}
        </div>
        {filteredFoods.length > showCount && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="btn-primary" onClick={() => setShowCount(showCount + 24)}>
              {t('foods.view_more', 'Ver más alimentos')}
            </button>
          </div>
        )}

        {/* Modal para asignar alimento */}
        {foodModalOpen && foodModalFood && (
          <div className="form-modal-overlay" onClick={closeFoodModal}>
            <div className="form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="form-modal-header">
            <h2>{t('foodlog.assign_food', 'Asignar alimento')}</h2>
                <button className="policy-close-btn" onClick={closeFoodModal}>✕</button>
              </div>
              <div className="form-modal-content">
                <div className="selected-food-detail" style={{ marginTop: 0 }}>
                  <div className="detail-info">
                    <h3>{foodModalFood.nombre}</h3>
                    <p className="portion">{t('foodlog.base_portion', 'Porción base')}: {foodModalFood.cantidad} {foodModalFood.unidad} · {foodModalFood.categoria}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-group">
                        <label>{t('foodlog.portions', 'Porciones (enteros)')}</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={foodModalPortions}
                          onChange={(e) => setFoodModalPortions(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t('foodlog.meal', 'Comida')}</label>
                        <select value={foodModalMeal} onChange={(e) => setFoodModalMeal(e.target.value)}>
                          <option value="Desayuno">{t('meals.breakfast', 'Desayuno')}</option>
                          <option value="Almuerzo">{t('meals.lunch', 'Almuerzo')}</option>
                          <option value="Cena">{t('meals.dinner', 'Cena')}</option>
                          <option value="Snack">{t('meals.snack', 'Snack')}</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>{t('foodlog.equals', 'Equivale a')}</label>
                        <input
                          type="text"
                          readOnly
                          value={`${foodModalPortions * foodModalFood.cantidad} ${foodModalFood.unidad}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="detail-macros">
                    <div className="macro-box">
                      <span>{t('ai.calories', 'Calorías')}</span>
                      <strong>{Math.round(foodModalFood.calorias * foodModalPortions)}</strong>
                    </div>
                    <div className="macro-box">
                      <span>{t('ai.protein', 'Proteína')}</span>
                      <strong>{(foodModalFood.proteina * foodModalPortions).toFixed(1)}g</strong>
                    </div>
                    <div className="macro-box">
                      <span>{t('ai.carbs', 'Carbohidratos')}</span>
                      <strong>{(foodModalFood.carbohidratos * foodModalPortions).toFixed(1)}g</strong>
                    </div>
                    <div className="macro-box">
                      <span>{t('ai.fats', 'Grasas')}</span>
                      <strong>{(foodModalFood.grasas * foodModalPortions).toFixed(1)}g</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-modal-footer">
                <button className="btn-secondary" onClick={closeFoodModal}>{t('common.cancel', 'Cancelar')}</button>
                <button className="btn-primary" onClick={submitFoodModal}>{t('foodlog.add_to_log', 'Agregar al registro')}</button>
              </div>
            </div>
          </div>
        )}

        {message && <div className="message">{message}</div>}
        </div>

        {/* Se elimina el resumen fijo del día; ahora se muestra en modal con el botón */}

        <div className="meal-logs-section">
        {Object.entries(mealGroups).map(([meal, logs]) => (
          <div key={meal} className="meal-group">
            <h3>
              {meal === 'Desayuno' && '🌅'}
              {meal === 'Almuerzo' && '🌞'}
              {meal === 'Cena' && '🌙'}
              {meal === 'Snack' && '🍿'}
              {' '}{mealLabel(meal)}
            </h3>

            {logs.length === 0 ? (
              <p className="no-foods">{t('foodlog.no_records_meal', 'No hay registros para esta comida')}</p>
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
        </div>
        {summaryOpen && (
          <div className="policy-modal-overlay" onClick={() => setSummaryOpen(false)}>
            <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
              <div className="policy-modal-header">
                <h2>{t('foodlog.summary_title', 'Resumen de alimentos')} - {selectedDate}</h2>
                <button className="policy-close-btn" onClick={() => setSummaryOpen(false)}>✕</button>
              </div>
              <div className="policy-modal-content" style={{maxHeight:'60vh', overflow:'auto'}}>
                {(['Desayuno','Almuerzo','Cena','Snack']).map((meal) => {
                  const logs = mealGroups[meal] || [];
                  const totals = logs.reduce((acc, l) => {
                    acc.calorias += l.calorias || 0;
                    acc.proteina += l.proteina || 0;
                    acc.carbohidratos += l.carbohidratos || 0;
                    acc.grasas += l.grasas || 0;
                    return acc;
                  }, {calorias:0, proteina:0, carbohidratos:0, grasas:0});
                  return (
                    <div key={meal} className="plan-summary" style={{marginBottom:16}}>
                      <h2 style={{marginBottom:8}}>{mealLabel(meal)}</h2>
                      <div className="totals-card">
                        <div className="progress-item">
                          <label>{t('ai.calories', 'Calorías')}</label>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min((totals.calorias / plan.calorias) * 100, 100)}%` }} />
                          </div>
                          <span>{Math.round(totals.calorias)} kcal</span>
                        </div>
                        <div className="progress-item">
                          <label>{t('ai.protein', 'Proteína')}</label>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(((totals.proteina) / plan.proteina) * 100, 100)}%` }} />
                          </div>
                          <span>{totals.proteina.toFixed(1)} g</span>
                        </div>
                        <div className="progress-item">
                          <label>{t('ai.carbs', 'Carbohidratos')}</label>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(((totals.carbohidratos) / plan.carbohidratos) * 100, 100)}%` }} />
                          </div>
                          <span>{totals.carbohidratos.toFixed(1)} g</span>
                        </div>
                        <div className="progress-item">
                          <label>Grasas</label>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.min(((totals.grasas) / plan.grasas) * 100, 100)}%` }} />
                          </div>
                          <span>{totals.grasas.toFixed(1)} g</span>
                        </div>
                      </div>
                      {logs.length > 0 ? (
                        <div className="logs-list" style={{marginTop:8}}>
                          {logs.map((log) => (
                            <div key={log.id} className="log-item">
                              <div className="log-info">
                                <h4>{log.foodNombre}</h4>
                                <p className="portion">{log.cantidad} {log.unidad}</p>
                              </div>
                              <div className="log-macros">
                                <span>🔥 {Math.round(log.calorias)}</span>
                                <span>🥚 {log.proteina.toFixed(1)}g</span>
                                <span>🥣 {log.carbohidratos.toFixed(1)}g</span>
                                <span>🧈 {log.grasas.toFixed(1)}g</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-foods">{t('foodlog.no_records_in', 'Sin registros en')} {meal}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="policy-modal-footer">
                <button className="btn-primary" onClick={() => setSummaryOpen(false)}>{t('common.close', 'Cerrar')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
