import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  ClipboardList, Save, Trash2, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Star, Activity, Zap, Sparkles,
  TrendingUp, Flame, Droplets,
} from 'lucide-react'
import { format, parseISO, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────
type PerformanceValue = 'MUY_MALO' | 'MALO' | 'NORMAL' | 'BUENO' | 'MUY_BUENO'
type MotivationValue = 'BAJA' | 'NORMAL' | 'ALTA'
type HungerValue = 'AUSENTE' | 'SOPORTABLE' | 'FUERTE' | 'INSOPORTABLE'
type FatigueValue = 'NADA' | 'POCO' | 'MUCHO' | 'MUCHISIMO'
type StressValue = 'AUSENTE' | 'BAJO' | 'ALTO' | 'MUY_ALTO'
type SleepQuality = 'MUY_BAJA' | 'BAJA' | 'ALTA' | 'MUY_ALTA'

interface DailyReport {
  id?: string
  reportDate: string
  weightKg?: number
  performance?: PerformanceValue
  motivation?: MotivationValue
  hunger?: HungerValue
  fatigue?: FatigueValue
  stress?: StressValue
  sleepHours?: number
  sleepQuality?: SleepQuality
  period?: string
  mood?: string
  symptoms?: string[]
  otherNotes?: string
}

// ─── Config ───────────────────────────────────────────────
const PERFORMANCE_OPTIONS: { value: PerformanceValue; label: string; color: string }[] = [
  { value: 'MUY_MALO',  label: 'Muy malo',  color: '#ef4444' },
  { value: 'MALO',      label: 'Malo',       color: '#f97316' },
  { value: 'NORMAL',    label: 'Normal',     color: '#eab308' },
  { value: 'BUENO',     label: 'Bueno',      color: '#84cc16' },
  { value: 'MUY_BUENO', label: 'Muy bueno', color: '#22c55e' },
]

const MOTIVATION_OPTIONS: { value: MotivationValue; label: string; color: string }[] = [
  { value: 'BAJA',   label: 'Baja',   color: '#ef4444' },
  { value: 'NORMAL', label: 'Normal', color: '#eab308' },
  { value: 'ALTA',   label: 'Alta',   color: '#22c55e' },
]

const HUNGER_OPTIONS: { value: HungerValue; label: string; color: string }[] = [
  { value: 'AUSENTE',      label: 'Ausente',      color: '#22c55e' },
  { value: 'SOPORTABLE',   label: 'Soportable',   color: '#84cc16' },
  { value: 'FUERTE',       label: 'Fuerte',        color: '#f97316' },
  { value: 'INSOPORTABLE', label: 'Insoportable', color: '#ef4444' },
]

const FATIGUE_OPTIONS: { value: FatigueValue; label: string; color: string }[] = [
  { value: 'NADA',      label: 'Nada',       color: '#22c55e' },
  { value: 'POCO',      label: 'Poco',        color: '#84cc16' },
  { value: 'MUCHO',     label: 'Mucho',       color: '#f97316' },
  { value: 'MUCHISIMO', label: 'Muchísimo',  color: '#ef4444' },
]

const STRESS_OPTIONS: { value: StressValue; label: string; color: string }[] = [
  { value: 'AUSENTE',  label: 'Ausente',   color: '#22c55e' },
  { value: 'BAJO',     label: 'Bajo',       color: '#84cc16' },
  { value: 'ALTO',     label: 'Alto',       color: '#f97316' },
  { value: 'MUY_ALTO', label: 'Muy alto',  color: '#ef4444' },
]

const SLEEP_OPTIONS: { value: SleepQuality; label: string; color: string }[] = [
  { value: 'MUY_BAJA', label: 'Muy baja', color: '#ef4444' },
  { value: 'BAJA',     label: 'Baja',      color: '#f97316' },
  { value: 'ALTA',     label: 'Alta',      color: '#84cc16' },
  { value: 'MUY_ALTA', label: 'Muy alta', color: '#22c55e' },
]

const PERIOD_OPTIONS = [
  { value: 'NO',        label: 'No' },
  { value: 'SI',        label: 'Sí' },
  { value: 'RETRASO',   label: 'Retraso' },
  { value: 'OVULACION', label: 'Ovulación' },
]

const MOOD_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'MUY_MALO',  label: 'Muy malo',  color: '#ef4444' },
  { value: 'MALO',      label: 'Malo',       color: '#f97316' },
  { value: 'NORMAL',    label: 'Normal',     color: '#eab308' },
  { value: 'BUENO',     label: 'Bueno',      color: '#84cc16' },
  { value: 'MUY_BUENO', label: 'Muy bueno', color: '#22c55e' },
]

