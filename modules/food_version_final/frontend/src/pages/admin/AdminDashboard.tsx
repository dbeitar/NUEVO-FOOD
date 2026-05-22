import { useEffect, useState } from 'react'
import { Users, Building2, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { LucideIcon } from 'lucide-react'

interface StatCard { label: string; value: string | number; Icon: LucideIcon; bg: string }

function Card({ label, value, Icon, bg }: StatCard) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${bg}`}><Icon size={22} className="text-white" /></div>
        <div><p className="text-2xl font-bold text-gray-800">{value}</p><p className="text-gray-500 text-sm">{label}</p></div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, gyms: 0 })

  useEffect(() => {
    api.get('/users?limit=1').then(r => setStats(s => ({ ...s, users: r.data.meta?.total || 0 }))).catch(() => {})
    api.get('/gyms?limit=1').then(r => setStats(s => ({ ...s, gyms: r.data.meta?.total || 0 }))).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel Administrador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card label="Total Usuarios" value={stats.users} Icon={Users} bg="bg-blue-500" />
        <Card label="Gimnasios" value={stats.gyms} Icon={Building2} bg="bg-green-500" />
        <Card label="Activos hoy" value="—" Icon={Activity} bg="bg-purple-500" />
      </div>
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">Acceso rápido</h2>
        <div className="flex gap-3">
          <Link to="/admin/users" className="btn-primary">Gestionar Usuarios</Link>
          <Link to="/admin/gyms" className="btn-secondary">Ver Gimnasios</Link>
        </div>
      </div>
    </div>
  )
}
