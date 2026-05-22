import { useState, useRef } from 'react'
import { api } from '../../services/api'
import { Upload, Download, CheckCircle, AlertCircle, Search, Trash2, Plus, X, Edit2, Save } from 'lucide-react'
import * as XLSX from 'xlsx'

const TEMPLATE_COLS = [
  'name', 'category', 'caloriesPer100g', 'proteinPer100g',
  'carbsPer100g', 'fatPer100g', 'fiberPer100g', 'unit', 'gramsPerUnit'
]

const TEMPLATE_EXAMPLE = [
  {
    name: 'Pechuga de pollo cocida', category: 'Carnes',
    caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0,
    fatPer100g: 3.6, fiberPer100g: 0, unit: 'g', gramsPerUnit: ''
  },
  {
    name: 'Huevo entero', category: 'Huevos',
    caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1,
    fatPer100g: 11, fiberPer100g: 0, unit: 'unidad', gramsPerUnit: 60
  },
]

export default function FoodManagement() {
  const [tab, setTab] = useState<'import' | 'list'>('import')
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [foods, setFoods] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingFoods, setLoadingFoods] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [foodModal, setFoodModal] = useState<any>(null) // null=closed, {}=new, {id,...}=edit
  const [savingFood, setSavingFood] = useState(false)
  const EMPTY_FOOD = { name: '', category: '', caloriesPer100g: '', proteinPer100g: '', carbsPer100g: '', fatPer100g: '', fiberPer100g: '', unit: 'g', gramsPerUnit: '' }
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_EXAMPLE)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alimentos')
    ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 20 }))
    XLSX.writeFile(wb, 'plantilla_alimentos.xlsx')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws) as any[]
        setPreview(rows.slice(0, 5))
        setPreview(rows)
      } catch {
        setMsg({ ok: false, text: 'Error al leer el archivo. Usa el formato de la plantilla.' })
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    setResult(null)
    try {
      const { data } = await api.post('/nutrition/foods/import', { foods: preview })
      setResult(data)
      setPreview([])
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setMsg({ ok: false, text: 'Error al importar los alimentos' })
    } finally { setImporting(false) }
  }

  const loadFoods = async (p = 1, s = search) => {
    setLoadingFoods(true)
    try {
      const { data } = await api.get('/nutrition/foods/all', { params: { page: p, search: s, showInactive } })
      setFoods(data.data)
      setTotal(data.total)
      setPage(p)
    } catch { setFoods([]) }
    finally { setLoadingFoods(false) }
  }

  const deleteFood = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    try {
      await api.delete(`/nutrition/foods/${id}`)
      setMsg({ ok: true, text: 'Alimento desactivado correctamente' })
      loadFoods(page)
    } catch { setMsg({ ok: false, text: 'Error al eliminar' }) }
  }

  const saveFood = async () => {
    if (!foodModal?.name?.trim()) { setMsg({ ok: false, text: 'El nombre es obligatorio' }); return }
    setSavingFood(true)
    try {
      if (foodModal.id) {
        await api.put(`/nutrition/foods/${foodModal.id}`, foodModal)
        setMsg({ ok: true, text: 'Alimento actualizado correctamente' })
      } else {
        await api.post('/nutrition/foods', foodModal)
        setMsg({ ok: true, text: 'Alimento creado correctamente' })
      }
      setFoodModal(null)
      loadFoods(page, search)
    } catch (e: any) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Error al guardar' })
    } finally { setSavingFood(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Alimentos</h1>
          <p className="text-sm text-gray-500">Importa y administra la base de datos de alimentos</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('import')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'import' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Upload size={16} /> Importar Excel/CSV
        </button>
        <button onClick={() => { setTab('list'); loadFoods(1, '') }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'list' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Search size={16} /> Ver alimentos ({total || '...'})
        </button>
      </div>

      {/* Import Tab */}
      {tab === 'import' && (
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Descarga la plantilla
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Usa esta plantilla Excel para agregar tus alimentos con el formato correcto.
            </p>
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
              <Download size={16} /> Descargar plantilla.xlsx
            </button>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">Columnas requeridas:</p>
              <div className="grid grid-cols-2 gap-1">
                <span>• <b>name</b> — Nombre del alimento</span>
                <span>• <b>category</b> — Categoría</span>
                <span>• <b>caloriesPer100g</b> — Calorías por 100g</span>
                <span>• <b>proteinPer100g</b> — Proteínas por 100g</span>
                <span>• <b>carbsPer100g</b> — Carbohidratos por 100g</span>
                <span>• <b>fatPer100g</b> — Grasas por 100g</span>
                <span>• <b>unit</b> — "g" o "unidad"</span>
                <span>• <b>gramsPerUnit</b> — Gramos por unidad (si aplica)</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card">
            <h2 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Sube tu archivo
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors">
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-3">Arrastra o selecciona un archivo .xlsx o .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={handleFile} className="text-sm text-gray-600" />
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Vista previa — {preview.length} alimentos detectados:
                </p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Nombre', 'Categoría', 'Kcal', 'Prot', 'Carbs', 'Grasa', 'Unidad'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                          <td className="px-3 py-2 text-gray-500">{r.category}</td>
                          <td className="px-3 py-2">{r.caloriesPer100g}</td>
                          <td className="px-3 py-2">{r.proteinPer100g}</td>
                          <td className="px-3 py-2">{r.carbsPer100g}</td>
                          <td className="px-3 py-2">{r.fatPer100g}</td>
                          <td className="px-3 py-2">{r.unit || 'g'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      ... y {preview.length - 5} más
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3 */}
          {preview.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Importar
              </h2>
              <button onClick={handleImport} disabled={importing}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <Upload size={18} />
                {importing ? 'Importando...' : `Importar ${preview.length} alimentos`}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="card bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h3 className="font-bold text-green-800">Importación completada</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-600">{result.created}</p>
                  <p className="text-xs text-gray-500">Creados</p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
                  <p className="text-xs text-gray-500">Omitidos (ya existían)</p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-2xl font-bold text-red-500">{result.errors?.length || 0}</p>
                  <p className="text-xs text-gray-500">Errores</p>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="mt-3 text-xs text-red-600 space-y-1">
                  {result.errors.map((e: string, i: number) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* List Tab */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="input pl-9 w-full" placeholder="Buscar alimento..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadFoods(1, search)} />
            </div>
            <button onClick={() => loadFoods(1, search)} className="btn-secondary">Buscar</button>
            <button onClick={() => setFoodModal({ ...EMPTY_FOOD })} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nuevo alimento
            </button>
          </div>

          {loadingFoods ? (
            <p className="text-center text-gray-400 py-8">Cargando...</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Nombre', 'Categoría', 'Kcal/100g', 'Prot', 'Carbs', 'Grasa', 'Unidad', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {foods.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            {f.name}
                            {f.isActive === false && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{f.category}</td>
                        <td className="px-4 py-2.5">{f.caloriesPer100g}</td>
                        <td className="px-4 py-2.5">{f.proteinPer100g}g</td>
                        <td className="px-4 py-2.5">{f.carbsPer100g}g</td>
                        <td className="px-4 py-2.5">{f.fatPer100g}g</td>
                        <td className="px-4 py-2.5">{f.unit || 'g'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => setFoodModal({ ...f, caloriesPer100g: f.caloriesPer100g || '', proteinPer100g: f.proteinPer100g || '', carbsPer100g: f.carbsPer100g || '', fatPer100g: f.fatPer100g || '', fiberPer100g: f.fiberPer100g || '' })}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteFood(f.id, f.name)}
                              className={`p-1.5 rounded-lg transition-colors ${f.isActive === false ? 'text-yellow-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                              title={f.isActive === false ? 'Reactivar' : 'Desactivar'}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{total} alimentos en total</span>
                <div className="flex gap-2">
                  <button onClick={() => loadFoods(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
                  <span className="px-3 py-1.5">Página {page}</span>
                  <button onClick={() => loadFoods(page + 1)} disabled={foods.length < 50}
                    className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* Create/Edit Food Modal */}
      {foodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{foodModal.id ? '✏️ Editar alimento' : '➕ Nuevo alimento'}</h3>
              <button onClick={() => setFoodModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre *</label>
                  <input className="input w-full" value={foodModal.name || ''} placeholder="Ej: Pechuga de pollo cocida"
                    onChange={e => setFoodModal((f: any) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Categoría</label>
                  <input className="input w-full" value={foodModal.category || ''} placeholder="Ej: Carnes"
                    onChange={e => setFoodModal((f: any) => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Unidad</label>
                  <select className="input w-full" value={foodModal.unit || 'g'}
                    onChange={e => setFoodModal((f: any) => ({ ...f, unit: e.target.value }))}>
                    <option value="g">g (gramos)</option>
                    <option value="unidad">Unidad</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Macros por 100g</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'caloriesPer100g', label: '🔥 Calorías (kcal)', placeholder: '165' },
                  { key: 'proteinPer100g',  label: '🥩 Proteína (g)',    placeholder: '31' },
                  { key: 'carbsPer100g',    label: '🌾 Carbos (g)',      placeholder: '0' },
                  { key: 'fatPer100g',      label: '🫒 Grasas (g)',      placeholder: '3.6' },
                  { key: 'fiberPer100g',    label: '🌿 Fibra (g)',       placeholder: '0' },
                  { key: 'gramsPerUnit',    label: '⚖️ Gramos/unidad',   placeholder: '60' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                    <input type="number" step="0.1" className="input w-full" placeholder={placeholder}
                      value={foodModal[key] || ''}
                      onChange={e => setFoodModal((f: any) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setFoodModal(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={saveFood} disabled={savingFood}
                className="flex-1 py-2.5 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={16} /> {savingFood ? 'Guardando...' : foodModal.id ? 'Actualizar' : 'Crear alimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
