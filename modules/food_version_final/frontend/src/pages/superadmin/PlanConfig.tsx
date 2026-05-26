import { useState, useEffect } from 'react'
import { Save, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../services/api'

export default function PlanConfig() {
  const [plans, setPlans] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [tlConfig, setTlConfig] = useState<any>(null)
  const [calcConfig, setCalcConfig] = useState<any>(null)
  const [savingPlan, setSavingPlan] = useState<string | null>(null)
  const [savingTl, setSavingTl] = useState(false)
  const [savingCalc, setSavingCalc] = useState(false)
  const [editingFeature, setEditingFeature] = useState<string | null>(null)
  const [featureEdit, setFeatureEdit] = useState<{ label: string; description: string }>({ label: '', description: '' })

  useEffect(() => {
    api.get('/subscriptions/plans').then(r => setPlans(r.data)).catch(() => {})
    api.get('/config/traffic-light').then(r => setTlConfig(r.data)).catch(() => {})
    api.get('/config/nutrition-calc').then(r => setCalcConfig(r.data)).catch(() => {})
    api.get('/subscriptions/features').then(r => setFeatures(r.data || [])).catch(() => {})
  }, [])

  const savePlan = async (plan: any) => {
    setSavingPlan(plan.id)
    try {
      await api.put(`/subscriptions/plans/${plan.id}`, { price: plan.price, durationDays: plan.durationDays, features: plan.features || [] })
      toast.success(`Plan ${plan.displayName} actualizado`)
    } catch { toast.error('Error al actualizar plan') }
    finally { setSavingPlan(null) }
  }

  const saveTlConfig = async () => {
    setSavingTl(true)
    try {
      await api.put('/config/traffic-light', tlConfig)
      toast.success('Configuración del semáforo actualizada')
    } catch { toast.error('Error al guardar') }
    finally { setSavingTl(false) }
  }

  const setPlan = (id: string, k: string, v: any) =>
    setPlans(ps => ps.map(p => p.id === id ? { ...p, [k]: v } : p))

  const saveCalcConfig = async () => {
    setSavingCalc(true)
    try {
      await api.put('/config/nutrition-calc', {
        bmrMaleBase:      parseFloat(calcConfig.bmr_male_base),
        bmrMaleWeight:    parseFloat(calcConfig.bmr_male_weight),
        bmrMaleHeight:    parseFloat(calcConfig.bmr_male_height),
        bmrMaleAge:       parseFloat(calcConfig.bmr_male_age),
        bmrFemaleBase:    parseFloat(calcConfig.bmr_female_base),
        bmrFemaleWeight:  parseFloat(calcConfig.bmr_female_weight),
        bmrFemaleHeight:  parseFloat(calcConfig.bmr_female_height),
        bmrFemaleAge:     parseFloat(calcConfig.bmr_female_age),
        factorSedentary:  parseFloat(calcConfig.factor_sedentary),
        factorLight:      parseFloat(calcConfig.factor_light),
        factorModerate:   parseFloat(calcConfig.factor_moderate),
        factorActive:     parseFloat(calcConfig.factor_active),
        factorVeryActive: parseFloat(calcConfig.factor_very_active),
        goalLose:         parseInt(calcConfig.goal_lose),
        goalMaintain:     parseInt(calcConfig.goal_maintain),
        goalGain:         parseInt(calcConfig.goal_gain),
        proteinPerKg:     parseFloat(calcConfig.protein_per_kg),
        fatPctCalories:   parseFloat(calcConfig.fat_pct_calories),
        proteinPerKgLose:     parseFloat(calcConfig.protein_per_kg_lose     || 2.2),
        fatPctLose:           parseFloat(calcConfig.fat_pct_lose            || 0.25),
        proteinPerKgMaintain: parseFloat(calcConfig.protein_per_kg_maintain || 1.8),
        fatPctMaintain:       parseFloat(calcConfig.fat_pct_maintain        || 0.28),
        proteinPerKgGain:     parseFloat(calcConfig.protein_per_kg_gain     || 2.0),
        fatPctGain:           parseFloat(calcConfig.fat_pct_gain            || 0.22),
      })
      toast.success('Configuración de cálculo actualizada')
    } catch { toast.error('Error al guardar') }
    finally { setSavingCalc(false) }
  }

  const updateCalc = (k: string, v: string) =>
    setCalcConfig((c: any) => ({ ...c, [k]: v }))

  const toggleFeature = (planId: string, featureKey: string) => {
    setPlans(ps => ps.map(p => {
      if (p.id !== planId) return p
      const has = (p.features || []).includes(featureKey)
      return { ...p, features: has ? p.features.filter((f: string) => f !== featureKey) : [...(p.features || []), featureKey] }
    }))
  }

  const startEditFeature = (f: any) => {
    setEditingFeature(f.key)
    setFeatureEdit({ label: f.label, description: f.description || '' })
  }

  const saveFeatureLabel = async (key: string) => {
    try {
      await api.put(`/subscriptions/features/${key}`, featureEdit)
      setFeatures(fs => fs.map(f => f.key === key ? { ...f, ...featureEdit } : f))
      setEditingFeature(null)
      toast.success('Feature actualizada')
    } catch { toast.error('Error al guardar') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Planes y Configuración</h1>

      {/* Plans */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings2 size={20} className="text-primary-600" /> Configuración de Planes
        </h2>
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">{plan.displayName}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{plan.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (USD/mes)</label>
                  <input type="number" step="0.01" className="input-field"
                    value={plan.price} onChange={e => setPlan(plan.id, 'price', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días)</label>
                  <input type="number" className="input-field"
                    value={plan.durationDays} onChange={e => setPlan(plan.id, 'durationDays', e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Features incluidas</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {features.map((f: any) => {
                    const active = (plan.features || []).includes(f.key)
                    return (
                      <label key={f.key} className={"flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all " + (active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50')}>
                        <input type="checkbox" className="rounded text-green-500"
                          checked={active}
                          onChange={() => toggleFeature(plan.id, f.key)} />
                        <span className={"text-xs font-medium " + (active ? 'text-green-700' : 'text-gray-600')}>{f.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <button onClick={() => savePlan(plan)} disabled={savingPlan === plan.id}
                className="btn-primary text-sm flex items-center gap-2">
                <Save size={14} /> {savingPlan === plan.id ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Light Config */}
      {tlConfig && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Configuración del Semáforo Nutricional</h2>
          <p className="text-sm text-gray-500 mb-4">Define cuántos días de cumplimiento corresponden a cada estado en una ventana de evaluación.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              ['greenMinDays', '🟢 Días mínimos para VERDE', 'Días cumplidos para estado verde'],
              ['yellowMinDays', '🟡 Días mínimos para AMARILLO', 'Días cumplidos para estado amarillo'],
              ['redMaxDays', '🔴 Máximo días para ROJO', 'Por debajo de este valor → rojo'],
              ['complianceThresholdPct', '% Umbral de cumplimiento', 'Porcentaje mínimo para considerar un día cumplido'],
              ['evaluationWindowDays', 'Ventana de evaluación (días)', 'Cantidad de días hacia atrás a evaluar'],
            ].map(([k, label, hint]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type="number" className="input-field" value={tlConfig[k] || 0}
                  onChange={e => setTlConfig((c: any) => ({ ...c, [k]: Number(e.target.value) }))} />
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
              </div>
            ))}
          </div>
          <button onClick={saveTlConfig} disabled={savingTl} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {savingTl ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      )}
      {/* Features Config */}
      {features.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Settings2 size={20} className="text-purple-600" /> Funcionalidades del Sistema
          </h2>
          <p className="text-sm text-gray-500 mb-4">Edita el nombre y descripción de cada funcionalidad</p>
          <div className="space-y-2">
            {features.map((f: any) => (
              <div key={f.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                {editingFeature === f.key ? (
                  <>
                    <div className="flex-1 space-y-1">
                      <input className="input w-full text-sm py-1"
                        value={featureEdit.label}
                        onChange={e => setFeatureEdit(fe => ({ ...fe, label: e.target.value }))} />
                      <input className="input w-full text-xs py-1 text-gray-500"
                        value={featureEdit.description}
                        placeholder="Descripción..."
                        onChange={e => setFeatureEdit(fe => ({ ...fe, description: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveFeatureLabel(f.key)}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">Guardar</button>
                      <button onClick={() => setEditingFeature(null)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50">Cancelar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{f.label}</p>
                      <p className="text-xs text-gray-400">{f.key} {f.description && `· ${f.description}`}</p>
                    </div>
                    <button onClick={() => startEditFeature(f)}
                      className="text-xs text-gray-400 hover:text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors">
                      ✏️ Editar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition Calculation Config */}
      {calcConfig && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Settings2 size={20} className="text-green-600" /> Configuración de Cálculo Nutricional
          </h2>
          <p className="text-sm text-gray-500 mb-5">Parametriza los factores usados para calcular las metas de cada usuario</p>

          {/* Harris-Benedict */}
          <div className="mb-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">🧮 Fórmula Harris-Benedict (TMB)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-blue-600 mb-2">👨 Hombre</p>
                <div className="space-y-2">
                  {[
                    { key: 'bmr_male_base',   label: 'Base' },
                    { key: 'bmr_male_weight', label: '× Peso (kg)' },
                    { key: 'bmr_male_height', label: '× Altura (cm)' },
                    { key: 'bmr_male_age',    label: '− Edad' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-28">{f.label}</label>
                      <input type="number" step="0.001" className="input w-24 text-sm py-1"
                        value={calcConfig[f.key] || ''}
                        onChange={e => updateCalc(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-pink-600 mb-2">👩 Mujer</p>
                <div className="space-y-2">
                  {[
                    { key: 'bmr_female_base',   label: 'Base' },
                    { key: 'bmr_female_weight', label: '× Peso (kg)' },
                    { key: 'bmr_female_height', label: '× Altura (cm)' },
                    { key: 'bmr_female_age',    label: '− Edad' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-28">{f.label}</label>
                      <input type="number" step="0.001" className="input w-24 text-sm py-1"
                        value={calcConfig[f.key] || ''}
                        onChange={e => updateCalc(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity factors */}
          <div className="mb-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">🏃 Factores de Actividad</h3>
            <div className="space-y-2">
              {[
                { key: 'factor_sedentary',   label: 'Sedentario' },
                { key: 'factor_light',        label: 'Actividad ligera' },
                { key: 'factor_moderate',     label: 'Moderadamente activo' },
                { key: 'factor_active',       label: 'Muy activo' },
                { key: 'factor_very_active',  label: 'Extremadamente activo' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-48">{f.label}</label>
                  <input type="number" step="0.001" min="1" max="3" className="input w-24 text-sm py-1"
                    value={calcConfig[f.key] || ''}
                    onChange={e => updateCalc(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Goal adjustments */}
          <div className="mb-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">🎯 Ajuste por Objetivo (kcal)</h3>
            <div className="space-y-2">
              {[
                { key: 'goal_lose',     label: '🔥 Perder peso' },
                { key: 'goal_maintain', label: '⚖️ Mantener peso' },
                { key: 'goal_gain',     label: '💪 Ganar músculo' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-48">{f.label}</label>
                  <input type="number" step="50" className="input w-24 text-sm py-1"
                    value={calcConfig[f.key] || ''}
                    onChange={e => updateCalc(f.key, e.target.value)} />
                  <span className="text-xs text-gray-400">kcal</span>
                </div>
              ))}
            </div>
          </div>

          {/* Macro ratios per goal */}
          <div className="mb-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">🥩 Distribución de Macros por Objetivo</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'lose',     label: '🔥 Perder peso',   protKey: 'protein_per_kg_lose',     fatKey: 'fat_pct_lose' },
                { key: 'maintain', label: '⚖️ Mantener peso', protKey: 'protein_per_kg_maintain', fatKey: 'fat_pct_maintain' },
                { key: 'gain',     label: '💪 Ganar músculo', protKey: 'protein_per_kg_gain',     fatKey: 'fat_pct_gain' },
              ].map(g => (
                <div key={g.key} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-gray-700 mb-2">{g.label}</p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Proteína (g/kg peso)</label>
                    <input type="number" step="0.1" min="1" max="4" className="input w-full text-sm py-1"
                      value={calcConfig[g.protKey] || ''}
                      onChange={e => updateCalc(g.protKey, e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">% Grasas (ej: 0.25)</label>
                    <input type="number" step="0.01" min="0.1" max="0.5" className="input w-full text-sm py-1"
                      value={calcConfig[g.fatKey] || ''}
                      onChange={e => updateCalc(g.fatKey, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveCalcConfig} disabled={savingCalc}
              className="btn-primary flex items-center gap-2">
              <Save size={16} /> {savingCalc ? 'Guardando...' : 'Guardar configuración'}
            </button>
            <button onClick={() => api.get('/config/nutrition-calc').then(r => setCalcConfig(r.data)).catch(() => {})}
              className="btn-secondary text-sm">
              Restaurar valores
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
