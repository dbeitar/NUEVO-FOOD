import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Search, Clock, Users, Zap, X, ChefHat, CheckCircle } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { fetchTodayLogs } from '../../store/nutritionSlice'
import { AppDispatch } from '../../store/store'
import toast from 'react-hot-toast'

const CATEGORIES = ['Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Postre']
const OBJECTIVES = [
  { value: '', label: 'Todos los objetivos' },
  { value: 'LOSE', label: '🔥 Bajar peso' },
  { value: 'MAINTAIN', label: '⚖️ Mantener peso' },
  { value: 'GAIN', label: '💪 Ganar músculo' },
]
const OBJ_LABELS: Record<string, string> = {
  LOSE: '🔥 Bajar peso', MAINTAIN: '⚖️ Mantener', GAIN: '💪 Ganar músculo',
}
const CAT_COLORS: Record<string, string> = {
  Desayuno: 'bg-yellow-100 text-yellow-700',
  Almuerzo: 'bg-green-100 text-green-700',
  Cena:     'bg-indigo-100 text-indigo-700',
  Snack:    'bg-orange-100 text-orange-700',
  Postre:   'bg-pink-100 text-pink-700',
}
const MEAL_TYPES = [
  { value: 'BREAKFAST', label: '🌅 Desayuno' },
  { value: 'LUNCH',     label: '☀️ Almuerzo' },
  { value: 'DINNER',    label: '🌙 Cena' },
  { value: 'SNACK',     label: '🍎 Snack' },
]

