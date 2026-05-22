import { useState, useEffect } from 'react'
import { Plus, Search, Download, Trash2, Edit2, X, Save, CalendarPlus, Ban, Users, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../services/api'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'

const roleColors: Record<string, string> = {
  USER: 'badge-green',
  TRAINER: 'bg-purple-100 text-purple-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  ADMIN: 'bg-blue-100 text-blue-700 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  SUPER_ADMIN: 'badge-red',
}

// Roles que puede asignar cada rol
const allowedRolesByMe: Record<string, string[]> = {
  ADMIN: ['USER', 'TRAINER'],
  SUPER_ADMIN: ['USER', 'TRAINER', 'ADMIN'],
}

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'USER', password: '' })
  const { user: me } = useSelector((s: RootState) => s.auth)
  const [subModal, setSubModal] = useState<any>(null)
  const [extendDays, setExtendDays] = useState('30')
  const [subAction, setSubAction] = useState<'extend' | 'cancel'>('extend')
  const [savingSub, setSavingSub] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('BASIC')

  const editableRoles = allowedRolesByMe[me?.role] || []
  const [activeTab, setActiveTab] = useState<'all' | 'byTrainer' | 'byGym'>('all')
  const [trainers, setTrainers] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])
  const [expandedTrainer, setExpandedTrainer] = useState<string | null>(null)
  const [expandedGym, setExpandedGym] = useState<string | null>(null)
  const [trainerSearch, setTrainerSearch] = useState('')
  const [gymSearch, setGymSearch] = useState('')
  const [trainerUsers, setTrainerUsers] = useState<Record<string, any[]>>({})
  const [gymUsers, setGymUsers] = useState<Record<string, any[]>>({})

  const handleSubAction = async () => {
    if (!subModal) return
    setSavingSub(true)
    try {
      if (subAction === 'cancel') {
        await api.put(`/subscriptions/user/${subModal.id}/cancel`)
        toast.success('Suscripción cancelada')
      } else {
        const payload: any = { days: parseInt(extendDays) }
        if (!subModal.subscription) payload.planType = selectedPlan
        await api.put(`/subscriptions/user/${subModal.id}/extend`, payload)
        toast.success(subModal.subscription ? `Plan extendido ${extendDays} días` : `Plan asignado correctamente`)
      }
      setSubModal(null)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al procesar')
    } finally { setSavingSub(false) }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      const { data } = await api.get(`/users?${params}`)
      setUsers(data.data); setMeta(data.meta)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, roleFilter, page])
  useEffect(() => {
    if (activeTab === 'byTrainer' && trainers.length === 0) loadTrainers()
    if (activeTab === 'byGym' && gyms.length === 0) loadGyms()
  }, [activeTab])

  const loadTrainers = async () => {
    try {
      const { data } = await api.get('/users?role=TRAINER&limit=100')
      setTrainers(data.data || [])
    } catch {}
  }

  const loadGyms = async () => {
    try {
      const res = await api.get('/gyms')
      setGyms(res.data?.data || res.data || [])
    } catch {}
  }

  const loadTrainerUsers = async (trainerId: string) => {
    if (trainerUsers[trainerId]) return
    try {
      const { data } = await api.get(`/users?trainerId=${trainerId}&limit=100`)
      setTrainerUsers(prev => ({ ...prev, [trainerId]: data.data || [] }))
    } catch {}
  }

  const loadGymUsers = async (gymId: string) => {
    if (gymUsers[gymId]) return
    try {
      const { data } = await api.get(`/users?gymId=${gymId}&limit=100`)
      setGymUsers(prev => ({ ...prev, [gymId]: data.data || [] }))
    } catch {}
  }

  const exportTrainerReport = async () => {
    try {
      const { data } = await api.get('/users/export/by-trainer', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = 'usuarios_por_entrenador.xlsx'; a.click()
    } catch { toast.error('Error al exportar') }
  }

  const exportGymReport = async () => {
    try {
      const { data } = await api.get('/users/export/by-gym', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = 'usuarios_por_gimnasio.xlsx'; a.click()
    } catch { toast.error('Error al exportar') }
  }

  const exportExcel = async () => {
    const response = await api.get('/users/export/excel', { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const a = document.createElement('a'); a.href = url; a.download = 'usuarios.xlsx'; a.click()
    toast.success('Exportación completada')
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/users', form)
      toast.success('Usuario creado. Se enviaron las credenciales por email.')
      setCreateModal(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'USER', password: '' })
      load()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al crear usuario') }
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        firstName: editModal.firstName,
        lastName: editModal.lastName,
        phone: editModal.phone,
        role: editModal.role,
        isActive: editModal.isActive,
      }
      if (newPassword.trim()) payload.password = newPassword.trim()
      await api.patch(`/users/${editModal.id}`, payload)
      toast.success('Usuario actualizado')
      setEditModal(null); setNewPassword('')
      load()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error al actualizar') }
  }

  const deleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try { await api.delete(`/users/${id}`); toast.success('Usuario eliminado'); load() }
    catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
  }

  const canEdit = (u: any) => {
    if (u.isProtected) return false
    if (me?.role === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN') return true
    if (me?.role === 'ADMIN' && ['USER', 'TRAINER'].includes(u.role)) return true
    return false
  }

  const canDelete = (u: any) => me?.role === 'SUPER_ADMIN' && !u.isProtected
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    try { await api.delete(`/users/${id}`); load(); toast.success('Usuario eliminado') }
    catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          {meta && <p className="text-gray-500 text-sm">{meta.total} usuarios registrados</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Exportar Excel
          </button>
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'all', label: '👥 Todos', },
          { id: 'byTrainer', label: '🏋️ Por Entrenador', },
          { id: 'byGym', label: '🏢 Por Gimnasio', },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* BY TRAINER TAB */}
      {activeTab === 'byTrainer' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="input-field pl-9" placeholder="Buscar entrenador..."
                value={trainerSearch} onChange={e => setTrainerSearch(e.target.value)} />
            </div>
            <button onClick={exportTrainerReport} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} /> Exportar Excel
            </button>
          </div>
          <div className="space-y-3">
            {trainers.filter(t => 
              `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(trainerSearch.toLowerCase())
            ).map(trainer => (
              <div key={trainer.id} className="card overflow-hidden">
                <div className="flex items-center justify-between cursor-pointer p-1"
                  onClick={() => {
                    setExpandedTrainer(expandedTrainer === trainer.id ? null : trainer.id)
                    loadTrainerUsers(trainer.id)
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                      {trainer.firstName?.[0]}{trainer.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{trainer.firstName} {trainer.lastName}</p>
                      <p className="text-xs text-gray-500">{trainer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {trainerUsers[trainer.id]?.length ?? '...'} asesorados
                    </span>
                    {expandedTrainer === trainer.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {expandedTrainer === trainer.id && (
                  <div className="mt-3 border-t pt-3">
                    {!trainerUsers[trainer.id] ? (
                      <p className="text-sm text-gray-400 text-center py-3">Cargando...</p>
                    ) : trainerUsers[trainer.id].length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">Sin asesorados</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {['Nombre', 'Email', 'Plan', 'Días restantes', 'Estado', 'Acciones'].map(h => (
                                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {trainerUsers[trainer.id].map((u: any) => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                                <td className="px-3 py-2 text-gray-500">{u.subscription?.plan_name || 'Sin plan'}</td>
                                <td className="px-3 py-2">
                                  {u.subscription ? (
                                    <span className={`text-xs font-medium ${u.subscription.daysLeft <= 5 ? 'text-red-500' : u.subscription.daysLeft <= 15 ? 'text-yellow-500' : 'text-green-600'}`}>
                                      {u.subscription.daysLeft}d
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => { console.log('EDIT USER:', u); setEditModal({ ...u, role: u.role || 'USER' }); setNewPassword('') }}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                      <Edit2 size={14} />
                                    </button>
                                    {me?.role === 'SUPER_ADMIN' && (
                                      <button onClick={() => handleDelete(u.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BY GYM TAB */}
      {activeTab === 'byGym' && (
        <div>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input className="input-field pl-9" placeholder="Buscar gimnasio..."
                value={gymSearch} onChange={e => setGymSearch(e.target.value)} />
            </div>
            <button onClick={exportGymReport} className="btn-secondary flex items-center gap-2 text-sm">
              <Download size={14} /> Exportar Excel
            </button>
          </div>
          <div className="space-y-3">
            {gyms.filter(g =>
              `${g.name} ${g.city}`.toLowerCase().includes(gymSearch.toLowerCase())
            ).map(gym => (
              <div key={gym.id} className="card overflow-hidden">
                <div className="flex items-center justify-between cursor-pointer p-1"
                  onClick={() => {
                    setExpandedGym(expandedGym === gym.id ? null : gym.id)
                    loadGymUsers(gym.id)
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{gym.name}</p>
                      <p className="text-xs text-gray-500">{gym.city}, {gym.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      {gymUsers[gym.id]?.length ?? '...'} usuarios
                    </span>
                    {expandedGym === gym.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {expandedGym === gym.id && (
                  <div className="mt-3 border-t pt-3">
                    {!gymUsers[gym.id] ? (
                      <p className="text-sm text-gray-400 text-center py-3">Cargando...</p>
                    ) : gymUsers[gym.id].length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">Sin usuarios</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {['Nombre', 'Email', 'Rol', 'Plan', 'Estado'].map(h => (
                                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {gymUsers[gym.id].map((u: any) => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">{u.firstName} {u.lastName}</td>
                                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                                <td className="px-3 py-2"><span className={roleColors[u.role] || 'badge-green'}>{u.role}</span></td>
                                <td className="px-3 py-2 text-gray-500">{u.subscription?.plan_name || 'Sin plan'}</td>
                                <td className="px-3 py-2"><span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    {canEdit(u) && (
                                      <button onClick={() => { setEditModal(u); setNewPassword('') }}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                    {canDelete(u) && (
                                      <button onClick={() => handleDelete(u.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'all' && (
        <div>
        <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input-field pl-9" placeholder="Buscar..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field w-44" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
          <option value="">Todos los roles</option>
          <option value="USER">Usuario</option>
          <option value="TRAINER">Entrenador</option>
          <option value="ADMIN">Administrador</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto -mx-6 px-6"><table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nombre', 'Email', 'Teléfono', 'Rol', 'Entrenador', 'Gimnasio', 'Plan', 'Activo', 'Creado', 'Acciones'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">Cargando...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-sm text-gray-800">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.phone || '-'}</td>
                <td className="px-4 py-3">
                  <span className={roleColors[u.role] || 'badge-green'}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">{u.trainerFirstName ? `${u.trainerFirstName} ${u.trainerLastName || ''}` : '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">{u.gymName || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {u.subscription ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-xs font-medium text-gray-700">{u.subscription.plan_name}</span>
                        <div className={`text-xs mt-0.5 font-medium ${
                          u.subscription.daysLeft <= 5 ? 'text-red-500' :
                          u.subscription.daysLeft <= 15 ? 'text-yellow-500' : 'text-green-600'
                        }`}>
                          {u.subscription.daysLeft === 0 ? '⚠️ Vence hoy' : `${u.subscription.daysLeft}d restantes`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setSubModal(u); setSubAction('extend'); setExtendDays('30') }}
                          className="p-1 text-green-400 hover:text-green-600 hover:bg-green-50 rounded" title="Extender plan">
                          <CalendarPlus size={13} />
                        </button>
                        <button onClick={() => { setSubModal(u); setSubAction('cancel') }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Cancelar plan">
                          <Ban size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">Sin plan</span>
                      <button onClick={() => { setSubModal(u); setSubAction('extend'); setExtendDays('30') }}
                        className="p-1 text-green-400 hover:text-green-600 hover:bg-green-50 rounded" title="Asignar días">
                        <CalendarPlus size={13} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Sí' : 'No'}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {canEdit(u) && (
                      <button onClick={() => setEditModal({ ...u })}
                        className="text-blue-400 hover:text-blue-600" title="Editar">
                        <Edit2 size={16} />
                      </button>
                    )}
                    {canDelete(u) && (
                      <button onClick={() => deleteUser(u.id)}
                        className="text-red-400 hover:text-red-600" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-500">Página {meta.page} de {meta.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">Anterior</button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Editar Usuario</h3>
              <button onClick={() => { setEditModal(null); setNewPassword('') }}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input className="input-field" value={editModal.firstName || editModal.first_name || ""}
                    onChange={e => setEditModal((m: any) => ({ ...m, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                  <input className="input-field" value={editModal.lastName || editModal.last_name || ""}
                    onChange={e => setEditModal((m: any) => ({ ...m, lastName: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input className="input-field" value={editModal.phone || ''}
                  onChange={e => setEditModal((m: any) => ({ ...m, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                <select className="input-field" value={editModal.role}
                  onChange={e => setEditModal((m: any) => ({ ...m, role: e.target.value }))}>
                  {editableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nueva contraseña <span className="text-gray-400">(dejar vacío para no cambiar)</span>
                </label>
                <input type="password" className="input-field" placeholder="Nueva contraseña..."
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={editModal.isActive}
                  onChange={e => setEditModal((m: any) => ({ ...m, isActive: e.target.checked }))} />
                <label htmlFor="isActive" className="text-sm text-gray-700">Usuario activo</label>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setEditModal(null); setNewPassword('') }} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Nuevo Usuario</h3>
              <button onClick={() => setCreateModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={createUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Nombre" value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                <input className="input-field" placeholder="Apellido" value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
              </div>
              <input type="email" className="input-field" placeholder="Email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <input className="input-field" placeholder="Teléfono" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <select className="input-field" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {editableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input type="password" className="input-field" placeholder="Contraseña temporal"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Subscription modal */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                {subAction === 'extend' ? '📅 Extender plan' : '🚫 Cancelar plan'}
              </h3>
              <button onClick={() => setSubModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Usuario: <span className="font-semibold">{subModal.firstName} {subModal.lastName}</span>
            </p>
            {subAction === 'extend' ? (
              <div className="mb-5">
                {!subModal?.subscription && (
                  <div className="mb-3">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Plan a asignar</label>
                    <div className="flex gap-2">
                      {['BASIC', 'INTERMEDIATE', 'ADVANCED'].map(p => (
                        <button key={p} onClick={() => setSelectedPlan(p)}
                          className={`flex-1 py-1.5 text-xs rounded-lg border-2 font-medium transition-all ${
                            selectedPlan === p ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:border-primary-300'
                          }`}>
                          {p === 'BASIC' ? 'Básico' : p === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="text-sm font-medium text-gray-700 block mb-2">Días a agregar</label>
                <div className="flex gap-2 mb-3">
                  {[7, 15, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setExtendDays(String(d))}
                      className={`flex-1 py-1.5 text-xs rounded-lg border-2 font-medium transition-all ${
                        extendDays === String(d) ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-600 hover:border-green-300'
                      }`}>{d}d</button>
                  ))}
                </div>
                <input type="number" min="1" max="365" className="input w-full"
                  value={extendDays} onChange={e => setExtendDays(e.target.value)}
                  placeholder="Días personalizados" />
              </div>
            ) : (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">⚠️ Esto cancelará el plan inmediatamente y el usuario perderá acceso a las funcionalidades de su plan.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSubModal(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSubAction} disabled={savingSub}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 ${
                  subAction === 'cancel' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                }`}>
                {savingSub ? 'Procesando...' : subAction === 'extend' ? `Extender ${extendDays} días` : 'Cancelar plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
