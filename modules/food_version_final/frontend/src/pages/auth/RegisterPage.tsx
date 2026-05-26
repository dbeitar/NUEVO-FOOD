import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Check, ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import AppLogo from '../../components/AppLogo'
import toast from 'react-hot-toast'
import { register, getMe } from '../../store/authSlice'
import { AppDispatch } from '../../store/store'
import { api } from '../../services/api'

const FEATURE_ICONS: Record<string, string> = {
  food_log:             '🍽️',
  personal_nutrition:   '📊',
  chatbot:              '🤖',
  measurements:         '📏',
  daily_report:         '📋',
  recipes:              '👨‍🍳',
  water_tracking:       '💧',
  steps_tracking:       '🚶',
  barcode_scanner:      '📷',
  choose_trainer:       '🏋️',
  trainer_tracking:     '👁️',
  trainer_notes:        '📝',
  appointments:         '📅',
  video_sessions:       '🎥',
}

const planColors: Record<string, string> = {
  BASIC: 'border-gray-300', INTERMEDIATE: 'border-primary-500', ADVANCED: 'border-yellow-400',
}
const planHighlight: Record<string, string> = {
  BASIC: '', INTERMEDIATE: 'ring-2 ring-primary-500', ADVANCED: 'ring-2 ring-yellow-400',
}

