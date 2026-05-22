import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useFeature } from '../../hooks/useFeature'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Apple, Zap, Beef, Droplets, TrendingUp, AlertCircle, Flame, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { AppDispatch, RootState } from '../../store/store'
import { fetchTodayLogs, fetchGoals, fetchTrafficLight } from '../../store/nutritionSlice'
import { api } from '../../services/api'

function MacroCard({ label, current, goal, color, icon: Icon, unit = 'g' }: any) {
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}><Icon size={16} className="text-white" /></div>
          <span className="font-medium text-gray-700 text-sm">{label}</span>
        </div>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-xl font-bold text-gray-800">{Math.round(current)}</span>
        <span className="text-xs text-gray-400">/ {goal}{unit}</span>
      </div>
      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const trafficColors: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  GREEN:  { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  label: 'Excelente',        emoji: '🟢', icon: '🌟' },
  YELLOW: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'En progreso',      emoji: '🟡', icon: '💪' },
  RED:    { bg: 'bg-red-50 border-red-200',       text: 'text-red-700',    label: 'Necesitas mejorar',emoji: '🔴', icon: '🎯' },
}

const DAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export default function UserDashboard() {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((s: RootState) => s.auth)
  const { todayLogs, goals, trafficLight, loading } = useSelector((s: RootState) => s.nutrition)

  const [water, setWater] = useState<{ glasses: number; goal: number }>({ glasses: 0, goal: 8 })
  const [userProfile, setUserProfile] = useState<any>(null)
  const hasWaterTracking = useFeature('water_tracking')
  const hasStepsTracking = useFeature('steps_tracking')
  const [steps, setSteps] = useState(0)
  const [nutritionStats, setNutritionStats] = useState<any>(null)
  const [showStats, setShowStats] = useState(true)
  const [stepsInput, setStepsInput] = useState('')
  const [savingSteps, setSavingSteps] = useState(false)
  const [streak, setStreak] = useState(0)
  const [calendar, setCalendar] = useState<Record<string, boolean>>({})
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [notes, setNotes] = useState<any[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayLogs, setDayLogs] = useState<any>(null)
  const [loadingDay, setLoadingDay] = useState(false)

  const today = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })
  const totals = todayLogs?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const tl = trafficLight?.status || 'GREEN'
  const tlStyle = trafficColors[tl]

  useEffect(() => {
    dispatch(fetchTodayLogs())
    dispatch(fetchGoals())
    dispatch(fetchTrafficLight())
    loadWater()
    loadStreak()
    loadNotes()
    loadProfile()
    loadSteps()
    api.get('/nutrition/stats').then(r => setNutritionStats(r.data)).catch(() => {})
  }, [dispatch])

  useEffect(() => { loadCalendar() }, [calYear, calMonth])

  const loadNotes = async () => {
    try {
      const { data } = await api.get('/trainer/my-notes')
      setNotes(data)
      // Auto-show if there are unread notes
      if (data.some((n: any) => !n.isRead)) setShowNotes(true)
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.post('/trainer/my-notes/read-all')
      setNotes(n => n.map(note => ({ ...note, isRead: true })))
    } catch {}
  }

  const loadSteps = async () => {
    try {
      const r = await api.get('/nutrition/steps/today')
      setSteps(r.data.steps || 0)
      setStepsInput(String(r.data.steps || 0))
    } catch {}
  }

  const saveSteps = async () => {
    const val = parseInt(stepsInput) || 0
    setSavingSteps(true)
    try {
      const r = await api.post('/nutrition/steps/update', { steps: val })
      setSteps(r.data.steps)
      setStepsInput(String(r.data.steps))
    } catch {}
    finally { setSavingSteps(false) }
  }

  const loadProfile = async () => {
    try { const r = await api.get('/nutrition-plan/my-profile'); setUserProfile(r.data) } catch {}
  }

  const loadWater = async () => {
    try {
      const r = await api.get('/nutrition/water/today')
      setWater(r.data)
    } catch {}
  }

  const loadStreak = async () => {
    try { const r = await api.get('/nutrition/streak'); setStreak(r.data.streak) } catch {}
  }

  const loadCalendar = async () => {
    try {
      const r = await api.get(`/nutrition/calendar?year=${calYear}&month=${calMonth}`)
      setCalendar(r.data)
    } catch {}
  }

  const updateWater = async (delta: number) => {
    const waterGoal = userProfile?.dailyWaterGlasses || water.goal
    const next = Math.max(0, Math.min(waterGoal + 4, water.glasses + delta))
    try {
      const r = await api.post('/nutrition/water/update', { glasses: next })
      setWater(r.data)
    } catch { setWater(w => ({ ...w, glasses: next })) }
  }

  // Calendar helpers
  const firstDayOfMonth = new Date(calYear, calMonth - 1, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const monthName = format(new Date(calYear, calMonth - 1, 1), 'MMMM yyyy', { locale: es })

  const loadDayLogs = async (dateStr: string) => {
    if (selectedDay === dateStr) { setSelectedDay(null); setDayLogs(null); return }
    setSelectedDay(dateStr)
    setLoadingDay(true)
    try {
      const { data } = await api.get(`/nutrition/logs?date=${dateStr}`)
      setDayLogs(data)
    } catch { setDayLogs(null) }
    finally { setLoadingDay(false) }
  }

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">¡Hola, {user?.firstName}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Trainer Notes */}
      {notes.length > 0 && (
        <div className={`border rounded-xl mb-4 overflow-hidden ${showNotes ? 'border-purple-200' : 'border-gray-100'}`}>
          <button
            onClick={() => { setShowNotes(!showNotes); if (!showNotes) markAllRead() }}
            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-purple-600">📝</span>
              <span className="font-semibold text-sm text-purple-800">
                Notas de tu entrenador
              </span>
              {notes.some(n => !n.isRead) && (
                <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {notes.filter(n => !n.isRead).length} nuevas
                </span>
              )}
            </div>
            <span className="text-purple-400 text-xs">{showNotes ? '▲ Cerrar' : '▼ Ver'}</span>
          </button>
          {showNotes && (
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className={`rounded-lg p-3 ${n.isRead ? 'bg-gray-50' : 'bg-purple-50 border border-purple-200'}`}>
                  <p className="text-sm text-gray-700">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.trainer ? `${n.trainer.firstName} ${n.trainer.lastName} · ` : ''}
                    {new Date(n.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {!n.isRead && <span className="ml-2 text-purple-500 font-medium">● Nueva</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Traffic Light */}
      {/* Nutrition Stats Card */}
      {nutritionStats && (
        <div className="card mb-4">
          {/* Header row */}
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowStats(!showStats)}>
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              📊 Estado Nutricional
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
                <Flame size={16} className="text-orange-500" />
                <span className="font-bold text-orange-700 text-sm">{nutritionStats.streak} días</span>
                <span className="text-xs text-orange-500">racha</span>
              </div>
              {showStats ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>

          {/* Today's registration indicator */}
          <div className={`mt-3 flex items-center gap-3 px-3 py-2 rounded-xl ${
            totals.calories === 0
              ? 'bg-red-50 border border-red-200'
              : totals.calories >= (goals?.dailyCalories * 0.8 || 0)
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <span className="text-lg">
              {totals.calories === 0 ? '🔴' : totals.calories >= (goals?.dailyCalories * 0.8 || 0) ? '🟢' : '🟡'}
            </span>
            <div className="flex-1">
              <p className={`text-xs font-bold ${
                totals.calories === 0 ? 'text-red-700' :
                totals.calories >= (goals?.dailyCalories * 0.8 || 0) ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {totals.calories === 0
                  ? '❌ No has registrado comidas hoy'
                  : totals.calories >= (goals?.dailyCalories * 0.8 || 0)
                  ? '✅ ¡Llevas un excelente registro hoy!'
                  : '⚠️ Registro incompleto — sigue registrando'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {totals.calories > 0
                  ? `${Math.round(totals.calories)} / ${goals?.dailyCalories || 0} kcal registradas hoy`
                  : 'Registra tu primera comida del día'}
              </p>
            </div>
          </div>

          {showStats && (<>
          {/* Overall compliance */}
          <div className="mt-4 mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-gray-600 font-medium">Cumplimiento general</span>
              <span className={`text-base font-extrabold ${
                nutritionStats.overall >= 80 ? 'text-green-600' :
                nutritionStats.overall >= 50 ? 'text-yellow-600' : 'text-red-500'
              }`}>{nutritionStats.overall}%</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                nutritionStats.overall >= 80 ? 'bg-green-500' :
                nutritionStats.overall >= 50 ? 'bg-yellow-400' : 'bg-red-400'
              }`} style={{ width: `${nutritionStats.overall}%` }} />
            </div>
          </div>

          {/* Macros breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: '🔥 Calorías', value: nutritionStats.calories, color: 'bg-orange-400' },
              { label: '🥩 Proteína',  value: nutritionStats.protein,  color: 'bg-red-400' },
              { label: '🌾 Carbos',    value: nutritionStats.carbs,    color: 'bg-yellow-400' },
              { label: '🫒 Grasas',    value: nutritionStats.fat,      color: 'bg-blue-400' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-600">{m.label}</span>
                  <span className="text-xs font-bold text-gray-700">{m.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Motivational message */}
          <p className={`text-xs font-medium text-center py-2 px-3 rounded-xl ${
            nutritionStats.overall >= 80
              ? 'bg-green-50 text-green-700'
              : nutritionStats.overall >= 50
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {nutritionStats.streak > 5
              ? `🌟 ¡${nutritionStats.streak} días en racha! Tu consistencia es admirable.`
              : nutritionStats.overall >= 80
              ? '🌟 ¡Vas excelente! Tu disciplina está dando resultados.'
              : nutritionStats.overall >= 50
              ? '💪 Vas bien. Enfócate en los macros con menor cumplimiento.'
              : '🎯 Retoma el ritmo hoy. Cada registro cuenta para mejorar.'}
          </p>
          </>)}
        </div>
      )}

      {/* Macro Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MacroCard label="Calorías" current={totals.calories} goal={goals?.dailyCalories || 2000} color="bg-orange-500" icon={Zap} unit="kcal" />
        <MacroCard label="Proteínas" current={totals.protein} goal={goals?.dailyProteinG || 150} color="bg-red-500" icon={Beef} />
        <MacroCard label="Carbos" current={totals.carbs} goal={goals?.dailyCarbsG || 250} color="bg-yellow-500" icon={Apple} />
        <MacroCard label="Grasas" current={totals.fat} goal={goals?.dailyFatG || 65} color="bg-blue-500" icon={Droplets} />
      </div>

      {/* Selected day summary */}
      {selectedDay && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">
              📅 {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <button onClick={() => { setSelectedDay(null); setDayLogs(null) }}
              className="text-gray-400 hover:text-gray-600 text-xs">✕ Cerrar</button>
          </div>
          {loadingDay ? (
            <p className="text-gray-400 text-sm text-center py-4">Cargando...</p>
          ) : !dayLogs || dayLogs.logs?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No hay alimentos registrados este día</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                {[
                  { label: 'Kcal', value: Math.round(dayLogs.totals?.calories || 0), color: 'bg-orange-100 text-orange-700' },
                  { label: 'Prot', value: Math.round(dayLogs.totals?.protein || 0) + 'g', color: 'bg-red-100 text-red-700' },
                  { label: 'Carbs', value: Math.round(dayLogs.totals?.carbs || 0) + 'g', color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Grasas', value: Math.round(dayLogs.totals?.fat || 0) + 'g', color: 'bg-blue-100 text-blue-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-2 ${s.color}`}>
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              {Object.entries(dayLogs.byMeal || {}).map(([meal, logs]: any) => {
                if (!logs?.length) return null
                const mealLabels: Record<string, string> = {
                  BREAKFAST: '🌅 Desayuno', LUNCH: '☀️ Almuerzo',
                  DINNER: '🌙 Cena', SNACK: '🍎 Snack', CUSTOM: '⭐ Extra',
                }
                const label = logs[0]?.customMealName ? `⭐ ${logs[0].customMealName}` : (mealLabels[meal] || meal)
                return (
                  <div key={meal} className="border border-gray-100 rounded-lg p-2">
                    <p className="font-medium text-xs text-gray-600 mb-1">{label}</p>
                    {logs.map((log: any) => (
                      <div key={log.id} className="flex justify-between text-xs text-gray-500 py-0.5">
                        <span className="truncate mr-2">{log.foodItem?.name} ({log.quantityGrams}g)</span>
                        <span className="font-medium flex-shrink-0">{Math.round(log.calories)} kcal</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Water Tracker */}
        {hasWaterTracking && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Droplets size={18} className="text-blue-500" /> Agua de hoy
              </h2>
              <span className="text-sm text-gray-500">{water.glasses} / {userProfile?.dailyWaterGlasses || water.goal} vasos</span>
              {userProfile?.dailyWaterGlasses && userProfile.dailyWaterGlasses !== water.goal && (
                <span className="text-xs text-blue-400 ml-1">(meta del entrenador)</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {Array.from({ length: userProfile?.dailyWaterGlasses || water.goal }).map((_, i) => (
                <button key={i} onClick={() => updateWater(i < water.glasses ? -(water.glasses - i) : i - water.glasses + 1)}
                  className="transition-transform hover:scale-110 focus:outline-none">
                  <svg width="28" height="36" viewBox="0 0 28 36">
                    <path d="M6 8 L4 28 Q4 33 14 33 Q24 33 24 28 L22 8 Z"
                      fill={i < water.glasses ? '#3b82f6' : '#e5e7eb'}
                      stroke={i < water.glasses ? '#2563eb' : '#d1d5db'} strokeWidth="1" />
                    <path d="M6 8 Q14 4 22 8" fill="none" stroke={i < water.glasses ? '#2563eb' : '#d1d5db'} strokeWidth="1" />
                    {i < water.glasses && (
                      <path d="M8 20 Q14 16 20 20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                    )}
                  </svg>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateWater(-1)} disabled={water.glasses === 0}
                className="flex-1 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">− Quitar</button>
              <button onClick={() => updateWater(1)} disabled={water.glasses >= water.goal + 4}
                className="flex-1 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40">+ Agregar</button>
            </div>
          </div>
        )}
        {/* Steps widget */}
        {hasStepsTracking && (
          <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              🚶 Pasos de hoy
            </h2>
            {userProfile?.dailySteps && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                Meta: {userProfile.dailySteps.toLocaleString()}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {userProfile?.dailySteps ? (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{steps.toLocaleString()} pasos</span>
                <span>{Math.min(100, Math.round((steps / userProfile.dailySteps) * 100))}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (steps / userProfile.dailySteps) * 100)}%` }} />
              </div>
              {steps >= userProfile.dailySteps && (
                <p className="text-xs text-green-600 font-medium mt-1 text-center">🎉 ¡Meta alcanzada!</p>
              )}
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-800 mb-3">{steps.toLocaleString()} <span className="text-sm font-normal text-gray-400">pasos</span></p>
          )}

          {/* Quick add buttons */}
          <div className="flex gap-1.5 mb-3">
            {[1000, 2000, 5000].map(n => (
              <button key={n} onClick={() => { const v = steps + n; setSteps(v); setStepsInput(String(v)) }}
                className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                +{(n/1000).toFixed(0)}k
              </button>
            ))}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              type="number"
              value={stepsInput}
              onChange={e => setStepsInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSteps()}
              placeholder="Escribe tus pasos..."
              className="input flex-1 text-sm"
            />
            <button onClick={saveSteps} disabled={savingSteps}
              className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors">
              {savingSteps ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
        )}
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600"><ChevronLeft size={16} /></button>
            <h2 className="font-bold text-gray-800 text-sm capitalize">{monthName}</h2>
            <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {DAYS_ES.map(d => (
              <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const done = calendar[dateStr]
              const nowLocal = new Date(); const offLocal = nowLocal.getTimezoneOffset()
              const localNow = new Date(nowLocal.getTime() - offLocal * 60000)
              const isToday = dateStr === localNow.toISOString().split('T')[0]
              const isSelected = selectedDay === dateStr
              return (
                <button key={day} onClick={() => loadDayLogs(dateStr)}
                  className={`text-xs py-1 rounded-full mx-auto w-7 h-7 flex items-center justify-center font-medium transition-all hover:scale-110 ${
                    isSelected ? 'ring-2 ring-offset-1 ring-primary-500 bg-primary-500 text-white' :
                    done ? 'bg-primary-500 text-white' :
                    isToday ? 'border-2 border-primary-400 text-primary-600' :
                    'text-gray-500 hover:bg-gray-100'
                  }`}>
                  {done ? '✓' : day}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Meals summary */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-600" /> Resumen del día
        </h2>
        {loading && <p className="text-gray-400 text-sm">Cargando...</p>}
        {!loading && todayLogs?.logs?.length === 0 && (
          <div className="text-center py-6">
            <AlertCircle size={36} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aún no has registrado alimentos hoy.</p>
            <a href="/nutrition" className="text-primary-600 text-sm font-medium hover:underline mt-1 block">+ Registrar alimentos</a>
          </div>
        )}
        {todayLogs?.logs && todayLogs.logs.length > 0 && (
          <div className="space-y-2">
            {Object.entries(todayLogs?.byMeal || {}).map(([meal, logs]: any) => {
              if (!logs?.length) return null
              const mealLabels: Record<string, string> = {
                BREAKFAST: '🌅 Desayuno', LUNCH: '☀️ Almuerzo',
                DINNER: '🌙 Cena', SNACK: '🍎 Snack', CUSTOM: '⭐ Extra',
              }
              const label = logs[0]?.customMealName
                ? `⭐ ${logs[0].customMealName}`
                : (mealLabels[meal] || meal)
              return (
                <div key={meal} className="border border-gray-100 rounded-lg p-3">
                  <p className="font-medium text-sm text-gray-700 mb-1">{label}</p>
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex justify-between text-sm text-gray-500 py-0.5">
                      <span className="truncate mr-2">
                        {log.recipeName || log.foodItem?.name || log.customMealName}
                        {log.recipeName ? ` (${log.quantityGrams} porc.)` : ` (${log.quantityGrams}g)`}
                      </span>
                      <span className="font-medium flex-shrink-0">{Math.round(log.calories)} kcal</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
