import { Link } from 'react-router-dom'
import { Building2, Settings, Users, Shield, Calculator, ChefHat, Apple } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface CardItem { to: string; icon: LucideIcon; title: string; desc: string; color: string }

const cards: CardItem[] = [
  { to: '/admin/users', icon: Users, title: 'Gestión de Usuarios', desc: 'Crear, editar y eliminar usuarios del sistema', color: 'bg-blue-500' },
  { to: '/superadmin/gyms', icon: Building2, title: 'Gimnasios', desc: 'Crear gimnasios y gestionar códigos de acceso', color: 'bg-green-500' },
  { to: '/superadmin/plans', icon: Settings, title: 'Planes & Configuración', desc: 'Ajustar precios, beneficios y reglas del semáforo', color: 'bg-orange-500' },
  { to: '/superadmin/recipes', icon: ChefHat, title: 'Recetas del Chef Nico', desc: 'Gestionar biblioteca de recetas saludables', color: 'bg-emerald-500' },
  { to: '/superadmin/foods', icon: Apple, title: 'Gestión de Alimentos', desc: 'Importar y administrar la base de datos de alimentos', color: 'bg-lime-500' },
  { to: '/profile', icon: Shield, title: 'Mi Perfil', desc: 'Actualizar información y metas del Super Admin', color: 'bg-purple-500' },
]

export default function SuperAdminDashboard() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Panel Super Administrador</h1>
        <p className="text-gray-500">Control total de la plataforma Food Plan</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${color} group-hover:scale-105 transition-transform`}>
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">{title}</h2>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