const goals = [
  { value: 'MAINTAIN', label: 'Mantener peso', emoji: '⚖️' },
  { value: 'LOSE', label: 'Bajar de peso', emoji: '📉' },
  { value: 'GAIN', label: 'Ganar masa muscular', emoji: '💪' },
]
const activities = [
  { value: 'SEDENTARY', label: 'Sedentario', desc: 'Poco o ningún ejercicio' },
  { value: 'LIGHT', label: 'Ligero', desc: '1-3 días/semana' },
  { value: 'MODERATE', label: 'Moderado', desc: '3-5 días/semana' },
  { value: 'ACTIVE', label: 'Activo', desc: '6-7 días/semana' },
  { value: 'VERY_ACTIVE', label: 'Muy activo', desc: 'Ejercicio intenso diario' },
]

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [plans, setPlans] = useState<any[]>([])
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    // Step 1
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
    // Step 2
    weightKg: '', heightCm: '', birthDate: '', gender: '', goalType: 'MAINTAIN', activityLevel: 'MODERATE',
    hasDietaryRestrictions: false, dietaryRestrictionsDetail: '',
    // Step 3
    planType: 'BASIC',
    // Step 4
    acceptedPrivacyPolicy: false, acceptedTerms: false,
  })

  useEffect(() => {
    api.get('/subscriptions/plans').then(r => setPlans(r.data)).catch(() => {})
    api.get('/subscriptions/features').then(r => {
      const map: Record<string, string> = {}
      ;(r.data || []).forEach((f: any) => { map[f.key] = f.label })
      setFeatureLabels(map)
    }).catch(() => {})
  }, [])

  const set = (k: string) => (e: any) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const validateStep1 = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Completa todos los campos obligatorios'); return false
    }
    if (form.password.length < 6) { toast.error('La contraseña debe tener mínimo 6 caracteres'); return false }
    if (form.password !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!form.weightKg || !form.heightCm || !form.birthDate || !form.gender) {
      toast.error('Completa todos los datos físicos'); return false
    }
    return true
  }

  const validateStep4 = () => {
    if (!form.acceptedPrivacyPolicy || !form.acceptedTerms) {
      toast.error('Debes aceptar las políticas y términos para continuar'); return false
    }
    return true
  }

  const next = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    if (!validateStep4()) return
    const payload = {
      ...form,
      weightKg: parseFloat(form.weightKg) || undefined,
      heightCm: parseFloat(form.heightCm) || undefined,
    }
    const result = await dispatch(register(payload))
    if (register.fulfilled.match(result)) {
      toast.success('¡Cuenta creada exitosamente!')
      dispatch(getMe()); navigate('/dashboard')
    } else {
      toast.error(result.payload as string)
    }
  }

  const steps = ['Cuenta', 'Datos físicos', 'Plan', 'Confirmar']

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl px-2">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-3">
            <AppLogo size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Crea tu cuenta en Food Plan</h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i + 1 < step ? 'bg-white text-primary-700' :
                i + 1 === step ? 'bg-primary-400 text-white ring-2 ring-white' :
                'bg-primary-800 text-primary-300'
              }`}>
                {i + 1 < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-white' : 'bg-primary-600'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="font-bold text-gray-800 text-lg mb-6">{steps[step - 1]}</h2>

          {/* STEP 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input className="input" placeholder="Juan" value={form.firstName} onChange={set('firstName')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input className="input" placeholder="Pérez" value={form.lastName} onChange={set('lastName')} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
                <input type="email" className="input" placeholder="juan@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input className="input" placeholder="+57 300 000 0000" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="Mínimo 6 caracteres"
                    value={form.password} onChange={set('password')} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
                <div className="relative">
                  <input type={showPw2 ? 'text' : 'password'} className="input pr-10" placeholder="Repite tu contraseña"
                    value={form.confirmPassword} onChange={set('confirmPassword')} />
                  <button type="button" onClick={() => setShowPw2(!showPw2)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Physical data */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg) *</label>
                  <input type="number" className="input" placeholder="70" value={form.weightKg} onChange={set('weightKg')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm) *</label>
                  <input type="number" className="input" placeholder="170" value={form.heightCm} onChange={set('heightCm')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
                  <input type="date" className="input" value={form.birthDate} onChange={set('birthDate')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género *</label>
                  <select className="input" value={form.gender} onChange={set('gender')}>
                    <option value="">Seleccionar...</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo *</label>
                <div className="grid grid-cols-3 gap-3">
                  {goals.map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setForm(f => ({ ...f, goalType: g.value }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        form.goalType === g.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="text-2xl mb-1">{g.emoji}</div>
                      <p className="text-xs font-medium text-gray-700">{g.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de actividad física</label>
                <div className="space-y-2">
                  {activities.map(a => (
                    <label key={a.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.activityLevel === a.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <input type="radio" name="activity" value={a.value}
                        checked={form.activityLevel === a.value}
                        onChange={set('activityLevel')} className="text-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{a.label}</p>
                        <p className="text-xs text-gray-400">{a.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-gray-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.hasDietaryRestrictions}
                    onChange={set('hasDietaryRestrictions')} className="mt-1" />
                  <span className="text-sm text-gray-700">Tengo restricciones o recomendaciones alimentarias (alergias, intolerancias, condiciones médicas)</span>
                </label>
                {form.hasDietaryRestrictions && (
                  <textarea className="input mt-3 h-20 resize-none" placeholder="Describe tus restricciones..."
                    value={form.dietaryRestrictionsDetail} onChange={set('dietaryRestrictionsDetail')} />
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Plan */}
          {step === 3 && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map(plan => (
                  <div key={plan.id} onClick={() => setForm(f => ({ ...f, planType: plan.name }))}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${planColors[plan.name]} ${
                      form.planType === plan.name ? planHighlight[plan.name] + ' bg-primary-50' : 'bg-white hover:bg-gray-50'
                    }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800 text-sm">{plan.displayName}</span>
                      {form.planType === plan.name && <Check size={16} className="text-primary-600 shrink-0" />}
                    </div>
                    <p className="text-xl font-bold text-primary-700">${plan.price}
                      <span className="text-xs text-gray-500 font-normal">/mes</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {(plan.features || []).map((f: string) => (
                        <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span>{FEATURE_ICONS[f] || '✅'}</span>
                          <span>{featureLabels[f] || f.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Terms */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.acceptedPrivacyPolicy}
                    onChange={set('acceptedPrivacyPolicy')} className="mt-1 w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-gray-700">
                    Acepto la <span className="text-primary-600 font-medium underline cursor-pointer">Política de Privacidad</span> de Food Plan.
                    Entiendo cómo se recopilan y usan mis datos personales. *
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.acceptedTerms}
                    onChange={set('acceptedTerms')} className="mt-1 w-4 h-4 accent-primary-600" />
                  <span className="text-sm text-gray-700">
                    Autorizo el <span className="text-primary-600 font-medium underline cursor-pointer">Tratamiento de mis Datos Personales</span> de
                    conformidad con la Ley 1581 de 2012 y sus decretos reglamentarios. *
                  </span>
                </label>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-700">
                <p className="font-medium mb-1">📋 Resumen de tu registro:</p>
                <p>• {form.firstName} {form.lastName} — {form.email}</p>
                <p>• Peso: {form.weightKg}kg · Altura: {form.heightCm}cm · Objetivo: {goals.find(g => g.value === form.goalType)?.label}</p>
                <p>• Plan: {plans.find(p => p.name === form.planType)?.displayName}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={16} /> Anterior
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={next}
                className="btn-primary flex items-center gap-2 flex-1 justify-center">
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit}
                className="btn-primary flex-1">
                Crear cuenta
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿Ya tienes cuenta? <Link to="/login" className="text-primary-600 font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