const SYMPTOM_OPTIONS = [
  'Cólicos', 'Hinchazón', 'Fatiga extra', 'Irritabilidad',
  'Antojos', 'Dolor de cabeza', 'Sensibilidad', 'Náuseas', 'Otros',
]

// ─── Sub-components ───────────────────────────────────────
function OptionGroup<T extends string>({
  label, icon: Icon, options, value, onChange,
}: {
  label: string
  icon: any
  options: { value: T; label: string; color: string }[]
  value?: T
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Icon size={15} className="text-gray-500" />
        {label}
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
              value === opt.value
                ? 'text-white shadow-md scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
            style={value === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function DailyReportPage() {
  const { user } = useSelector((s: RootState) => s.auth)
  const isFemale = (user as any)?.gender === 'FEMALE'

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState<DailyReport>({ reportDate: currentDate })
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showFemale, setShowFemale] = useState(isFemale)

  useEffect(() => {
    loadReport(currentDate)
  }, [currentDate])

  const loadReport = async (date: string) => {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await api.get(`/daily-reports/date/${date}`)
      if (res.data) {
        setForm(res.data)
      } else {
        setForm({ reportDate: date })
      }
    } catch {
      setForm({ reportDate: date })
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (dir: 1 | -1) => {
    const d = dir === 1 ? addDays(parseISO(currentDate), 1) : subDays(parseISO(currentDate), 1)
    const newDate = d.toISOString().split('T')[0]
    if (newDate > new Date().toISOString().split('T')[0]) return // No future dates
    setCurrentDate(newDate)
  }

  const update = (field: keyof DailyReport, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const toggleSymptom = (s: string) => {
    const current = form.symptoms || []
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
    update('symptoms', next)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/daily-reports', { ...form, reportDate: currentDate })
      setSaved(true)
      loadReport(currentDate)
    } catch {
      setError('No se pudo guardar el reporte. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!form.id || !confirm('¿Eliminar el reporte de este día?')) return
    try {
      await api.delete(`/daily-reports/${form.id}`)
      setForm({ reportDate: currentDate })
      setSaved(false)
    } catch {
      setError('No se pudo eliminar el reporte.')
    }
  }

  const isEmpty = !form.performance && !form.motivation && !form.hunger &&
    !form.fatigue && !form.stress && !form.sleepHours && !form.sleepQuality && !form.weightKg

  const isToday = currentDate === new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-green-500" size={26} />
            Reporte Diario
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra cómo te sientes hoy (opcional)</p>
        </div>
        {form.id && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            <CheckCircle size={13} /> Guardado
          </span>
        )}
      </div>

      {/* Date navigator */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <button
          onClick={() => navigateDate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 text-lg capitalize">
            {format(parseISO(currentDate), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          {isToday && <span className="text-xs text-green-600 font-medium">Hoy</span>}
        </div>
        <button
          onClick={() => navigateDate(1)}
          disabled={isToday}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Weight */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Activity size={17} className="text-blue-500" /> Peso y datos básicos
            </h2>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <label className="text-xs text-gray-500 font-medium">Peso</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setWeightUnit('kg')}
                    className={"px-2.5 py-0.5 text-xs font-medium transition-colors " + (weightUnit === 'kg' ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                    kg
                  </button>
                  <button onClick={() => setWeightUnit('lbs')}
                    className={"px-2.5 py-0.5 text-xs font-medium transition-colors " + (weightUnit === 'lbs' ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                    lbs
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min={weightUnit === 'kg' ? 30 : 66}
                  max={weightUnit === 'kg' ? 300 : 660}
                  value={weightUnit === 'kg'
                    ? (form.weightKg || '')
                    : (form.weightKg ? Math.round(form.weightKg * 2.205 * 10) / 10 : '')}
                  onChange={e => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined
                    update('weightKg', val !== undefined
                      ? (weightUnit === 'kg' ? val : Math.round((val / 2.205) * 10) / 10)
                      : undefined)
                  }}
                  placeholder={weightUnit === 'kg' ? 'Ej: 72.5' : 'Ej: 159.8'}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <span className="text-xs text-gray-400">{weightUnit}</span>
              </div>
              {form.weightKg && weightUnit === 'lbs' && (
                <p className="text-xs text-gray-400 mt-1">= {form.weightKg} kg (guardado en kg)</p>
              )}
            </div>
          </div>

          {/* Performance factors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Zap size={17} className="text-yellow-500" /> Factores de rendimiento
            </h2>
            <OptionGroup
              label="Rendimiento"
              icon={TrendingUp}
              options={PERFORMANCE_OPTIONS}
              value={form.performance}
              onChange={v => update('performance', v)}
            />
            <OptionGroup
              label="Motivación"
              icon={Zap}
              options={MOTIVATION_OPTIONS}
              value={form.motivation}
              onChange={v => update('motivation', v)}
            />
            <OptionGroup
              label="Hambre"
              icon={Flame}
              options={HUNGER_OPTIONS}
              value={form.hunger}
              onChange={v => update('hunger', v)}
            />
            <OptionGroup
              label="Cansancio"
              icon={Activity}
              options={FATIGUE_OPTIONS}
              value={form.fatigue}
              onChange={v => update('fatigue', v)}
            />
            <OptionGroup
              label="Estrés"
              icon={AlertCircle}
              options={STRESS_OPTIONS}
              value={form.stress}
              onChange={v => update('stress', v)}
            />
          </div>

          {/* Sleep */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Star size={17} className="text-indigo-500" /> Sueño
            </h2>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Star size={15} className="text-gray-500" /> Horas de sueño
              </div>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={form.sleepHours || ''}
                onChange={e => update('sleepHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Ej: 7.5"
                className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <OptionGroup
              label="Calidad del sueño"
              icon={Star}
              options={SLEEP_OPTIONS}
              value={form.sleepQuality}
              onChange={v => update('sleepQuality', v)}
            />
          </div>

          {/* Female section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowFemale(!showFemale)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <Sparkles size={17} className="text-pink-500" />
                Seguimiento femenino
                <span className="text-xs font-normal text-gray-400">(opcional)</span>
              </div>
              <ChevronRight
                size={18}
                className={`text-gray-400 transition-transform ${showFemale ? 'rotate-90' : ''}`}
              />
            </button>

            {showFemale && (
              <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
                {/* Period */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Droplets size={15} className="text-pink-400" /> Ciclo menstrual
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => update('period', opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                          form.period === opt.value
                            ? 'bg-pink-500 text-white border-pink-500 shadow-md scale-105'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <OptionGroup
                  label="Estado de ánimo"
                  icon={Sparkles}
                  options={MOOD_OPTIONS}
                  value={form.mood}
                  onChange={v => update('mood', v)}
                />

                {/* Symptoms */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <AlertCircle size={15} className="text-gray-500" /> Síntomas
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOM_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSymptom(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                          (form.symptoms || []).includes(s)
                            ? 'bg-pink-100 text-pink-700 border-pink-400 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Notas adicionales</div>
                  <textarea
                    value={form.otherNotes || ''}
                    onChange={e => update('otherNotes', e.target.value)}
                    placeholder="Escribe cualquier observación..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || isEmpty}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-green-500 text-white font-semibold rounded-2xl shadow hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : saved ? (
                <CheckCircle size={18} />
              ) : (
                <Save size={18} />
              )}
              {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar reporte'}
            </button>

            {form.id && (
              <button
                onClick={handleDelete}
                className="p-3 border-2 border-red-200 text-red-400 rounded-2xl hover:bg-red-50 hover:border-red-300 transition-all"
                title="Eliminar reporte"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {isEmpty && !form.id && (
            <p className="text-center text-xs text-gray-400">
              Completa al menos un campo para guardar el reporte
            </p>
          )}
        </>
      )}
    </div>
  )
}
