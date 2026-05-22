import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { Bell, BellOff, Plus, CheckCircle, XCircle, Camera, ChevronDown, ChevronUp, Edit2, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FIELDS = [
  { key: 'weight',       label: 'Peso (kg)',                       side: null },
  { key: 'chest',        label: 'Pecho',                           side: null },
  { key: 'shoulders',    label: 'Hombros',                         side: null },
  { key: 'rightBicep',   label: 'Bícep derecho',                   side: 'right' },
  { key: 'leftBicep',    label: 'Bícep izquierdo',                 side: 'left' },
  { key: 'abdomenAbove', label: 'Abdomen 2cm arriba del ombligo',  side: null },
  { key: 'abdomenNavel', label: 'Abdomen a la altura del ombligo', side: null },
  { key: 'abdomenBelow', label: 'Abdomen 2cm abajo del ombligo',   side: null },
  { key: 'glute',        label: 'Glúteo',                          side: null },
  { key: 'rightThigh',   label: 'Muslo derecho',                   side: 'right' },
  { key: 'leftThigh',    label: 'Muslo izquierdo',                 side: 'left' },
  { key: 'rightCalf',    label: 'Pantorrilla derecha',             side: 'right' },
  { key: 'leftCalf',     label: 'Pantorrilla izquierda',           side: 'left' },
]

const CHART_KEYS = ['chest','shoulders','rightBicep','abdomenAbove','abdomenNavel','abdomenBelow','rightThigh']
const CHART_COLORS = ['#13c918','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

// SVG body diagram with measurement points
function BodyDiagram({ data }: { data: Record<string, string> }) {
  const points: { key: string; label: string; x: number; y: number }[] = [
    { key: 'chest',        label: 'Pecho',      x: 100, y: 100 },
    { key: 'shoulders',    label: 'Hombros',    x: 100, y: 80 },
    { key: 'rightBicep',   label: 'Bíc.D',      x: 55,  y: 115 },
    { key: 'leftBicep',    label: 'Bíc.I',      x: 145, y: 115 },
    { key: 'abdomenAbove', label: 'Abd.↑',      x: 100, y: 143 },
    { key: 'abdomenNavel', label: 'Abd.⊙',      x: 100, y: 152 },
    { key: 'abdomenBelow', label: 'Abd.↓',      x: 100, y: 162 },
    { key: 'glute',        label: 'Glúteo',     x: 100, y: 198 },
    { key: 'rightThigh',   label: 'M.Der',      x: 73,  y: 230 },
    { key: 'leftThigh',    label: 'M.Izq',      x: 127, y: 230 },
  ]

  return (
    <svg viewBox="0 0 200 330" className="w-full max-w-[220px] mx-auto">
      {/* Body silhouette */}
      <ellipse cx="100" cy="45" rx="18" ry="20" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="72" y="78" width="56" height="80" rx="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="38" y="80" width="28" height="70" rx="10" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="134" y="80" width="28" height="70" rx="10" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="75" y="155" width="22" height="85" rx="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="103" y="155" width="22" height="85" rx="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="75" y="235" width="20" height="65" rx="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <rect x="105" y="235" width="20" height="65" rx="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>

      {/* Measurement points */}
      {points.map(p => {
        const val = data[p.key]
        const hasVal = val && val !== ''
        return (
          <g key={p.key}>
            <circle cx={p.x} cy={p.y} r="7"
              fill={hasVal ? '#13c918' : '#fff'}
              stroke={hasVal ? '#0f9e13' : '#9ca3af'}
              strokeWidth="1.5" />
            {hasVal && (
              <text x={p.x} y={p.y + 3.5} textAnchor="middle"
                fontSize="5" fontWeight="bold" fill="white">{val}</text>
            )}
            <text x={p.x > 100 ? p.x + 10 : p.x < 100 ? p.x - 10 : p.x}
              y={p.y + (p.x === 100 ? -10 : 3)}
              textAnchor={p.x > 100 ? 'start' : p.x < 100 ? 'end' : 'middle'}
              fontSize="5.5" fill="#6b7280">{p.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function MeasurementsPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [reminderOn, setReminderOn] = useState(false)
  const [reminderMsg, setReminderMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [trainerReminder, setTrainerReminder] = useState<any>(null)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const emptyForm = Object.fromEntries(FIELDS.map(f => [f.key, '']))
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm, notes: '' })

  useEffect(() => {
    loadHistory()
    api.get('/measurements/reminder/trainer-config').then(r => setTrainerReminder(r.data)).catch(() => {})
  }, [])

  const deleteMeasurement = async (id: string) => {
    if (!confirm('¿Eliminar este registro de medidas?')) return
    try {
      await api.delete(`/measurements/${id}`)
      setHistory(prev => prev.filter(h => h.id !== id))
      setExpandedRecord(null)
      toast.success('Registro eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  const startEdit = (h: any) => {
    setEditRecord(h)
    setEditForm(Object.fromEntries(FIELDS.map(f => [f.key, h[f.key] ? String(h[f.key]) : ''])))
  }

  const saveEdit = async () => {
    if (!editRecord) return
    setSavingEdit(true)
    try {
      await api.patch(`/measurements/${editRecord.id}`, editForm)
      setHistory(prev => prev.map(h => h.id === editRecord.id ? { ...h, ...editForm } : h))
      setEditRecord(null)
      toast.success('Medidas actualizadas')
    } catch { toast.error('Error al actualizar') }
    finally { setSavingEdit(false) }
  }

  const loadHistory = async () => {
    setLoading(true)
    try {
      const r = await api.get('/measurements/history')
      setHistory(r.data)
    } catch { } finally { setLoading(false) }
  }

  const toggleReminder = async () => {
    const next = !reminderOn
    try {
      await api.post('/measurements/reminder/toggle', { enabled: next })
      setReminderOn(next)
      setReminderMsg({ ok: true, text: next ? 'Recibirás recordatorios semanales por email' : 'Recordatorios desactivados' })
      setTimeout(() => setReminderMsg(null), 3000)
    } catch { setReminderMsg({ ok: false, text: 'Error al actualizar' }) }
  }

  const sendNow = async () => {
    try {
      await api.post('/measurements/reminder/send')
      setReminderMsg({ ok: true, text: 'Recordatorio enviado a tu correo' })
      setTimeout(() => setReminderMsg(null), 3000)
    } catch { setReminderMsg({ ok: false, text: 'Error al enviar' }) }
  }

  const saveMeasurement = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      FIELDS.forEach(f => { if (form[f.key]) fd.append(f.key, form[f.key]) })
      if (form.notes) fd.append('notes', form.notes)
      photos.forEach(p => fd.append('photos', p))
      await api.post('/measurements', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSaveMsg({ ok: true, text: 'Medidas guardadas correctamente' })
      setForm({ ...emptyForm, notes: '' })
      setPhotos([])
      setPhotoPreviews([])
      setShowForm(false)
      loadHistory()
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.response?.data?.message || 'Error al guardar' })
    } finally { setSaving(false) }
  }

  // Prepare chart data (reverse to show oldest first)
  const chartData = [...history].reverse().map(h => ({
    date: format(new Date(h.createdAt), 'd MMM', { locale: es }),
    ...Object.fromEntries(CHART_KEYS.map(k => [k, h[k] ? Number(h[k]) : undefined])),
    weight: h.weight ? Number(h.weight) : undefined,
  }))

  const toUnit = (kg: number) => weightUnit === 'kg' ? kg : Math.round(kg * 2.205 * 10) / 10
  const weightData = chartData
    .filter(d => d.weight !== undefined)
    .map(d => ({ ...d, weight: toUnit(d.weight!) }))

  const chartLabels: Record<string, string> = {
    chest: 'Pecho', shoulders: 'Hombros', rightBicep: 'Bícep D',
    abdomenAbove: 'Abd.↑', abdomenNavel: 'Abd.⊙', abdomenBelow: 'Abd.↓', rightThigh: 'Muslo D',
  }

  const latest = history[0]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Medidas Corporales</h1>
          <p className="text-gray-500 text-sm mt-1">{history.length} registro(s)</p>
          <a href="https://www.youtube.com/watch?v=qVg9XKWLnH8" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 mt-1 font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            ¿Cómo tomar las medidas correctamente?
          </a>

        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nueva medición
          </button>
        </div>
      </div>

      {/* Reminder card */}
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-primary-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Recordatorio de medidas</p>
            {trainerReminder ? (
              <p className="text-sm text-gray-500">
                Tu entrenador programó recordatorios cada <strong>{trainerReminder.frequency_days} días</strong>
                {trainerReminder.day_of_week != null && ` — los ${['domingos','lunes','martes','miércoles','jueves','viernes','sábados'][trainerReminder.day_of_week]}`}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Tu entrenador no ha configurado recordatorios aún</p>
            )}
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${trainerReminder ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {trainerReminder ? '✅ Activo' : 'Sin configurar'}
        </span>
      </div>

      {reminderMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${reminderMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {reminderMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {reminderMsg.text}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-6">Nueva medición</h2>
          <div className="flex gap-4 flex-col md:flex-row">
            {/* Body diagram preview */}
            <div className="lg:w-52 flex-shrink-0">
              <p className="text-xs text-gray-500 text-center mb-2">Vista previa — puntos verdes = datos ingresados</p>
              <BodyDiagram data={form} />
            </div>

            {/* Fields */}
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label} (cm)</label>
                    <input type="number" step="0.1" className="input text-sm" placeholder="0.0"
                      value={form[f.key]}
                      onChange={e => setForm(fr => ({ ...fr, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <textarea className="input h-16 resize-none text-sm" placeholder="Observaciones..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-2">
                  <Camera size={14} /> Fotos (máx. 4, opcional)
                </label>
                <input type="file" accept="image/*" multiple onChange={e => {
                  const files = Array.from(e.target.files || []).slice(0, 4)
                  setPhotos(files)
                  setPhotoPreviews(files.map(f => URL.createObjectURL(f)))
                }}
                  className="text-sm text-gray-600" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button onClick={saveMeasurement} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Guardar medidas'}
                </button>
              </div>

              {saveMsg && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${saveMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {saveMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {saveMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weight Chart */}
      {weightData.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">📉 Evolución del Peso</h2>
            <button onClick={() => setWeightUnit(u => u === 'kg' ? 'lbs' : 'kg')}
              className="text-xs px-3 py-1 border-2 border-primary-300 text-primary-700 rounded-full font-medium hover:bg-primary-50 transition-colors">
              {weightUnit === 'kg' ? 'Ver en lbs' : 'Ver en kg'}
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{weightData[0]?.weight} {weightUnit}</span>
              <span>→</span>
              <span className={`font-bold ${(weightData[weightData.length-1]?.weight || 0) <= (weightData[0]?.weight || 0) ? 'text-green-600' : 'text-red-500'}`}>
                {weightData[weightData.length-1]?.weight} {weightUnit}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                (weightData[weightData.length-1]?.weight || 0) <= (weightData[0]?.weight || 0)
                  ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {((weightData[weightData.length-1]?.weight || 0) - (weightData[0]?.weight || 0)).toFixed(1)} {weightUnit}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#13c918" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#13c918" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} unit={` ${weightUnit}`} />
              <Tooltip formatter={(v: any) => [`${v} ${weightUnit}`, 'Peso']} />
              <Area type="monotone" dataKey="weight" stroke="#13c918" strokeWidth={2.5}
                fill="url(#weightGradient)" dot={{ r: 4, fill: '#13c918' }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">📏 Evolución de Medidas (cm)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {CHART_KEYS.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} name={chartLabels[k]}
                  stroke={CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">Cargando...</p>
      ) : history.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">Aún no tienes medidas registradas.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Registrar primera medición</button>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Historial</h2>
          {history.map(h => (
            <div key={h.id} className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedRecord(expandedRecord === h.id ? null : h.id)}>
                  <p className="font-medium text-gray-800">
                    {format(new Date(h.createdAt), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {[h.abdomenAbove && `Abd.↑: ${h.abdomenAbove}cm`, h.chest && `Pecho: ${h.chest}cm`, h.weight && `Peso: ${h.weight}kg`]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(h)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => deleteMeasurement(h.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                    <Trash2 size={15} />
                  </button>
                  <div className="cursor-pointer" onClick={() => setExpandedRecord(expandedRecord === h.id ? null : h.id)}>
                    {expandedRecord === h.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {expandedRecord === h.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="flex gap-6 flex-col md:flex-row">
                    <BodyDiagram data={Object.fromEntries(FIELDS.map(f => [f.key, h[f.key] ? String(h[f.key]) : '']))} />
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {FIELDS.filter(f => h[f.key]).map(f => (
                          <div key={f.key} className="flex justify-between bg-white p-2 rounded-lg border">
                            <span className="text-gray-500">{f.label}</span>
                            <span className="font-medium text-gray-800">{h[f.key]} {f.key === 'weight' ? 'kg' : 'cm'}</span>
                          </div>
                        ))}
                      </div>
                      {h.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-gray-600">
                          📝 {h.notes}
                        </div>
                      )}
                      {[h.photoUrl, h.photoUrl2, h.photoUrl3, h.photoUrl4].filter(Boolean).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">📷 Fotos</p>
                          <div className="flex gap-2 flex-wrap">
                            {[h.photoUrl, h.photoUrl2, h.photoUrl3, h.photoUrl4].filter(Boolean).map((url, i) => (
                              <button key={i} onClick={() => setPhotoModal(url)} className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden hover:opacity-80">
                                <img src={url} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Photo modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoModal(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300">✕</button>
            <img src={photoModal} className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
      {/* Edit modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">✏️ Editar medidas</h3>
              <button onClick={() => setEditRecord(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  <div className="relative">
                    <input type="number" step="0.1" className="input w-full text-sm pr-10"
                      value={editForm[f.key] || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.key === 'weight' ? 'kg' : 'cm'} />
                    <span className="absolute right-3 top-2 text-xs text-gray-400">{f.key === 'weight' ? 'kg' : 'cm'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditRecord(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-50">
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
