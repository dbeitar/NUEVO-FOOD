import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../store/authSlice'
import { api } from '../../services/api'
import AppLogo from '../../components/AppLogo'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [planExpired, setPlanExpired] = useState(false)
  const [requestingRenewal, setRequestingRenewal] = useState(false)
  const [renewalSent, setRenewalSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotModal, setForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError(''); setLoading(true)
    try {
      const result = await dispatch(login(form) as any)
      if (login.fulfilled.match(result)) {
        const role = result.payload.user.role
        if (role === 'SUPER_ADMIN') navigate('/superadmin')
        else if (role === 'ADMIN') navigate('/admin')
        else if (role === 'TRAINER') navigate('/trainer')
        else navigate('/dashboard')
      } else {
        const msg = result.payload || 'Credenciales incorrectas'
        if (msg.includes('vencido') || msg.includes('suscripción')) {
          navigate('/plan-vencido', { state: { email: form.email } })
        } else {
          setError(msg)
        }
      }
    } catch {
      setError('Error al conectar con el servidor')
    }
    setLoading(false)
  }

  const handleRenewal = async () => {
    if (!form.email) { setError('Ingresa tu correo para solicitar renovación'); return }
    setRequestingRenewal(true)
    try {
      await api.post('/auth/request-renewal', { email: form.email })
      setRenewalSent(true)
    } catch { setError('Error al enviar la solicitud') }
    finally { setRequestingRenewal(false) }
  }

  const handleForgot = async () => {
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotMsg('Te enviamos una contraseña temporal a tu correo.')
    } catch { setForgotMsg('Si el correo existe, recibirás instrucciones.') }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary-500 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ width: `${(i+2)*80}px`, height: `${(i+2)*80}px`,
                top: `${20+i*10}%`, left: `${10+i*8}%`, opacity: 0.3 - i*0.04 }} />
          ))}
        </div>
        <div className="text-center text-white z-10 px-12">
          <AppLogo size={80} className="mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-3">Food Plan</h1>
          <p className="text-white/80 text-lg">Tu plan nutricional inteligente</p>
          <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
            {['Seguimiento nutricional diario', 'Entrenador personal asignado', 'Chatbot IA nutricional'].map(f => (
              <div key={f} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <AppLogo size={36} />
            <h1 className="text-2xl font-bold text-primary-600">Food Plan</h1>
          </div>

          {planExpired ? (
            /* ── Plan vencido ── */
            <div className="text-center py-4">
              <div className="text-6xl mb-4">⏰</div>
              <h2 className="text-2xl font-bold text-orange-700 mb-2">Tu plan ha vencido</h2>
              <p className="text-gray-500 text-sm mb-6">Para seguir usando Food Plan necesitas renovar tu suscripción.</p>
              {renewalSent ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4">
                  <p className="text-xl mb-2">✅</p>
                  <p className="font-bold text-green-700 mb-1">¡Solicitud enviada!</p>
                  <p className="text-sm text-green-600">El administrador se pondrá en contacto contigo pronto para activar tu plan.</p>
                </div>
              ) : (
                <button onClick={handleRenewal} disabled={requestingRenewal}
                  className="w-full py-3 bg-orange-500 text-white rounded-2xl text-base font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors mb-3">
                  {requestingRenewal ? 'Enviando solicitud...' : '📧 Solicitar renovación de plan'}
                </button>
              )}
              <button onClick={() => setPlanExpired(false)}
                className="text-sm text-gray-400 hover:text-gray-600 underline">
                ← Volver al inicio de sesión
              </button>
            </div>
          ) : (
            /* ── Formulario normal ── */
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido de nuevo</h2>
              <p className="text-gray-400 mb-8 text-sm">Ingresa tus credenciales para continuar</p>

              <div className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" className="input pl-9" placeholder="Correo electrónico"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} className="input pl-9 pr-10" placeholder="Contraseña"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <button onClick={handleLogin} disabled={loading}
                  className="btn-primary w-full py-3 text-base">
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>

                <div className="flex justify-between items-center text-sm">
                  <button onClick={() => setForgotModal(true)} className="text-gray-400 hover:text-primary-600">
                    ¿Olvidaste tu contraseña?
                  </button>
                  <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                    Crear cuenta
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Recuperar contraseña</h3>
            <p className="text-gray-500 text-sm mb-4">Ingresa tu correo y te enviaremos una contraseña temporal.</p>
            <input type="email" className="input mb-3" placeholder="tu@correo.com"
              value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            {forgotMsg && <p className="text-green-600 text-sm mb-3">{forgotMsg}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setForgotModal(false); setForgotMsg('') }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleForgot} className="btn-primary flex-1">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
