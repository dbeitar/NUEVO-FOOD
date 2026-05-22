import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Zap, Beef, Wheat, Droplets, Edit2, Save, X, AlertCircle, CheckCircle } from 'lucide-react'

const goals: Record<string, string> = { MAINTAIN: '⚖️ Mantener peso', LOSE: '📉 Bajar de peso', GAIN: '💪 Ganar masa' }
const genders: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Femenino', OTHER: 'Otro' }
const activities: Record<string, string> = {
  SEDENTARY: 'Sedentario', LIGHT: 'Ligero', MODERATE: 'Moderado', ACTIVE: 'Activo', VERY_ACTIVE: 'Muy activo'
}

interface MacroCardProps { label: string; value: number; unit: string; color: string; icon: any; percent?: number }

function MacroCard({ label, value, unit, color, icon: Icon, percent }: MacroCardProps) {
  return (
    <div className="card text-center">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mx-auto mb-3`}>
        <Icon size={22} className="text-white" />
      </div>
      <p className="text-3xl font-bold text-gray-800">{Math.round(value || 0)}</p>
      <p className="text-sm text-gray-500">{unit}</p>
      <p className="text-xs font-medium text-gray-600 mt-1">{label}</p>
      {percent !== undefined && (
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export default function MyPlanPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState<any>({})

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const r = await api.get('/nutrition-plan/my-profile')
      setProfile(r.data)
      if (r.data) setForm({
        weightKg: r.data.weightKg || '',
        heightCm: r.data.heightCm || '',
        birthDate: r.data.birthDate || '',
        gender: r.data.gender || '',
        goalType: r.data.goalType || 'MAINTAIN',
        activityLevel: r.data.activityLevel || 'MODERATE',
        hasDietaryRestrictions: r.data.hasDietaryRestrictions || false,
        dietaryRestrictionsDetail: r.data.dietaryRestrictionsDetail || '',
      })
    } catch { } finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const r = await api.post('/nutrition-plan/my-profile', {
        ...form,
        weightKg: parseFloat(form.weightKg) || undefined,
        heightCm: parseFloat(form.heightCm) || undefined,
      })
      setProfile(r.data)
      setEditing(false)
      setMsg({ ok: true, text: 'Plan actualizado y recalculado correctamente' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Error al guardar' })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-6 text-gray-400">Calculando tu plan...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mi Plan Nutricional</h1>
          <p className="text-gray-500 text-sm mt-1">Plan calculado según tus datos personales</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 size={16} /> Actualizar datos
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-2">
              <X size={16} /> Cancelar
            </button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.text}
        </div>
      )}

      {!profile && !editing ? (
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Aún no tienes un plan nutricional</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Ingresa tus datos físicos para calcular tu plan personalizado</p>
          <button onClick={() => setEditing(true)} className="btn-primary">Crear mi plan</button>
        </div>
      ) : (
        <>
          {/* Macros */}
          {profile && !editing && (
            <>
              {profile.trainerOverride && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                  <AlertCircle size={16} />
                  Tu entrenador ha personalizado este plan nutricional para ti.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <MacroCard label="Calorías diarias" value={profile.dailyCalories} unit="kcal" color="bg-orange-500" icon={Zap} />
                <MacroCard label="Proteínas" value={profile.dailyProteinG} unit="g/día" color="bg-red-500" icon={Beef} />
                <MacroCard label="Carbohidratos" value={profile.dailyCarbsG} unit="g/día" color="bg-yellow-500" icon={Wheat} />
                <MacroCard label="Grasas" value={profile.dailyFatG} unit="g/día" color="bg-blue-500" icon={Droplets} />
              </div>

              {/* Water and steps from trainer */}
              {(profile.dailyWaterGlasses || profile.dailySteps) && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {profile.dailyWaterGlasses && (
                    <div className="card bg-blue-50 border border-blue-100 text-center p-4">
                      <p className="text-3xl mb-1">💧</p>
                      <p className="text-2xl font-bold text-blue-600">{profile.dailyWaterGlasses}</p>
                      <p className="text-xs text-blue-500 font-medium">vasos de agua/día</p>
                      {profile.trainerOverride && <p className="text-xs text-gray-400 mt-1">Asignado por tu entrenador</p>}
                    </div>
                  )}
                  {profile.dailySteps && (
                    <div className="card bg-green-50 border border-green-100 text-center p-4">
                      <p className="text-3xl mb-1">🚶</p>
                      <p className="text-2xl font-bold text-green-600">{profile.dailySteps.toLocaleString()}</p>
                      <p className="text-xs text-green-500 font-medium">pasos diarios</p>
                      {profile.trainerOverride && <p className="text-xs text-gray-400 mt-1">Asignado por tu entrenador</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Profile summary */}
              <div className="card">
                <h2 className="font-bold text-gray-800 mb-4">Tus datos</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {profile.weightKg && <div><p className="text-gray-400">Peso</p><p className="font-medium">{profile.weightKg} kg</p></div>}
                  {profile.heightCm && <div><p className="text-gray-400">Altura</p><p className="font-medium">{profile.heightCm} cm</p></div>}
                  {profile.gender && <div><p className="text-gray-400">Género</p><p className="font-medium">{genders[profile.gender] || profile.gender}</p></div>}
                  {profile.goalType && <div><p className="text-gray-400">Objetivo</p><p className="font-medium">{goals[profile.goalType]}</p></div>}
                  {profile.activityLevel && <div><p className="text-gray-400">Actividad</p><p className="font-medium">{activities[profile.activityLevel]}</p></div>}
                  {profile.hasDietaryRestrictions && (
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-gray-400">Restricciones alimentarias</p>
                      <p className="font-medium">{profile.dietaryRestrictionsDetail || 'Sí'}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Edit form */}
          {editing && (
            <div className="card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" className="input" placeholder="70"
                    value={form.weightKg} onChange={e => setForm((f: any) => ({ ...f, weightKg: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                  <input type="number" className="input" placeholder="170"
                    value={form.heightCm} onChange={e => setForm((f: any) => ({ ...f, heightCm: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                  <input type="date" className="input"
                    value={form.birthDate} onChange={e => setForm((f: any) => ({ ...f, birthDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                  <select className="input" value={form.gender} onChange={e => setForm((f: any) => ({ ...f, gender: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Femenino</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(goals).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setForm((f: any) => ({ ...f, goalType: val }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-medium ${
                        form.goalType === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de actividad</label>
                <select className="input" value={form.activityLevel}
                  onChange={e => setForm((f: any) => ({ ...f, activityLevel: e.target.value }))}>
                  {Object.entries(activities).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.hasDietaryRestrictions}
                  onChange={e => setForm((f: any) => ({ ...f, hasDietaryRestrictions: e.target.checked }))} />
                <span className="text-sm text-gray-700">Tengo restricciones alimentarias</span>
              </label>
              {form.hasDietaryRestrictions && (
                <textarea className="input h-20 resize-none" placeholder="Describe tus restricciones..."
                  value={form.dietaryRestrictionsDetail}
                  onChange={e => setForm((f: any) => ({ ...f, dietaryRestrictionsDetail: e.target.value }))} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
