import { useState } from 'react'
import { useAuth } from './context/useAuth'
import { useI18n } from './context/useI18n'
import ModernLogin from './components/ModernLogin'
import RegisterCommercialWizard from './components/RegisterCommercialWizard'
import Dashboard from './components/Dashboard'

/** Registro oficial único (wizard comercial). Requiere VITE_REGISTER_WIZARD_V2=true en prod. */
const registerWizardEnabled = import.meta.env.VITE_REGISTER_WIZARD_V2 !== 'false'

function App() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return <div className="loading">{t('common.loading', 'Cargando...')}</div>
  }

  if (!user) {
    if (showRegister) {
      if (!registerWizardEnabled) {
        return (
          <div className="loading">
            Registro no disponible. Contacta al administrador (VITE_REGISTER_WIZARD_V2 debe estar activo).
          </div>
        )
      }
      return <RegisterCommercialWizard onSwitchToLogin={() => setShowRegister(false)} />
    }
    return <ModernLogin onSwitchToRegister={() => setShowRegister(true)} />
  }

  return <Dashboard />
}

export default App
