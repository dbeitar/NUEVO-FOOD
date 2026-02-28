import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import ModernLogin from './components/ModernLogin'
import Register from './components/Register'
import Dashboard from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl font-medium text-gray-600">Cargando aplicación...</div>
      </div>
    )
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