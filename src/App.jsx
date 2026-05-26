import { useState } from 'react'
import { useAuth } from './context/useAuth'
import { useI18n } from './context/useI18n'
import ModernLogin from './components/ModernLogin'
import Register from './components/Register'
import RegisterCommercialWizard from './components/RegisterCommercialWizard'

const useCommercialRegister = import.meta.env.VITE_REGISTER_WIZARD_V2 !== 'false'
import Dashboard from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return <div className="loading">{t('common.loading', 'Cargando...')}</div>
  }

  if (!user) {
    return showRegister ? (
      useCommercialRegister ? (
        <RegisterCommercialWizard onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <Register onSwitchToLogin={() => setShowRegister(false)} />
      )
    ) : (
      <ModernLogin onSwitchToRegister={() => setShowRegister(true)} />
    )
  }

  return <Dashboard />
}

export default App
