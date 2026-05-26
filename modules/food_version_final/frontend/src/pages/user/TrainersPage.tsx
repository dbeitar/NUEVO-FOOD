import { useState, useEffect } from 'react'
import { Search, Building2, UserCheck, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../services/api'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [gymFilter, setGymFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [cvModal, setCvModal] = useState<string | null>(null)
  const { user } = useSelector((s: RootState) => s.auth)

  useEffect(() => {
    api.get('/gyms').then(r => setGyms(r.data.data || r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    api.get(`/trainer/list?${params}`)
      .then(r => setTrainers(r.data))
      .catch(() => toast.error('Error al cargar entrenadores'))
      .finally(() => setLoading(false))
  }, [search])

  const selectTrainer = async (trainerId: string, trainerName: string) => {
    if (!confirm(`¿Asignarte al entrenador ${trainerName}?`)) return
    try {
      await api.post(`/trainer/select/${trainerId}`)
      toast.success(`¡${trainerName} es ahora tu entrenador!`)
    } catch { toast.error('Error al asignar entrenador') }
  }

  const filtered = gymFilter
    ? trainers.filter(t => t.gymId === gymFilter)
    : trainers

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Entrenadores</h1>
      <p className="text-gray-500 text-sm mb-6">Encuentra tu entrenador ideal y asóciate a un gimnasio</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input-field pl-9" placeholder="Buscar por nombre o cédula..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-56" value={gymFilter} onChange={e => setGymFilter(e.target.value)}>
          <option value="">Todos los gimnasios</option>
          <option value="no-gym">Sin gimnasio</option>
          {gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">No se encontraron entrenadores</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .filter(t => gymFilter === 'no-gym' ? !t.gymId : true)
            .map(t => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold">
                  {t.firstName?.[0]}{t.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{t.firstName} {t.lastName}</p>
                  {t.idNumber && <p className="text-xs text-gray-400">CC: {t.idNumber}</p>}
                  {t.gymId ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                      <Building2 size={10} /> {t.gym?.name}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full inline-block mt-1">Sin gimnasio</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {t.cvUrl && (
                  <button onClick={() => setCvModal(t.cvUrl)}
                    className="btn-secondary flex-1 text-xs flex items-center justify-center gap-1">
                    <FileText size={13} /> Ver CV
                  </button>
                )}
                <button onClick={() => selectTrainer(t.id, `${t.firstName} ${t.lastName}`)}
                  className={`flex-1 text-xs flex items-center justify-center gap-1 ${user?.trainerId === t.id ? 'btn-secondary opacity-60' : 'btn-primary'}`}
                  disabled={user?.trainerId === t.id}>
                  <UserCheck size={13} />
                  {user?.trainerId === t.id ? 'Tu entrenador' : 'Seleccionar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CV Modal */}
      {cvModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-800">Hoja de Vida</h3>
              <button onClick={() => setCvModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <iframe src={cvModal} className="flex-1 w-full rounded-b-2xl" title="Hoja de vida" />
          </div>
        </div>
      )}
    </div>
  )
}
