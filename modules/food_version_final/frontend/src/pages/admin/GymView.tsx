import { useState, useEffect } from 'react'
import { Building2, Users, ChevronDown, ChevronUp, MapPin, Hash } from 'lucide-react'
import { api } from '../../services/api'

export default function GymView() {
  const [gyms, setGyms] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [trainers, setTrainers] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/gyms').then(r => setGyms(r.data.data || r.data)).finally(() => setLoading(false))
  }, [])

  const toggleGym = async (gymId: string) => {
    if (expanded === gymId) { setExpanded(null); return }
    setExpanded(gymId)
    if (!trainers[gymId]) {
      try {
        const { data } = await api.get(`/gyms/${gymId}/trainers`)
        setTrainers(t => ({ ...t, [gymId]: data }))
      } catch {
        setTrainers(t => ({ ...t, [gymId]: [] }))
      }
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Cargando gimnasios...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gimnasios</h1>
          <p className="text-gray-500 text-sm mt-1">{gyms.length} gimnasio(s) registrados</p>
        </div>
      </div>

      {gyms.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No hay gimnasios registrados aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gyms.map(g => (
            <div key={g.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleGym(g.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={22} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{g.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} /> {g.city}, {g.country}
                      </span>
                      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        <Hash size={10} /> {g.uniqueCode || g.gymCode || '—'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {g.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full flex items-center gap-1">
                    <Users size={12} /> {trainers[g.id]?.length ?? '—'} entrenadores
                  </span>
                  {expanded === g.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expanded === g.id && (
                <div className="border-t bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Entrenadores asociados</p>
                  {!trainers[g.id] ? (
                    <p className="text-gray-400 text-sm">Cargando...</p>
                  ) : trainers[g.id].length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin entrenadores asociados a este gimnasio</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {trainers[g.id].map((t: any) => (
                        <div key={t.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {t.firstName?.[0]}{t.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-800 truncate">{t.firstName} {t.lastName}</p>
                            <p className="text-xs text-gray-400 truncate">{t.email}</p>
                            {t.idNumber && <p className="text-xs text-gray-400">CC: {t.idNumber}</p>}
                            {t.trainerCode && (
                              <span className="text-xs font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                {t.trainerCode}
                              </span>
                            )}
                          </div>
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
    </div>
  )
}
