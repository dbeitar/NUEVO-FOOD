import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  LayoutDashboard, Utensils, Bot, User, Users, Building2,
  Settings, LogOut, Menu, X, ChevronRight, ClipboardList, Dumbbell, Ruler, Star, Bell, ChefHat,
} from 'lucide-react'
import { RootState } from '../store/store'
import { useFeatures } from '../hooks/useFeature'
import { api } from '../services/api'
import { logout } from '../store/authSlice'

const AppleLogo = ({ size = 24 }: { size?: number }) => (
  <img src="/manzana.png" alt="logo" width={size} height={size} style={{ objectFit: 'contain' }} />
)

const ALL_USER_NAV = [
  { href: '/dashboard',    label: 'Dashboard',       icon: 'LayoutDashboard', feature: null },
  { href: '/nutrition',    label: 'Nutrición',        icon: 'Utensils',        feature: 'food_log' },
  { href: '/chatbot',      label: 'Chat Nico',          icon: 'Bot',             feature: 'chatbot' },
  { href: '/my-plan',      label: 'Mi Plan',          icon: 'ClipboardList',   feature: 'personal_nutrition' },
  { href: '/measurements', label: 'Medidas',          icon: 'Ruler',           feature: 'measurements' },
  { href: '/daily-report', label: 'Reporte Diario',   icon: 'ClipboardList',   feature: 'daily_report' },
  { href: '/recipes',      label: 'Recetas del Chef', icon: 'ChefHat',            feature: 'recipes' },
  { href: '/profile',      label: 'Perfil',           icon: 'User',            feature: null },
]

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Utensils, Bot, ClipboardList, Ruler, Star, ChefHat, User, Users, Building2, Settings, Bell, Dumbbell,
}

