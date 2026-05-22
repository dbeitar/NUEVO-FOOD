import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import AppLogo from '../../components/AppLogo'

export default function PlanVencidoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as any)?.email || ''
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleRenewal = async () => {
    if (!email) { setError('No se pudo obtener tu correo. Vuelve e intenta de nuevo.'); return }
    setSending(true)
    try {
      await fetch('/api/v1/auth/request-renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Error al enviar la solicitud. Intenta de nuevo.')
    } finally { setSending(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center">
            <AppLogo size={36} />
          </div>
        </div>

        {/* Icon */}
        <div className="text-6xl mb-4">⏰</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tu plan ha vencido</h1>
        <p className="text-gray-500 text-sm mb-6">
          Tu suscripción a Food Plan ha expirado. Para continuar disfrutando de todas las funcionalidades, solicita la renovación de tu plan.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-bold text-green-700 mb-1">¡Solicitud enviada!</p>
            <p className="text-sm text-green-600">
              El administrador recibirá tu solicitud y se pondrá en contacto contigo pronto para activar tu plan.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
            )}
            <button
              onClick={handleRenewal}
              disabled={sending}
              className="w-full py-3.5 bg-orange-500 text-white rounded-2xl text-base font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors mb-3 shadow-sm">
              {sending ? 'Enviando solicitud...' : '📧 Solicitar renovación de plan'}
            </button>
          </>
        )}

        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver al inicio de sesión
        </button>
      </div>
    </div>
  )
}
