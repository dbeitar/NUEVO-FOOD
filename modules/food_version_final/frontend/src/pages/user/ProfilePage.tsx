import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useFeature } from '../../hooks/useFeature'
import { RootState } from '../../store/store'
import { api } from '../../services/api'
import { User, Lock, Link, Unlink, CheckCircle, XCircle, Building2, Dumbbell, FileText } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useSelector((s: RootState) => s.auth)
  const isUser = user?.role === 'USER'
  const hasChooseTrainer = useFeature('choose_trainer')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  const [trainerCode, setTrainerCode] = useState('')
  const [myTrainer, setMyTrainer] = useState<any>(null)
  const [trainerMsg, setTrainerMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [trainerLoading, setTrainerLoading] = useState(false)

  useEffect(() => {
    if (isUser) {
      api.get('/users/me').then(r => {
        if (r.data.trainer) setMyTrainer(r.data.trainer)
      }).catch(() => {})
    }
  }, [isUser])

  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'Las contraseñas no coinciden' }); return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ ok: false, text: 'Mínimo 6 caracteres' }); return
    }
    setPwLoading(true)
    try {
      await api.patch('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwMsg({ ok: true, text: 'Contraseña actualizada correctamente' })
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.response?.data?.message || 'Error al cambiar contraseña' })
    } finally {
      setPwLoading(false)
    }
  }

  const linkTrainer = async () => {
    if (!trainerCode.trim()) return
    setTrainerLoading(true)
    try {
      const r = await api.post('/trainer/link-by-code', { trainerCode: trainerCode.trim().toUpperCase() })
      setMyTrainer(r.data.trainer)
      setTrainerMsg({ ok: true, text: r.data.message })
      setTrainerCode('')
    } catch (e: any) {
      setTrainerMsg({ ok: false, text: e.response?.data?.message || 'Código no válido' })
    } finally {
      setTrainerLoading(false)
    }
  }

  const unlinkTrainer = async () => {
    if (!confirm('¿Deseas desvincularte de tu entrenador?')) return
    try {
      await api.delete('/trainer/unlink')
      setMyTrainer(null)
      setTrainerMsg({ ok: true, text: 'Te has desvinculado del entrenador' })
    } catch {
      setTrainerMsg({ ok: false, text: 'Error al desvincular' })
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>

      {/* User info */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
            <User size={28} className="text-primary-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{user?.firstName} {user?.lastName}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Trainer + gym — only for USER role */}
      {isUser && hasChooseTrainer && (
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Dumbbell size={18} className="text-primary-600" /> Mi Entrenador
          </h2>

          {myTrainer ? (
            <div className="space-y-3">
              {/* Trainer info */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {myTrainer.firstName?.[0]}{myTrainer.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{myTrainer.firstName} {myTrainer.lastName}</p>
                  <p className="text-sm text-gray-500">{myTrainer.email}</p>
                </div>
                <CheckCircle size={18} className="text-green-600 ml-auto flex-shrink-0" />
              </div>
              {myTrainer.cvUrl && (
                <a href={myTrainer.cvUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary-600 hover:underline mt-2">
                  <FileText size={14} /> Ver hoja de vida del entrenador
                </a>
              )}

              {/* Trainer's gym */}
              {myTrainer.gym ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Building2 size={18} className="text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{myTrainer.gym.name}</p>
                    <p className="text-xs text-gray-400">{myTrainer.gym.city}, {myTrainer.gym.country}</p>
                  </div>
                  <span className="ml-auto text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Gimnasio</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-400">
                  <Building2 size={16} />
                  <span>Tu entrenador no está asociado a un gimnasio</span>
                </div>
              )}

              <button onClick={unlinkTrainer}
                className="btn-secondary flex items-center gap-2 text-sm w-full justify-center">
                <Unlink size={16} /> Desvincularme del entrenador
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Ingresa el código de tu entrenador para vincularte:</p>
              <div className="flex gap-2">
                <input
                  className="input flex-1 uppercase tracking-widest font-mono"
                  placeholder="TRN-XXXXX"
                  value={trainerCode}
                  onChange={e => setTrainerCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && linkTrainer()}
                />
                <button onClick={linkTrainer} disabled={trainerLoading} className="btn-primary">
                  {trainerLoading ? 'Verificando...' : 'Vincular'}
                </button>
              </div>
            </div>
          )}

          {trainerMsg && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${trainerMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {trainerMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {trainerMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Change password */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={18} className="text-primary-600" /> Cambiar Contraseña
        </h2>
        <div className="space-y-3">
          <input type="password" className="input" placeholder="Contraseña actual"
            value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          <input type="password" className="input" placeholder="Nueva contraseña"
            value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          <input type="password" className="input" placeholder="Confirmar nueva contraseña"
            value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          <button onClick={changePassword} disabled={pwLoading} className="btn-primary w-full">
            {pwLoading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
          {pwMsg && (
            <div className={`flex items-center gap-2 text-sm ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {pwMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {pwMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
