import { useState } from 'react'
import { useAuth } from './context/useAuth'
import ModernLogin from './components/ModernLogin'
import Register from './components/Register'
import Dashboard from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <ModernLogin onSwitchToRegister={() => setShowRegister(true)} />
    )
  }

  return <Dashboard />
}

export default App