export default function RecipesPage() {
  const dispatch = useDispatch<AppDispatch>()
  const [recipes, setRecipes]             = useState<any[]>([])
  const [loading, setLoading]             = useState(false)
  const [search, setSearch]               = useState('')
  const [category, setCategory]           = useState('Todas')
  const [objective, setObjective]         = useState('')
  const [selected, setSelected]           = useState<any>(null)
  const [registerModal, setRegisterModal] = useState<any>(null)
  const [servings, setServings]           = useState(1)
  const [mealType, setMealType]           = useState('LUNCH')
  const [registering, setRegistering]     = useState(false)

  const loadRecipes = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (category !== 'Todas') params.category = category
      if (objective) params.objective = objective
      const { data } = await api.get('/recipes', { params })
      setRecipes(data)
    } catch { setRecipes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRecipes() }, [category, objective])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); loadRecipes() }

  const parseJSON = (str: string) => { try { return JSON.parse(str) } catch { return [] } }

  const openRegister = (recipe: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRegisterModal(recipe)
    setServings(1)
    setMealType('LUNCH')
    setSelected(null)
  }

  const registerRecipe = async () => {
    if (!registerModal) return
    setRegistering(true)
    try {
      await api.post('/nutrition/logs/recipe', {
        recipeId: registerModal.id,
        recipeName: registerModal.name,
        servings,
        mealType,
        calories: Number(registerModal.calories) || 0,
        protein:  Number(registerModal.protein)  || 0,
        carbs:    Number(registerModal.carbs)    || 0,
        fat:      Number(registerModal.fat)      || 0,
      })
      dispatch(fetchTodayLogs())
      toast.success(registerModal.name + ' registrada en tu dashboard')
      setRegisterModal(null)
    } catch {
      toast.error('Error al registrar la receta')
    } finally { setRegistering(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">

      {/* Header */}
      <div className="pt-4 pb-6 flex items-center gap-3">
        <span className="text-4xl">👨‍🍳</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recetas del Chef Nico</h1>
          <p className="text-sm text-gray-500">Recetas saludables para alcanzar tus metas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar receta..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
            Buscar
          </button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={"px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all " +
                (category === cat ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300')}>
              {cat}
            </button>
          ))}
        </div>

        <select value={objective} onChange={e => setObjective(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Recipe grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando recetas...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🍽️</span>
          <p className="text-gray-500 mt-3">No hay recetas disponibles aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recipes.map(r => (
            <div key={r.id} className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all overflow-hidden">
              <button className="w-full text-left" onClick={() => setSelected(r)}>
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                    <span className="text-5xl">👨‍🍳</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{r.name}</h3>
                    {r.category && (
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 " + (CAT_COLORS[r.category] || 'bg-gray-100 text-gray-600')}>
                        {r.category}
                      </span>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {r.prepTimeMin && <span className="flex items-center gap-1"><Clock size={12} /> {r.prepTimeMin} min</span>}
                    {r.servings    && <span className="flex items-center gap-1"><Users size={12} /> {r.servings} porc.</span>}
                    {r.calories    && <span className="flex items-center gap-1"><Zap size={12} /> {r.calories} kcal</span>}
                  </div>
                  {r.objective && <p className="text-xs text-green-600 font-medium mt-2">{OBJ_LABELS[r.objective]}</p>}
                </div>
              </button>

              {r.calories && (
                <button onClick={e => openRegister(r, e)}
                  className="absolute bottom-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center gap-1 shadow-md">
                  <ChefHat size={11} /> Preparé esta
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recipe detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="relative flex-shrink-0">
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.name} className="w-full h-48 object-cover sm:rounded-t-2xl" />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center sm:rounded-t-2xl">
                  <span className="text-6xl">👨‍🍳</span>
                </div>
              )}
              <button onClick={() => setSelected(null)}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-full shadow hover:bg-white">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {selected.category && (
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (CAT_COLORS[selected.category] || 'bg-gray-100 text-gray-600')}>
                      {selected.category}
                    </span>
                  )}
                  {selected.objective && <span className="text-xs text-green-600 font-medium">{OBJ_LABELS[selected.objective]}</span>}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                {selected.description && <p className="text-sm text-gray-500 mt-1">{selected.description}</p>}
              </div>

              {selected.calories && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calorías', value: selected.calories, unit: 'kcal', color: 'bg-orange-50 text-orange-700' },
                    { label: 'Proteína', value: selected.protein,  unit: 'g',    color: 'bg-blue-50 text-blue-700' },
                    { label: 'Carbs',    value: selected.carbs,    unit: 'g',    color: 'bg-yellow-50 text-yellow-700' },
                    { label: 'Grasas',   value: selected.fat,      unit: 'g',    color: 'bg-red-50 text-red-700' },
                  ].filter(s => s.value).map(s => (
                    <div key={s.label} className={"rounded-xl p-2 text-center " + s.color}>
                      <p className="text-xs opacity-70">{s.label}</p>
                      <p className="font-bold text-sm">{s.value}{s.unit}</p>
                    </div>
                  ))}
                </div>
              )}

              {selected.calories && (
                <button onClick={() => openRegister(selected)}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors">
                  <ChefHat size={18} /> Preparé esta receta — registrar macros
                </button>
              )}

              <div className="flex gap-4 text-sm text-gray-500">
                {selected.prepTimeMin && <span className="flex items-center gap-1"><Clock size={14} /> {selected.prepTimeMin} min</span>}
                {selected.servings    && <span className="flex items-center gap-1"><Users size={14} /> {selected.servings} porciones</span>}
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">🛒 Ingredientes</h3>
                <ul className="space-y-1.5">
                  {parseJSON(selected.ingredients).map((ing: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                      <span className="font-medium">{ing.quantity} {ing.unit}</span>
                      <span>{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">📋 Preparación</h3>
                <ol className="space-y-3">
                  {parseJSON(selected.steps).map((step: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register modal */}
      {registerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ChefHat size={18} className="text-green-500" /> Registrar receta
              </h3>
              <button onClick={() => setRegisterModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <p className="text-sm text-gray-600 mb-4 font-medium">{registerModal.name}</p>

            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              {[
                { label: 'Kcal',   value: Math.round(Number(registerModal.calories || 0) * servings),       color: 'bg-orange-100 text-orange-700' },
                { label: 'Prot',   value: Math.round(Number(registerModal.protein  || 0) * servings) + 'g', color: 'bg-red-100 text-red-700' },
                { label: 'Carbs',  value: Math.round(Number(registerModal.carbs    || 0) * servings) + 'g', color: 'bg-yellow-100 text-yellow-700' },
                { label: 'Grasas', value: Math.round(Number(registerModal.fat      || 0) * servings) + 'g', color: 'bg-blue-100 text-blue-700' },
              ].map(s => (
                <div key={s.label} className={"rounded-xl p-2 " + s.color}>
                  <p className="font-bold text-sm">{s.value}</p>
                  <p className="text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600 font-medium w-24">Porciones:</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setServings(s => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-lg flex items-center justify-center">−</button>
                <span className="w-8 text-center font-bold">{servings}</span>
                <button onClick={() => setServings(s => Math.min(10, Math.round((s + 0.5) * 10) / 10))}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-lg flex items-center justify-center">+</button>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-sm text-gray-600 font-medium block mb-2">Comida del día:</label>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map(m => (
                  <button key={m.value} onClick={() => setMealType(m.value)}
                    className={"py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all " +
                      (mealType === m.value ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300')}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRegisterModal(null)}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={registerRecipe} disabled={registering}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                {registering ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
