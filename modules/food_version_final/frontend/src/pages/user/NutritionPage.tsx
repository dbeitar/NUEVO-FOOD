import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useFeature } from '../../hooks/useFeature'
import { Search, Plus, Trash2, ArrowRightLeft, Sparkles, Star, ChevronDown, ChevronUp, X, ScanLine, Loader2, BookOpen, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../services/api'
import { addFoodLog, deleteFoodLog, fetchTodayLogs } from '../../store/nutritionSlice'
import { AppDispatch } from '../../store/store'
import BarcodeScanner from '../../components/BarcodeScanner'

const PRESET_MEALS = [
  { key: 'BREAKFAST', label: '🌅 Desayuno' },
  { key: 'LUNCH',     label: '☀️ Almuerzo' },
  { key: 'DINNER',    label: '🌙 Cena' },
  { key: 'SNACK',     label: '🍎 Snack' },
  { key: 'CUSTOM',    label: '⭐ Otra comida' },
]

export default function NutritionPage() {
  const dispatch = useDispatch<AppDispatch>()
  const [activeMeal, setActiveMeal]       = useState('BREAKFAST')
  const [customMealName, setCustomMealName] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [search, setSearch]               = useState('')
  const [foods, setFoods]                 = useState<any[]>([])
  const [selected, setSelected]           = useState<any>(null)
  const [quantity, setQuantity]           = useState('100')
  const [todayLogs, setTodayLogs]         = useState<any>(null)
  const [equivalences, setEquivalences]   = useState<any[]>([])
  const [showEq, setShowEq]               = useState(false)
  const [frequentFoods, setFrequentFoods] = useState<any[]>([])
  const [usualMeals, setUsualMeals]       = useState<any[]>([])
  const [showUsualMeals, setShowUsualMeals] = useState(false)
  const [usualMealModal, setUsualMealModal] = useState<any>(null)
  const [usualPortions, setUsualPortions]  = useState<Record<string, number>>({})
  const [savingMeal, setSavingMeal]        = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [goals, setGoals]                 = useState<any>(null)
  const [showScanner, setShowScanner]     = useState(false)
  const [scanLoading, setScanLoading]     = useState(false)
  const hasBarcodeScanner = useFeature('barcode_scanner')
  const scanBusy = useRef(false)

  const loadLogs = useCallback(async () => {
    try { const { data } = await api.get('/nutrition/logs/today'); setTodayLogs(data) } catch {}
  }, [])

  const handleBarcodeScan = async (barcode: string) => {
    if (scanBusy.current) return
    scanBusy.current = true
    setShowScanner(false)
    setScanLoading(true)
    try {
      // Query Open Food Facts API
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()

      if (data.status === 0 || !data.product) {
        toast.error('Producto no encontrado en la base de datos')
        setScanLoading(false)
        return
      }

      const p = data.product
      const nutriments = p.nutriments || {}

      // Build a food-like object from the API response
      const food = {
        id: null,
        name: p.product_name || p.product_name_es || 'Producto escaneado',
        category: p.categories_tags?.[0]?.replace('en:', '') || 'Escaneado',
        caloriesPer100g: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        proteinPer100g:  nutriments['proteins_100g']    || 0,
        carbsPer100g:    nutriments['carbohydrates_100g'] || 0,
        fatPer100g:      nutriments['fat_100g']          || 0,
        unit: 'g',
        gramsPerUnit: null,
        _isScanned: true,
        _barcode: barcode,
        _servingSize: p.serving_size || null,
      }

      if (!food.caloriesPer100g) {
        toast.error('No se encontraron datos nutricionales para este producto')
        setScanLoading(false)
        return
      }

      setSelected(food)
      setSearch(food.name)
      setFoods([])
      setQuantity('100')
      toast.success('¡Producto encontrado: ' + food.name + '!')
    } catch {
      toast.error('Error al buscar el producto. Intenta de nuevo.')
    } finally {
      setScanLoading(false)
      scanBusy.current = false
    }
  }

  const handleAddScanned = async () => {
    if (!selected?._isScanned || !quantity) return
    if (activeMeal === 'CUSTOM' && !customMealName.trim()) {
      toast.error('Escribe el nombre de la comida'); return
    }
    const factor = Number(quantity) / 100
    const payload: any = {
      mealType: activeMeal,
      logDate: undefined,
      customMealName: activeMeal === 'CUSTOM' ? customMealName.trim() : undefined,
      // For scanned foods we send macros directly
      _scannedFood: {
        name: selected.name,
        quantityGrams: Number(quantity),
        calories: Math.round(selected.caloriesPer100g * factor * 100) / 100,
        protein:  Math.round(selected.proteinPer100g  * factor * 100) / 100,
        carbs:    Math.round(selected.carbsPer100g    * factor * 100) / 100,
        fat:      Math.round(selected.fatPer100g      * factor * 100) / 100,
      }
    }
    // Use recipe log endpoint for scanned foods (no foodItemId needed)
    try {
      await api.post('/nutrition/logs/recipe', {
        recipeId: null,
        recipeName: selected.name,
        servings: 1,
        mealType: activeMeal,
        calories: Math.round(selected.caloriesPer100g * factor * 100) / 100,
        protein:  Math.round(selected.proteinPer100g  * factor * 100) / 100,
        carbs:    Math.round(selected.carbsPer100g    * factor * 100) / 100,
        fat:      Math.round(selected.fatPer100g      * factor * 100) / 100,
        quantityGrams: Number(quantity),
      })
      toast.success('Alimento registrado')
      setSelected(null); setSearch(''); setQuantity('100'); setFoods([])
      loadLogs(); dispatch(fetchTodayLogs())
    } catch {
      toast.error('Error al registrar el alimento')
    }
  }


  useEffect(() => {
    loadLogs()
    api.get('/nutrition/frequent-foods').then(r => setFrequentFoods(r.data)).catch(() => {})
    api.get('/nutrition/usual-meals').then(r => setUsualMeals(r.data || [])).catch(() => {})
    api.get('/nutrition/goals').then(r => setGoals(r.data)).catch(() => {})
  }, [loadLogs])

  useEffect(() => {
    if (search.length < 2) { setFoods([]); return }
    const t = setTimeout(async () => {
      try { const { data } = await api.get(`/nutrition/foods/search?q=${search}&limit=12`); setFoods(data) } catch {}
    }, 300)

  }, [search])

  const deleteUsualMeal = async (mealId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar esta comida habitual?")) return
    try {
      await api.delete(`/nutrition/usual-meals/${mealId}`)
      setUsualMeals(prev => prev.filter((m: any) => m.id !== mealId))
    } catch {}
  }

  const registerUsualMeal = async (meal: any) => {
    setUsualMealModal(meal)
    const portions: Record<string, number> = {}
    meal.items?.forEach((_: any, i: number) => { portions[i] = 1 })
    setUsualPortions(portions)
  }

  const confirmUsualMeal = async () => {
    if (!usualMealModal) return
    setSavingMeal(true)
    try {
      const items = usualMealModal.items || []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const portions = usualPortions[i] ?? 1
        await dispatch(addFoodLog({
          foodItemId: item.foodItemId,
          quantityGrams: Math.round(Number(item.quantityGrams) * portions),
          mealType: usualMealModal.mealType || activeMeal,
          customMealName: usualMealModal.name,
        }))
      }
      dispatch(fetchTodayLogs())
      loadLogs()
      toast.success(`✅ ${usualMealModal.name} registrada`)
      setUsualMealModal(null)
      setShowUsualMeals(false)
    } catch {
      toast.error('Error al registrar la comida')
    } finally { setSavingMeal(false) }
  }

  const saveCurrentAsUsual = async () => {
    if (!todayLogs) return
    const mealLogs = todayLogs.logs?.filter((l: any) => l.mealType === activeMeal) || []
    if (mealLogs.length === 0) { toast.error('No hay alimentos en esta comida'); return }
    const name = prompt('Nombre para esta comida habitual:')
    if (!name) return
    setSavingMeal(true)
    try {
      const items = mealLogs.map((l: any) => ({
        foodItemId: l.foodItemId,
        name: l.foodItem?.name || l.customMealName,
        quantityGrams: l.quantityGrams,
        calories: l.calories,
        protein: l.protein,
        carbs: l.carbs,
        fat: l.fat,
      }))
      await api.post('/nutrition/usual-meals', {
        name,
        mealType: activeMeal,
        items,
        totalCalories: mealLogs.reduce((a: number, l: any) => a + Number(l.calories), 0),
        totalProtein:  mealLogs.reduce((a: number, l: any) => a + Number(l.protein), 0),
        totalCarbs:    mealLogs.reduce((a: number, l: any) => a + Number(l.carbs), 0),
        totalFat:      mealLogs.reduce((a: number, l: any) => a + Number(l.fat), 0),
      })
      const r = await api.get('/nutrition/usual-meals')
      setUsualMeals(r.data || [])
      toast.success(`✅ "${name}" guardada como comida habitual`)
    } catch { toast.error('Error al guardar') }
    finally { setSavingMeal(false) }
  }


  const isUnitFood = selected?.unit === 'unidad' || selected?.unit === 'unidades'
  const preview = selected && quantity ? (() => {
    // For unit foods: convert units → grams first
    const gramsForCalc = isUnitFood && selected.gramsPerUnit
      ? Number(quantity) * Number(selected.gramsPerUnit)
      : Number(quantity)
    const f = gramsForCalc / 100
    return {
      calories: Math.round((selected.caloriesPer100g || selected.calories_per_100g || 0) * f * 10) / 10,
      protein:  Math.round((selected.proteinPer100g  || selected.protein_per_100g  || 0) * f * 10) / 10,
      carbs:    Math.round((selected.carbsPer100g    || selected.carbs_per_100g    || 0) * f * 10) / 10,
      fat:      Math.round((selected.fatPer100g      || selected.fat_per_100g      || 0) * f * 10) / 10,
    }
  })() : null

  const handleAdd = async () => {
    if (!selected || !quantity) return

    // Handle scanned food (no foodItemId)
    if (selected._isScanned) {
      await handleAddScanned()
      return
    }

    if (activeMeal === 'CUSTOM' && !customMealName.trim()) {
      toast.error('Escribe el nombre de la comida'); return
    }
    const payload: any = {
      foodItemId: selected.id || selected.fooditemid,
      quantityGrams: Number(quantity),
      mealType: activeMeal,
    }
    if (activeMeal === 'CUSTOM') payload.customMealName = customMealName.trim()

    const result = await dispatch(addFoodLog(payload))
    if (addFoodLog.fulfilled.match(result)) {
      toast.success('Alimento registrado')
      setSelected(null); setSearch(''); setQuantity('100'); setFoods([])
      loadLogs(); dispatch(fetchTodayLogs())
    }
  }

  const handleDelete = async (id: string) => {
    await dispatch(deleteFoodLog(id))
    loadLogs(); dispatch(fetchTodayLogs())
    toast.success('Registro eliminado')
  }

  const loadEquivalences = async (foodId: string) => {
    const { data } = await api.get(`/nutrition/equivalences/${foodId}`)
    setEquivalences(data); setShowEq(true)
  }

  const selectFood = (f: any) => {
    // normalize field names from raw query or entity
    const normalized = {
      id: f.id || f.fooditemid,
      name: f.name,
      category: f.category,
      unit: f.unit || 'g',
      gramsPerUnit: f.gramsPerUnit || f.grams_per_unit || null,
      caloriesPer100g: f.caloriesPer100g || f.calories_per_100g || 0,
      proteinPer100g:  f.proteinPer100g  || f.protein_per_100g  || 0,
      carbsPer100g:    f.carbsPer100g    || f.carbs_per_100g    || 0,
      fatPer100g:      f.fatPer100g      || f.fat_per_100g      || 0,
    }
    // Set default quantity: 1 unit for unit foods, 100g for gram foods
    const isUnit = normalized.unit === 'unidad' || normalized.unit === 'unidades'
    setQuantity(isUnit ? '1' : '100')
    setSelected(normalized); setFoods([]); setShowSuggestions(false)
  }

  // Suggested portions based on plan
  const getSuggestedGrams = (food: any) => {
    if (!goals || !food.caloriesPer100g) return 100
    const mealCalTarget = goals.dailyCalories / 4
    const g = Math.round((mealCalTarget / food.caloriesPer100g) * 100)
    return Math.min(Math.max(g, 50), 400)
  }

  // All logs across all meals for current meal view
  const mealLogs = activeMeal === 'CUSTOM'
    ? (todayLogs?.logs || []).filter((l: any) => l.mealType === 'CUSTOM')
    : (todayLogs?.byMeal?.[activeMeal] || [])

  const activeMealLabel = activeMeal === 'CUSTOM'
    ? (customMealName ? `⭐ ${customMealName}` : '⭐ Otra comida')
    : PRESET_MEALS.find(m => m.key === activeMeal)?.label || activeMeal

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Registro Nutricional</h1>

      {/* Meal tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {PRESET_MEALS.map(m => (
          <button key={m.key}
            onClick={() => { setActiveMeal(m.key); if (m.key === 'CUSTOM') setShowCustomInput(true) }}
            className={`px-3 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
              activeMeal === m.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {m.label}
            <span className="ml-1 opacity-70">
              ({m.key === 'CUSTOM'
                ? (todayLogs?.logs || []).filter((l: any) => l.mealType === 'CUSTOM').length
                : (todayLogs?.byMeal?.[m.key] || []).length})
            </span>
          </button>
        ))}
      </div>

      {/* Custom meal name input */}
      {activeMeal === 'CUSTOM' && showCustomInput && (
        <div className="card mb-4 flex items-center gap-3">
          <span className="text-gray-500 text-sm flex-shrink-0">Nombre de la comida:</span>
          <input className="input flex-1" placeholder="Ej: Merienda, Media mañana, Antes de dormir..."
            value={customMealName} onChange={e => setCustomMealName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setShowCustomInput(false)} />
          <button onClick={() => setShowCustomInput(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: search & add */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Agregar a {activeMealLabel}</h2>
            <button onClick={() => setShowSuggestions(!showSuggestions)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                showSuggestions ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <Sparkles size={12} /> Sugerencias
              {showSuggestions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Suggestions panel */}
          {showSuggestions && (
            <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-2 flex items-center gap-1">
                <Star size={12} /> Tus alimentos frecuentes
              </p>
              {frequentFoods.length === 0 ? (
                <p className="text-xs text-gray-400">Aún no tienes frecuentes. ¡Registra más comidas!</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {frequentFoods.map((f: any) => {
                    const suggested = getSuggestedGrams(f)
                    return (
                      <button key={f.fooditemid || f.id} onClick={() => {
                        selectFood(f); setQuantity(String(suggested))
                      }}
                        className="w-full flex items-center justify-between text-left px-3 py-2 bg-white rounded-lg hover:bg-primary-50 border border-transparent hover:border-primary-200 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{f.name}</p>
                          <p className="text-xs text-gray-400">{Math.round(f.calories || f.calories_per_100g || 0)} kcal/100g</p>
                        </div>
                        <span className="text-xs text-primary-600 font-medium flex-shrink-0 ml-2">~{suggested}g sugeridos</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {goals && (
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-700 mb-1 flex items-center gap-1">
                    <Sparkles size={12} /> Basado en tu plan ({Math.round(goals.dailyCalories / 4)} kcal por comida)
                  </p>
                  <p className="text-xs text-yellow-600">
                    Proteína objetivo: ~{Math.round(goals.dailyProteinG / 4)}g · 
                    Carbos: ~{Math.round(goals.dailyCarbsG / 4)}g · 
                    Grasa: ~{Math.round(goals.dailyFatG / 4)}g
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="input pl-9" placeholder="Buscar alimento..." value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null) }} />
          </div>
          {hasBarcodeScanner && <button onClick={() => { scanBusy.current = false; setShowScanner(true) }} className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-green-400 text-green-600 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors">
            📷 Escanear código de barras
          </button>}

          {/* Search results */}
          {foods.length > 0 && !selected && (
            <div className="border border-gray-200 rounded-xl divide-y max-h-52 overflow-y-auto">
              {foods.map(f => (
                <button key={f.id} onClick={() => selectFood(f)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                  <p className="font-medium text-sm text-gray-800">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.category} · {f.caloriesPer100g} kcal/100g</p>
                </button>
              ))}
            </div>
          )}

          {/* Selected food */}
          {selected && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-primary-800">{selected.name}</p>
                  <p className="text-xs text-primary-600">{selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadEquivalences(selected.id)}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <ArrowRightLeft size={11} /> Reemplazos
                  </button>
                  <button onClick={() => { setSelected(null); setSearch('') }} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  {isUnitFood ? 'Cantidad (unidades):' : 'Cantidad (g):'}
                </label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                  className="input w-24 text-center" min="1" max="200"
                  step={isUnitFood ? '1' : '5'} />
                <span className="text-sm text-gray-500">
                  {isUnitFood ? 'unid.' : 'g'}
                </span>
                {isUnitFood && selected.gramsPerUnit && (
                  <span className="text-xs text-gray-400">
                    ≈ {Math.round(Number(quantity || 1) * Number(selected.gramsPerUnit))}g
                  </span>
                )}
                {!isUnitFood && goals && (
                  <button onClick={() => setQuantity(String(getSuggestedGrams(selected)))}
                    className="text-xs text-primary-600 hover:underline flex-shrink-0">
                    Sugerido: {getSuggestedGrams(selected)}g
                  </button>
                )}
              </div>

              {preview && (
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  {[['Kcal', preview.calories, 'bg-orange-100 text-orange-700'],
                    ['Prot', preview.protein,  'bg-red-100 text-red-700'],
                    ['Carb', preview.carbs,    'bg-yellow-100 text-yellow-700'],
                    ['Grasa', preview.fat,     'bg-blue-100 text-blue-700']
                  ].map(([l, v, cls]) => (
                    <div key={l as string} className={`rounded-lg p-2 ${cls}`}>
                      <p className="text-base font-bold">{v}</p>
                      <p className="text-xs">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleAdd} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                <Plus size={16} /> Agregar a {activeMealLabel}
              </button>
            </div>
          )}
        </div>

        {/* Right: today's logs */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">{activeMealLabel}</h2>
          {mealLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sin registros en esta comida</p>
              <p className="text-xs mt-1">Busca o selecciona un alimento frecuente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mealLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {log.foodItem?.name}
                      {log.customMealName && <span className="text-xs text-gray-400 ml-1">({log.customMealName})</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.foodItem?.unit === 'unidad' || log.foodItem?.unit === 'unidades'
                        ? `${log.quantityGrams} unid.`
                        : `${log.quantityGrams}g`}
                      {' · '}{Math.round(log.calories)} kcal · {Math.round(log.protein)}g prot
                    </p>
                  </div>
                  <button onClick={() => handleDelete(log.id)}
                    className="text-gray-300 group-hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500 font-medium">
                <span>{mealLogs.length} alimento(s)</span>
                <span>{Math.round(mealLogs.reduce((a: number, l: any) => a + Number(l.calories), 0))} kcal total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equivalences modal */}
      {showEq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Reemplazos para {selected?.name}</h3>
              <button onClick={() => setShowEq(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {equivalences.length === 0 ? (
              <p className="text-gray-400 text-sm">No hay equivalencias registradas para este alimento.</p>
            ) : (
              <div className="space-y-3">
                {equivalences.map(eq => (
                  <div key={eq.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="font-medium text-gray-800">{eq.replacementFood?.name}</p>
                    <p className="text-sm text-gray-500">
                      {eq.originalQuantityG}g de {selected?.name} = <strong>{eq.replacementQuantityG}g</strong>
                    </p>
                    {eq.notes && <p className="text-xs text-gray-400 mt-1">{eq.notes}</p>}
                    <button onClick={() => {
                      selectFood(eq.replacementFood)
                      setQuantity(String(eq.replacementQuantityG))
                      setShowEq(false)
                    }} className="text-xs text-primary-600 hover:underline mt-1">
                      Usar este reemplazo →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Usual Meals Panel */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white mb-2">
        <button onClick={() => setShowUsualMeals(!showUsualMeals)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <span className="font-medium text-gray-700 flex items-center gap-2 text-sm">
            <BookOpen size={16} className="text-indigo-500" /> Comidas habituales
            {usualMeals.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{usualMeals.length}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); saveCurrentAsUsual() }}
              className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors" title="Guardar comida actual como habitual">
              <Save size={12} /> Guardar actual
            </button>
            {showUsualMeals ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>

        {showUsualMeals && (
          <div className="border-t border-gray-100">
            {usualMeals.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tienes comidas habituales guardadas</p>
                <p className="text-xs mt-1">Registra una comida y toca "Guardar actual" para guardarla</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                {usualMeals.map((meal: any) => (
                  <div key={meal.id} className="relative text-left p-3 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border border-gray-100 rounded-xl transition-all group cursor-pointer"
                    onClick={() => registerUsualMeal(meal)}>
                    <button onClick={e => deleteUsualMeal(meal.id, e)}
                      className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                    <p className="font-medium text-gray-800 text-sm pr-6">{meal.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Math.round(Number(meal.totalCalories) || 0)} kcal · {(meal.items || []).length} alimento(s)
                    </p>
                    <p className="text-xs text-indigo-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Toca para registrar →
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usual Meal confirmation modal */}
      {usualMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" /> {usualMealModal.name}
              </h3>
              <button onClick={() => setUsualMealModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-2 mb-4">
              {(usualMealModal.items || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{Math.round(item.quantityGrams * (usualPortions[i] ?? 1))}g · {Math.round(item.calories * (usualPortions[i] ?? 1))} kcal</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setUsualPortions(p => ({ ...p, [i]: Math.max(0.5, (p[i] ?? 1) - 0.5) }))}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold">−</button>
                    <span className="text-xs font-bold w-6 text-center">{usualPortions[i] ?? 1}x</span>
                    <button onClick={() => setUsualPortions(p => ({ ...p, [i]: (p[i] ?? 1) + 0.5 }))}
                      className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-50 rounded-xl p-3 text-center mb-4">
              <p className="text-sm font-bold text-green-700">
                Total: {Math.round((usualMealModal.items || []).reduce((a: number, item: any, i: number) => a + Number(item.calories) * (usualPortions[i] ?? 1), 0))} kcal
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setUsualMealModal(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmUsualMeal} disabled={savingMeal}
                className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus size={16} /> {savingMeal ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
