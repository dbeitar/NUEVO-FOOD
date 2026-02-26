import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  ClipboardList, 
  Building2, 
  Dumbbell, 
  Apple, 
  Calculator, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard,
  ExternalLink
} from 'lucide-react';
import AdminUsers from './AdminUsers';
import AdminPlans from './AdminPlans';
import AdminCalculator from './AdminCalculator';
import AdminFoodsManager from './AdminFoodsManager';
import AdminGyms from './AdminGyms';
import AdminTrainers from './AdminTrainers';
import AdminCompanies from './AdminCompanies';
import { useI18n } from '../context/I18nContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const baseMenu = [
    { id: 'users', label: t('admin.menu.users', 'Usuarios'), icon: Users },
    { id: 'plans', label: t('admin.menu.plans', 'Planes'), icon: ClipboardList },
    { id: 'gyms', label: t('admin.menu.gyms', 'Gimnasios'), icon: Building2 },
    { id: 'trainers', label: t('admin.menu.trainers', 'Entrenadores'), icon: Dumbbell },
    { id: 'foods', label: t('admin.menu.foods', 'Alimentos'), icon: Apple },
    { id: 'calculator', label: t('admin.menu.calculator', 'Calculadora'), icon: Calculator },
    { id: 'payments', label: t('admin.menu.payments', 'Pagos'), icon: CreditCard },
  ];
  const menuItems = user?.rol === 'super_admin'
    ? [{ id: 'companies', label: t('admin.menu.companies', 'Empresas'), icon: Building2 }, ...baseMenu]
    : baseMenu;

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <AdminUsers />;
      case 'plans': return <AdminPlans />;
      case 'gyms': return <AdminGyms />;
      case 'trainers': return <AdminTrainers />;
      case 'foods': return <AdminFoodsManager />;
      case 'calculator': return <AdminCalculator />;
      case 'companies': return <AdminCompanies />;
      case 'payments':
        return (
          <div className="card max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-full">
                <CreditCard className="w-6 h-6 text-lime-400" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">Configuración de Pagos</h3>
            </div>
            
            <p className="text-stone-600 mb-8 leading-relaxed">
              Gestiona las pasarelas de pago y la configuración financiera de tu plataforma.
              Actualmente en modo de prueba.
            </p>

            <div className="space-y-6">
              <div className="group">
                <label className="label mb-2">
                  Stripe API Key (Public)
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    value="pk_test_51Mz..." 
                    disabled 
                    className="input font-mono text-sm disabled:opacity-70"
                  />
                  <div className="absolute right-3 top-3 text-xs text-slate-400">Read-only</div>
                </div>
              </div>

              <div className="group">
                <label className="label mb-2">
                  PayPal Client ID
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value="Af7s8d..." 
                    disabled 
                    className="input font-mono text-sm disabled:opacity-70" 
                  />
                   <div className="absolute right-3 top-3 text-xs text-slate-400">Read-only</div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        );
      default: return <AdminUsers />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-20 flex items-center px-8 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lime-500 rounded-lg shadow-2xl shadow-black">
                <LayoutDashboard className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold text-stone-900 tracking-tight">FoodPlan<span className="text-lime-500">.</span></span>
            </div>
            <button 
              className="ml-auto lg:hidden p-2 text-stone-500 hover:text-stone-900 transition-colors"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="p-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lime-600 font-bold border border-slate-300">
                {user?.nombre?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate">{user?.nombre || 'Administrador'}</p>
                <p className="text-xs text-stone-600 truncate capitalize">{user?.rol?.replace('_', ' ') || 'Super Admin'}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-stone-100 text-stone-900 ring-1 ring-stone-200' 
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 hover:ring-1 hover:ring-stone-200'}
                  `}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-lime-600' : 'text-stone-500 group-hover:text-lime-600'}`} />
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-600" />}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200">
                <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-lime-600 rounded-xl transition-all duration-200 mb-2"
            >
              <ExternalLink className="w-5 h-5" />
                  {t('admin.view_site', 'Ver Sitio Web')}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-600/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
                  {t('auth.logout', 'Cerrar Sesión')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 lg:hidden flex-shrink-0">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="text-lg font-bold text-stone-900">FoodPlan Admin</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-stone-50 p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  {menuItems.find(item => item.id === activeTab)?.label}
                </h1>
                <p className="text-stone-600 mt-1 text-sm">
                  {t('admin.subtitle', 'Gestiona {section} y configuraciones del sistema.').replace('{section}', (menuItems.find(item => item.id === activeTab)?.label || '').toLowerCase())}
                </p>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
