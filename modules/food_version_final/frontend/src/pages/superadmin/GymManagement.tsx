import { useState, useEffect, useRef } from 'react'
import { Plus, Copy, Pencil, Trash2, Building2, Users, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../services/api'

export default function GymManagement() {
  const [gyms, setGyms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', country: '', city: '', address: '' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [trainers, setTrainers] = useState<Record<string, any[]>>({})
  const printRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try { const { data } = await api.get('/gyms'); setGyms(data.data || data) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggleGym = async (gymId: string) => {
    if (expanded === gymId) { setExpanded(null); return }
    setExpanded(gymId)
    if (!trainers[gymId]) {
      try {
        const { data } = await api.get(`/gyms/${gymId}/trainers`)
        setTrainers(t => ({ ...t, [gymId]: data }))
      } catch { setTrainers(t => ({ ...t, [gymId]: [] })) }
    }
  }

  const openCreate = () => { setEditing(null); setForm({ name: '', country: '', city: '', address: '' }); setModal(true) }
  const openEdit = (g: any) => { setEditing(g); setForm({ name: g.name, country: g.country, city: g.city, address: g.address || '' }); setModal(true) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) { await api.patch(`/gyms/${editing.id}`, form); toast.success('Gimnasio actualizado') }
      else { await api.post('/gyms', form); toast.success('Gimnasio creado exitosamente') }
      setModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este gimnasio?')) return
    try { await api.delete(`/gyms/${id}`); toast.success('Gimnasio eliminado'); load() }
    catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Código ${code} copiado`)
  }

  const printReport = async () => {
    // Load all trainers first
    const updatedTrainers = { ...trainers }
    for (const g of gyms) {
      if (!updatedTrainers[g.id]) {
        try {
          const { data } = await api.get(`/gyms/${g.id}/trainers`)
          updatedTrainers[g.id] = data
        } catch { updatedTrainers[g.id] = [] }
      }
    }
    setTrainers(updatedTrainers)

    setTimeout(() => {
      const printContent = `
        <html><head><title>Reporte de Gimnasios - Food Plan</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #13c918; border-bottom: 2px solid #13c918; padding-bottom: 8px; }
          .gym { margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .gym-header { background: #f0fdf4; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
          .gym-name { font-weight: bold; font-size: 16px; }
          .gym-code { font-family: monospace; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
          .gym-info { font-size: 13px; color: #666; }
          .trainers { padding: 12px 16px; }
          .trainer { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
          .trainer:last-child { border-bottom: none; }
          .trainer-name { font-weight: 600; width: 180px; }
          .trainer-code { font-family: monospace; color: #13c918; font-weight: bold; }
          .no-trainers { color: #999; font-size: 13px; font-style: italic; padding: 8px 0; }
          .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: right; }
          @media print { body { padding: 10px; } }
        </style></head>
        <body>
          <h1>🍎 Food Plan — Reporte de Gimnasios</h1>
          <p style="color:#666;font-size:13px">Generado el ${new Date().toLocaleString('es-CO')} · Total: ${gyms.length} gimnasio(s)</p>
          ${gyms.map(g => `
            <div class="gym">
              <div class="gym-header">
                <div>
                  <div class="gym-name">${g.name}</div>
                  <div class="gym-info">${g.city}, ${g.country}${g.address ? ' · ' + g.address : ''}</div>
                </div>
                <div>
                  <span class="gym-code">${g.uniqueCode}</span>
                  <span style="margin-left:8px;font-size:12px;color:#666">${(updatedTrainers[g.id] || []).length} entrenador(es)</span>
                </div>
              </div>
              <div class="trainers">
                ${(updatedTrainers[g.id] || []).length === 0
                  ? '<div class="no-trainers">Sin entrenadores asociados</div>'
                  : (updatedTrainers[g.id] || []).map(t => `
                    <div class="trainer">
                      <span class="trainer-name">${t.firstName} ${t.lastName}</span>
                      <span style="color:#666;width:180px">${t.email}</span>
                      ${t.idNumber ? `<span style="color:#888">CC: ${t.idNumber}</span>` : ''}
                      ${t.trainerCode ? `<span class="trainer-code">${t.trainerCode}</span>` : ''}
                    </div>`).join('')
                }
              </div>
            </div>
          `).join('')}
          <div class="footer">Food Plan SaaS · Reporte confidencial</div>
        </body></html>
      `
      const w = window.open('', '_blank')
      if (w) { w.document.write(printContent); w.document.close(); w.print() }
    }, 300)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Gimnasios</h1>
          <p className="text-gray-500 text-sm">{gyms.length} gimnasio(s) registrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={printReport} className="btn-secondary flex items-center gap-2">
            <Printer size={16} /> Imprimir reporte
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Gimnasio
          </button>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-center py-12">Cargando...</p>
        : gyms.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">No hay gimnasios registrados.</p>
          <button onClick={openCreate} className="btn-primary mt-4">Crear primer gimnasio</button>
        </div>
      ) : (
        <div className="space-y-3">
          {gyms.map(g => (
            <div key={g.id} className="card p-0 overflow-hidden">
              {/* Gym header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{g.name}</h3>
                    <p className="text-gray-500 text-sm">{g.city}, {g.country}</p>
                    {g.address && <p className="text-gray-400 text-xs">{g.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Código de acceso</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-primary-50 text-primary-700 px-3 py-1 rounded-lg font-mono font-bold text-sm">
                        {g.uniqueCode}
                      </code>
                      <button onClick={() => copyCode(g.uniqueCode)} className="text-gray-400 hover:text-primary-600">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleGym(g.id)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Ver entrenadores">
                      {expanded === g.id ? <ChevronUp size={16} /> : <Users size={16} />}
                    </button>
                    <button onClick={() => openEdit(g)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => remove(g.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trainers panel */}
              {expanded === g.id && (
                <div className="border-t bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Entrenadores vinculados · {trainers[g.id]?.length ?? '—'}
                  </p>
                  {!trainers[g.id] ? (
                    <p className="text-gray-400 text-sm">Cargando...</p>
                  ) : trainers[g.id].length === 0 ? (
                    <p className="text-gray-400 text-sm italic">Sin entrenadores asociados a este gimnasio</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {trainers[g.id].map((t: any) => (
                        <div key={t.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {t.firstName?.[0]}{t.lastName?.[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-800 truncate">{t.firstName} {t.lastName}</p>
                            <p className="text-xs text-gray-400 truncate">{t.email}</p>
                            {t.idNumber && <p className="text-xs text-gray-400">CC: {t.idNumber}</p>}
                          </div>
                          {t.trainerCode && (
                            <span className="text-xs font-mono bg-green-50 text-green-700 px-2 py-1 rounded-lg flex-shrink-0">
                              {t.trainerCode}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-gray-800 mb-4">{editing ? 'Editar Gimnasio' : 'Nuevo Gimnasio'}</h3>
            <form onSubmit={save} className="space-y-3">
              <input className="input" placeholder="Nombre del gimnasio" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="País" value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required />
                <input className="input" placeholder="Ciudad" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
              </div>
              <input className="input" placeholder="Dirección (opcional)" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              {!editing && <p className="text-xs text-gray-400">El código único se genera automáticamente.</p>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