const navByRole: Record<string, { href: string; label: string; icon: any }[]> = {
  USER: ALL_USER_NAV.map(n => ({ ...n, icon: ICON_MAP[n.icon] })),
  TRAINER: [
    { href: '/trainer', label: 'Panel',  icon: Users },
    { href: '/trainer/notifications', label: 'Notificaciones', icon: Bell },
    { href: '/trainer/measurement-reminder', label: 'Recordatorio Medidas', icon: Ruler },
    { href: '/profile', label: 'Perfil', icon: User },
  ],
  ADMIN: [
    { href: '/admin',       label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Usuarios',  icon: Users },
    { href: '/admin/gyms',  label: 'Gimnasios', icon: Building2 },
    { href: '/profile',     label: 'Perfil',    icon: User },
  ],
  SUPER_ADMIN: [
    { href: '/superadmin',        label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users',       label: 'Usuarios',  icon: Users },
    { href: '/superadmin/gyms',   label: 'Gimnasios', icon: Building2 },
    { href: '/superadmin/plans',  label: 'Config',    icon: Settings },
    { href: '/superadmin/recipes',label: 'Recetas',   icon: ChefHat },
    { href: '/superadmin/foods',  label: 'Alimentos', icon: Star },
    { href: '/profile',           label: 'Perfil',    icon: User },
  ],
}

const roleLabels: Record<string, string> = {
  USER: 'Usuario', TRAINER: 'Entrenador', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const features = useFeatures()
  const hasFeature = (f: string) => features.includes('all') || features.includes(f)
  const [unreadNotes, setUnreadNotes] = useState(0)

  useEffect(() => {
    if (user?.role === 'USER') {
      api.get('/trainer/notes/unread-count')
        .then(r => setUnreadNotes(r.data.unread || 0))
        .catch(() => {})
    }
  }, [user])

  const rawNavItems = navByRole[user?.role || 'USER'] || []
  const navItems = user?.role === 'USER' && features.length > 0
  ? rawNavItems.filter((item: any) => !item.feature || hasFeature(item.feature))
  : rawNavItems
  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')
  const embeddedShell = import.meta.env.VITE_FOOD_EMBEDDED === 'true'
    || (typeof localStorage !== 'undefined' && localStorage.getItem('d28d_shell') === 'true')
  const shellLabel = (typeof localStorage !== 'undefined' && localStorage.getItem('d28d_shell_label'))
    || 'D28D'
  const handleBackToD28D = () => {
    const shellToken = localStorage.getItem('d28d_token')
    if (shellToken) localStorage.setItem('token', shellToken)
    localStorage.removeItem('d28d_shell')
    window.location.href = '/'
  }
  const handleLogout = () => {
    if (embeddedShell) {
      handleBackToD28D()
      return
    }
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── DESKTOP SIDEBAR ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #4d9424 0%, #64ba30 100%)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-white/20">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
            <AppleLogo size={22} />
          </div>
          <div>
            <span className="text-white font-bold text-base leading-tight block">Food Plan</span>
            <span className="text-white/60 text-xs">
              {embeddedShell ? `Dentro de ${shellLabel}` : 'Nutrición inteligente'}
            </span>
          </div>
        </div>

        {embeddedShell && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-white/15 border border-white/25 text-xs text-white/90">
            Sesión única con <strong className="text-white">{shellLabel}</strong>
          </div>
        )}

        {/* User */}
        {user && (
          <div className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-white/10 border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user.firstName} {user.lastName}</p>
                <span className="text-xs text-white/70">{roleLabels[user.role]}</span>
              </div>
              {/* Bell notification for USER role */}
              {user.role === 'USER' && (
                <Link to="/trainer-notes" onClick={() => setUnreadNotes(0)}
                  className="relative flex-shrink-0 p-1 text-white/70 hover:text-white transition-colors">
                  <Bell size={18} />
                  {unreadNotes > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {unreadNotes > 9 ? '9+' : unreadNotes}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} to={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                isActive(href)
                  ? 'bg-white text-primary-700 font-semibold shadow-sm'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}>
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
              {isActive(href) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* Salir */}
        <div className="p-2 border-t border-white/20 space-y-0.5">
          {embeddedShell && (
            <button type="button" onClick={handleBackToD28D}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:bg-white/15 hover:text-white w-full text-sm font-medium">
              <ChevronRight size={18} className="rotate-180" />
              <span>Volver a D28D</span>
            </button>
          )}
          <button type="button" onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/15 hover:text-white w-full text-sm">
            <LogOut size={18} />
            <span>{embeddedShell ? 'Cerrar Food Plan' : 'Cerrar Sesión'}</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE OVERLAY SIDEBAR ──────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 flex flex-col z-50"
            style={{ background: 'linear-gradient(180deg, #4d9424 0%, #64ba30 100%)' }}>

            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                  <AppleLogo size={22} />
                </div>
                <span className="text-white font-bold text-lg">Food Plan</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white p-1">
                <X size={22} />
              </button>
            </div>

            {user && (
              <div className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-white/10 border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{user.firstName} {user.lastName}</p>
                    <span className="text-xs text-white/70">{roleLabels[user.role]}</span>
                  </div>
                  {user.role === 'USER' && (
                    <Link to="/trainer-notes" onClick={() => { setSidebarOpen(false); setUnreadNotes(0) }}
                      className="relative flex-shrink-0 p-1 text-white/70 hover:text-white">
                      <Bell size={18} />
                      {unreadNotes > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {unreadNotes > 9 ? '9+' : unreadNotes}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} to={href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                    isActive(href)
                      ? 'bg-white text-primary-700 font-semibold'
                      : 'text-white/80 hover:bg-white/15 hover:text-white'
                  }`}>
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-2 border-t border-white/20">
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/15 w-full text-sm">
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {embeddedShell && (
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 text-white text-sm border-b border-slate-700">
            <span className="font-medium truncate">
              {shellLabel}
              <span className="text-white/60 font-normal"> · Plan de Alimentación</span>
            </span>
            <button
              type="button"
              onClick={handleBackToD28D}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-xs"
            >
              ← Volver a {shellLabel}
            </button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#64ba30' }}>
              <AppleLogo size={16} />
            </div>
            <span className="font-bold text-gray-800">Food Plan</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'USER' && (
              <Link to="/trainer-notes" onClick={() => setUnreadNotes(0)}
                className="relative p-1.5 text-gray-600 hover:text-gray-800">
                <Bell size={20} />
                {unreadNotes > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadNotes > 9 ? '9+' : unreadNotes}
                  </span>
                )}
              </Link>
            )}
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: '#64ba30' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <Link key={href} to={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                isActive(href) ? 'text-primary-600' : 'text-gray-400'
              }`}>
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
