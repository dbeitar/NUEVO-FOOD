import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import api from '../services/api';
import { PUBLIC_BRAND_NAME } from '../utils/branding';

import Calculator from './Calculator';
import AdminCalculator from './AdminCalculator';
import FoodLog from './FoodLog';
import AdminFoodsManager from './AdminFoodsManager';
import AdminUsers from './AdminUsers';
import AdminPlans from './AdminPlans';
import AdminCompanies from './AdminCompanies';
import AdminGyms from './AdminGyms';
import MyAccount from './MyAccount';
import Progress from './Progress';
import Equivalentes from './Equivalentes';
import Recipes from './Recipes';
import TrainingModule from './TrainingModule';
import AdminTrainingGallery from './AdminTrainingGallery';
import AdminTrainingManager from './AdminTrainingManager';
import AdminLiveClasses from './AdminLiveClasses';
import LiveClasses from './LiveClasses';
import NutritionChat from './NutritionChat';
import AuditDashboard from './AuditDashboard';
import AdminProgramsManager from './AdminProgramsManager';

import { userRoles, isFinalUser, makeHasAnyRole } from './dashboard/roles';
import { getServicesFor } from './dashboard/userServices';
import MyPlanView from './dashboard/MyPlanView';
import ServicesHero from './dashboard/ServicesHero';
import FoodPlanAdminView from './dashboard/FoodPlanAdminView';
import D28DAdminView from './dashboard/D28DAdminView';
import TrainersAdminView from './dashboard/TrainersAdminView';
import GymAdminView from './dashboard/GymAdminView';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();

  // === Estado del shell ====================================================
  const [chatOpen, setChatOpen] = useState(false);
  // Vista actual. 'home' siempre renderiza el hero de servicios del usuario.
  const [currentView, setCurrentView] = useState('home');
  // Si admin/coach entra a un servicio, abrimos su panel (food-plan, d28d, training, gym).
  const [openServicePanel, setOpenServicePanel] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [dayTotals, setDayTotals] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [myPlan, setMyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [gymBrand, setGymBrand] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const roles = useMemo(() => userRoles(user), [user]);
  const hasAnyRole = useMemo(() => makeHasAnyRole(roles), [roles]);
  const isFinal = isFinalUser(user);
  const services = useMemo(() => getServicesFor(user), [user]);

  // === Carga de datos ======================================================
  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    (async () => {
      try {
        const r = await api.get('/plan/mine');
        if (active) setMyPlan(r.data?.data || null);
      } catch {
        if (active) setMyPlan(null);
      } finally {
        if (active) setPlanLoading(false);
      }
    })();

    (async () => {
      try {
        const r = await api.get('/food-log/totals', { params: { fecha: today } });
        if (active) setDayTotals(r.data?.data || null);
      } catch { /* silencioso */ }
    })();

    return () => { active = false; };
  }, [user?.id, today]);

  useEffect(() => {
    const gymId = user?.gym_id;
    if (!gymId) { setGymBrand(null); return; }
    let active = true;
    (async () => {
      try {
        const r = await api.get(`/gyms/${gymId}`);
        if (active) {
          const g = r.data?.data || r.data;
          setGymBrand(g || null);
        }
      } catch {
        if (active) setGymBrand(null);
      }
    })();
    return () => { active = false; };
  }, [user?.gym_id]);

  useEffect(() => {
    const isAdminish = hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio',
      'admin_food_plan', 'admin_training', 'admin_gym']);
    if (!isAdminish) { setAdminOverview(null); return; }
    let active = true;
    (async () => {
      try {
        const r = await api.get('/admin/overview');
        if (active) setAdminOverview(r?.data?.data || null);
      } catch {
        if (active) setAdminOverview(null);
      }
    })();
    return () => { active = false; };
  }, [hasAnyRole]);

  // === Branding (white-label) =============================================
  // Si el usuario pertenece a un gym con brand_name → ese.
  // Si no → "D28D Gimnasio Virtual" (default del producto).
  const brandName = gymBrand?.brand_name || gymBrand?.nombre || PUBLIC_BRAND_NAME;
  const brandLogo = gymBrand?.logo_url || '';

  // === Handlers ============================================================
  const navigate = (view) => {
    setCurrentView(view);
    setOpenServicePanel(null);
  };

  const onPickService = (service) => {
    if (!service) return;
    if (service.destinationView?.startsWith('service:')) {
      // Admin/coach → abrir maestro independiente.
      const moduleId = service.destinationView.split(':')[1];
      setOpenServicePanel(moduleId);
      setCurrentView('servicePanel');
      return;
    }
    // Usuario final → directo a su experiencia de consumo.
    navigate(service.destinationView);
  };

  const onBackToHome = () => {
    setOpenServicePanel(null);
    setSelectedProgram(null);
    setCurrentView('home');
  };

  // === Navegación principal (clara, contextual al rol) =====================
  // Regla: la barra principal queda corta y clara. Para roles administrativos
  // que necesitan acceso rápido a todos los maestros, se renderiza una
  // BARRA RÁPIDA SECUNDARIA debajo (ver `quickAdminItems`).
  const navItems = useMemo(() => {
    if (isFinal) {
      const items = [{ id: 'home', label: 'Inicio' }];
      if (services.find((s) => s.id === 'food-plan')) items.push({ id: 'myplan', label: 'Mi Plan' });
      if (services.find((s) => s.id === 'training')) items.push({ id: 'training', label: 'Entrenamiento' });
      items.push({ id: 'progress', label: 'Progreso' });
      if (services.find((s) => s.id === 'd28d') || services.find((s) => s.id === 'live-classes')) {
        items.push({ id: 'liveclasses', label: 'Clases' });
      }
      items.push({ id: 'myaccount', label: 'Mi cuenta' });
      return items.slice(0, 6);
    }

    // === Admins específicos: solo navegación de su servicio ===============
    if (!hasAnyRole(['super_admin'])) {
      if (hasAnyRole(['admin_d28d']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'programs', label: 'Programas D28D' },
          { id: 'adminliveclasses', label: 'Clases en Vivo' },
          { id: 'admingallery', label: 'Galería' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (hasAnyRole(['admin_food', 'admin_food_plan']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'foodsmanager', label: 'Maestro alimentos' },
          { id: 'admin', label: 'Conceptos calculadora' },
          { id: 'recipes', label: 'Recetas' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (hasAnyRole(['admin_entrenador', 'admin_training']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'admintraining', label: 'Rutinas' },
          { id: 'admingallery', label: 'Galería' },
          { id: 'adminusers', label: 'Mis usuarios' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (roles.includes('entrenador')) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'adminusers', label: 'Mis usuarios' },
          { id: 'admintraining', label: 'Rutinas' },
          { id: 'admin', label: 'Planes nutricionales' },
          { id: 'progress', label: 'Seguimiento' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (hasAnyRole(['admin_gimnasio', 'admin_gym', 'admin_marca'])) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'admingyms', label: 'Mi marca' },
          { id: 'adminusers', label: 'Usuarios' },
          { id: 'admintraining', label: 'Rutinas' },
          { id: 'adminliveclasses', label: 'Clases' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
    }

    // super_admin: barra principal corta; el resto va en la barra rápida.
    return [
      { id: 'home', label: 'Inicio' },
      { id: 'audit', label: 'Auditoría' },
      { id: 'myaccount', label: 'Mi cuenta' },
    ];
  }, [isFinal, roles, hasAnyRole, services]);

  // === Barra rápida de administración ======================================
  // Reglas: cada admin específico solo ve los maestros de SU servicio.
  // Solo super_admin ve todos los maestros. Admins de gym (marca blanca) ven
  // los maestros operativos de su gym.
  const quickAdminItems = useMemo(() => {
    if (isFinal) return [];
    const items = [];
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym'])) {
      items.push({ id: 'adminusers', label: 'Usuarios' });
    }
    if (hasAnyRole(['super_admin', 'admin_gym'])) {
      items.push({ id: 'admincompanies', label: 'Empresas' });
    }
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym'])) {
      items.push({ id: 'admingyms', label: 'Gyms' });
    }
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training', 'admin_entrenador'])) {
      items.push({ id: 'admintraining', label: 'Rutinas' });
    }
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training', 'admin_entrenador'])) {
      items.push({ id: 'admingallery', label: 'Galería' });
    }
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d'])) {
      items.push({ id: 'adminliveclasses', label: 'Clases en Vivo' });
    }
    if (hasAnyRole(['super_admin', 'admin_d28d'])) {
      items.push({ id: 'programs', label: 'Programas D28D' });
    }
    if (hasAnyRole(['super_admin', 'admin_food_plan', 'admin_food'])) {
      items.push({ id: 'foodsmanager', label: 'Maestro alimentos' });
    }
    if (hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista', 'admin_food_plan', 'admin_food'])) {
      items.push({ id: 'admin', label: 'Conceptos calculadora' });
    }
    if (hasAnyRole(['super_admin'])) {
      items.push({ id: 'adminplans', label: 'Planes suscripción' });
    }
    return items;
  }, [isFinal, hasAnyRole]);

  // === Vistas =============================================================
  const renderHome = () => (
    <ServicesHero
      user={user}
      services={services}
      brandName={brandName}
      onPickService={onPickService}
    />
  );

  const renderServicePanel = () => {
    if (!openServicePanel) return renderHome();
    if (openServicePanel === 'food-plan') {
      return <FoodPlanAdminView hasAnyRole={hasAnyRole} onNavigate={navigate} onBack={onBackToHome} />;
    }
    if (openServicePanel === 'd28d') {
      return (
        <D28DAdminView
          hasAnyRole={hasAnyRole}
          onNavigate={navigate}
          onPickProgram={(programId) => { setSelectedProgram(programId); navigate('liveclasses'); }}
          onBack={onBackToHome}
        />
      );
    }
    if (openServicePanel === 'training') {
      return <TrainersAdminView hasAnyRole={hasAnyRole} onNavigate={navigate} onBack={onBackToHome} />;
    }
    if (openServicePanel === 'live-classes') {
      // Panel admin de clases en vivo: directo al maestro de live classes.
      return <AdminLiveClasses />;
    }
    if (openServicePanel === 'gym') {
      return (
        <GymAdminView
          brandName={brandName}
          adminOverview={adminOverview}
          hasAnyRole={hasAnyRole}
          onNavigate={navigate}
          onBack={onBackToHome}
        />
      );
    }
    return renderHome();
  };

  // === Dispatcher principal ================================================
  const renderContent = () => {
    switch (currentView) {
      case 'calculator': return <Calculator />;
      case 'admin': return <AdminCalculator />;
      case 'foodlog': return <FoodLog />;
      case 'recipes': return <Recipes />;
      case 'foodsmanager': return hasAnyRole(['super_admin', 'admin_food_plan', 'admin_food']) ? <AdminFoodsManager /> : null;
      case 'adminusers': return <AdminUsers />;
      case 'adminplans': return hasAnyRole(['super_admin']) ? <AdminPlans /> : null;
      case 'admincompanies': return <AdminCompanies />;
      case 'admingyms': return <AdminGyms />;
      case 'myaccount': return <MyAccount />;
      case 'audit': return hasAnyRole(['super_admin']) ? <AuditDashboard /> : null;
      case 'progress': return <Progress />;
      case 'equivalentes': return <Equivalentes />;
      case 'training': return <TrainingModule />;
      case 'admintraining': return <AdminTrainingManager />;
      case 'admingallery': return <AdminTrainingGallery />;
      case 'adminliveclasses': return <AdminLiveClasses />;
      case 'liveclasses': return <LiveClasses programId={selectedProgram} />;
      case 'programs': return <AdminProgramsManager />;
      case 'myplan':
        return (
          <MyPlanView
            myPlan={myPlan}
            planLoading={planLoading}
            dayTotals={dayTotals}
            onNavigate={navigate}
          />
        );
      case 'servicePanel': return renderServicePanel();
      case 'home':
      default:
        return renderHome();
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {brandLogo
            ? <img src={brandLogo} alt={brandName} style={{ height: 28, width: 'auto', borderRadius: 6 }} />
            : <span aria-hidden="true">●</span>}
          <h1 style={{ fontSize: '1.05rem', margin: 0 }}>{brandName}</h1>
        </div>
        <div className="navbar-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={currentView === item.id ? 'nav-link active' : 'nav-link'}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="navbar-user">
          <div className="mr-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="input py-1 text-sm"
              aria-label={t('lang.label', 'Idioma')}
            >
              <option value="es">{t('lang.es', 'Español')}</option>
              <option value="en">{t('lang.en', 'Inglés')}</option>
            </select>
          </div>
          <span className="user-name">{user?.nombre}</span>
          <button onClick={logout} className="btn-logout">Cerrar sesión</button>
        </div>
      </nav>

      {quickAdminItems.length > 0 && (
        <div
          className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1 overflow-x-auto"
          aria-label="Acceso rápido a maestros"
        >
          <span className="text-xs uppercase tracking-wider text-slate-500 mr-2 font-semibold">
            Maestros
          </span>
          {quickAdminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                currentView === item.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="dashboard-content">
        {renderContent()}
      </div>

      {/* Asistente nutricional flotante. Para todos excepto super_admin */}
      {!hasAnyRole(['super_admin']) && (
        <div className="fixed bottom-4 right-4 z-40">
          {!chatOpen && (
            <button
              className="rounded-full bg-lime-500 text-black shadow-lg px-4 py-3"
              onClick={() => setChatOpen(true)}
              aria-label="Abrir asistente nutricional"
            >
              Asistente
            </button>
          )}
        </div>
      )}
      {chatOpen && (
        <div onClick={() => setChatOpen(false)} className="fixed inset-0 pointer-events-none" />
      )}
      {chatOpen && <NutritionChat />}
    </div>
  );
}
