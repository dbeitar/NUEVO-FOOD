import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Plus, Trash2, Edit2, Save, X, ChefHat, Upload, Download } from 'lucide-react'

const CATEGORIES = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Postre']
const OBJECTIVES = [
  { value: 'LOSE',     label: '🔥 Bajar peso' },
  { value: 'MAINTAIN', label: '⚖️ Mantener peso' },
  { value: 'GAIN',     label: '💪 Ganar músculo' },
]

const emptyForm = {
  name: '', description: '', category: 'Desayuno', objective: 'MAINTAIN',
  imageUrl: '', prepTimeMin: '', servings: '1',
  calories: '', protein: '', carbs: '', fat: '',
  ingredients: [{ name: '', quantity: '', unit: 'g' }],
  steps: [''],
}

export default function RecipeManagement() {
  const [recipes, setRecipes]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<any>(null)
  const [form, setForm]         = useState({ ...emptyForm })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const loadRecipes = async () => {
    setLoading(true)
    try { const { data } = await api.get('/recipes'); setRecipes(data) }
    catch { } finally { setLoading(false) }
  }

  useEffect(() => { loadRecipes() }, [])

  const parseJSON = (str: string) => {
    try { return JSON.parse(str) } catch { return [] }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/recipes/import/excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data)
      loadRecipes()
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Error al importar' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEdit = (r: any) => {
    setEditing(r)
    setForm({
      name: r.name || '',
      description: r.description || '',
      category: r.category || 'Desayuno',
      objective: r.objective || 'MAINTAIN',
      imageUrl: r.imageUrl || '',
      prepTimeMin: r.prepTimeMin || '',
      servings: r.servings || '1',
      calories: r.calories || '',
      protein: r.protein || '',
      carbs: r.carbs || '',
      fat: r.fat || '',
      ingredients: parseJSON(r.ingredients).length ? parseJSON(r.ingredients) : [{ name: '', quantity: '', unit: 'g' }],
      steps: parseJSON(r.steps).length ? parseJSON(r.steps) : [''],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg({ ok: false, text: 'El nombre es obligatorio' }); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        prepTimeMin: form.prepTimeMin ? parseInt(form.prepTimeMin as any) : null,
        servings: parseInt(form.servings as any) || 1,
        calories: form.calories ? parseFloat(form.calories as any) : null,
        protein:  form.protein  ? parseFloat(form.protein as any)  : null,
        carbs:    form.carbs    ? parseFloat(form.carbs as any)    : null,
        fat:      form.fat      ? parseFloat(form.fat as any)      : null,
        ingredients: JSON.stringify(form.ingredients.filter(i => i.name.trim())),
        steps: JSON.stringify(form.steps.filter(s => s.trim())),
      }

      if (editing) {
        await api.put(`/recipes/${editing.id}`, payload)
        setMsg({ ok: true, text: 'Receta actualizada correctamente' })
      } else {
        await api.post('/recipes', payload)
        setMsg({ ok: true, text: 'Receta creada correctamente' })
      }
      setShowForm(false)
      loadRecipes()
    } catch {
      setMsg({ ok: false, text: 'Error al guardar la receta' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta receta?')) return
    try {
      await api.delete(`/recipes/${id}`)
      setMsg({ ok: true, text: 'Receta eliminada' })
      loadRecipes()
    } catch { setMsg({ ok: false, text: 'Error al eliminar' }) }
  }

  // Ingredient helpers
  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: '', unit: 'g' }] }))
  const removeIngredient = (i: number) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))
  const updateIngredient = (i: number, field: string, value: string) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing) }))

  // Step helpers
  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, ''] }))
  const removeStep = (i: number) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
  const updateStep = (i: number, value: string) =>
    setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? value : s) }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ChefHat size={26} className="text-green-500" /> Recetas del Chef Nico
          </h1>
          <p className="text-sm text-gray-500">Gestiona la biblioteca de recetas saludables</p>
        </div>
        <div className="flex gap-2">
          <a href="/plantilla_recetas_foodplan.xlsx" download
            className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={16} /> Plantilla Excel
          </a>
          <label className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={16} /> {importing ? 'Importando...' : 'Importar Excel'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
          </label>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nueva Receta
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Recipes list */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Cargando...</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay recetas aún. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map(r => (
            <div key={r.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                {r.imageUrl ? <img src={r.imageUrl} className="w-full h-full object-cover rounded-xl" /> : '👨‍🍳'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{r.name}</p>
                <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                  {r.category && <span>{r.category}</span>}
                  {r.calories && <span>· {r.calories} kcal</span>}
                  {r.prepTimeMin && <span>· {r.prepTimeMin} min</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(r)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(r.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">{editing ? 'Editar Receta' : 'Nueva Receta'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium block mb-1">Nombre *</label>
                  <input className="input w-full" placeholder="Ej: Ensalada de pollo con quinua"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium block mb-1">Descripción</label>
                  <textarea className="input w-full resize-none" rows={2} placeholder="Breve descripción de la receta"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Categoría</label>
                  <select className="input w-full" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Objetivo</label>
                  <select className="input w-full" value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
                    {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Tiempo (min)</label>
                  <input type="number" className="input w-full" placeholder="30"
                    value={form.prepTimeMin} onChange={e => setForm(f => ({ ...f, prepTimeMin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Porciones</label>
                  <input type="number" className="input w-full" placeholder="1"
                    value={form.servings} onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-medium block mb-1">URL de imagen (opcional)</label>
                  <input className="input w-full" placeholder="https://..."
                    value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
                </div>
              </div>

              {/* Macros */}
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Macros por porción (opcional)</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'calories', label: 'Kcal' },
                    { key: 'protein',  label: 'Proteína g' },
                    { key: 'carbs',    label: 'Carbs g' },
                    { key: 'fat',      label: 'Grasas g' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input type="number" className="input w-full" placeholder="0"
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">🛒 Ingredientes</p>
                  <button onClick={addIngredient} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                    <Plus size={12} /> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" placeholder="Ingrediente"
                        value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
                      <input className="input w-20" placeholder="Cant."
                        value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} />
                      <input className="input w-16" placeholder="Unidad"
                        value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)} />
                      {form.ingredients.length > 1 && (
                        <button onClick={() => removeIngredient(i)} className="text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">📋 Pasos de preparación</p>
                  <button onClick={addStep} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                    <Plus size={12} /> Agregar paso
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-2">
                        {i + 1}
                      </span>
                      <textarea className="input flex-1 resize-none" rows={2} placeholder={`Paso ${i + 1}...`}
                        value={step} onChange={e => updateStep(i, e.target.value)} />
                      {form.steps.length > 1 && (
                        <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 mt-2">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100">
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar receta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
