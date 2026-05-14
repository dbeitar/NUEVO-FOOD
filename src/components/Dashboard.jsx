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
import LiveClassesPanel from './dashboard/LiveClassesPanel';
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
import MastersHub from './dashboard/MastersHub';
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

  // === Branding (white-label) =============================================
  // Regla: solo se aplica white-label si el gym tiene `brand_name` configurado
  // EXPLÍCITAMENTE. El `nombre` interno del gym (p.ej. "Gym Pro Fitness") es
  // su razón social, no su brand pública: el default del sistema siempre es
  // "D28D Gimnasio Virtual" hasta que un gym defina su propio brand_name.
  const brandName = (gymBrand?.brand_name && gymBrand.brand_name.trim())
    || PUBLIC_BRAND_NAME;
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
        // admin_d28d opera la plataforma D28D + los gimnasios marca
        // blanca que consumen su contenido. Debe poder administrar
        // gimnasios y usuarios además de programas/clases/galería.
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'programs', label: 'Programas D28D' },
          { id: 'liveclasses', label: 'Clases en Vivo' },
          { id: 'admingyms', label: 'Gimnasios' },
          { id: 'adminusers', label: 'Usuarios' },
          { id: 'admingallery', label: 'Galería' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (hasAnyRole(['admin_food', 'admin_food_plan']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        // admin_food administra el módulo de alimentación en toda la
        // plataforma: catálogo, recetas, planes de los usuarios y
        // seguimiento nutricional.
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'adminusers', label: 'Usuarios' },
          { id: 'admin', label: 'Planes' },
          { id: 'foodsmanager', label: 'Alimentos' },
          { id: 'recipes', label: 'Recetas' },
          { id: 'progress', label: 'Seguimiento' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
      if (hasAnyRole(['admin_entrenador', 'admin_training']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'adminusers', label: 'Usuarios' },
          { id: 'admintraining', label: 'Rutinas' },
          { id: 'admingallery', label: 'Galería' },
          { id: 'progress', label: 'Seguimiento' },
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
        // Gimnasios marca blanca operan dentro de D28D (consumen contenido y
        // agendan en plantillas de clases en vivo D28D).
        return [
          { id: 'home', label: 'Inicio' },
          { id: 'admingyms', label: 'Mi marca' },
          { id: 'adminusers', label: 'Usuarios' },
          { id: 'liveclasses', label: 'Clases en Vivo' },
          { id: 'admingallery', label: 'Galería' },
          { id: 'myaccount', label: 'Mi cuenta' },
        ];
      }
    }

    // super_admin: navegación operativa completa.
    //   - Empresas (gimnasios marca blanca): CRUD de clientes B2B.
    //   - Usuarios: alta/edición con multi-rol (un usuario puede tener
    //     varios roles a la vez: ej. coach + admin_food).
    //   - Maestros: hub que abre los catálogos de los 3 servicios.
    //   - Auditoría: trazabilidad completa del sistema (exclusivo super_admin).
    if (hasAnyRole(['super_admin'])) {
      return [
        { id: 'home', label: 'Inicio' },
        { id: 'admingyms', label: 'Empresas' },
        { id: 'adminusers', label: 'Usuarios' },
        { id: 'masters', label: 'Maestros' },
        { id: 'audit', label: 'Auditoría' },
        { id: 'myaccount', label: 'Mi cuenta' },
      ];
    }
    // Fallback defensivo (rol desconocido): solo Inicio + Mi cuenta.
    return [
      { id: 'home', label: 'Inicio' },
      { id: 'myaccount', label: 'Mi cuenta' },
    ];
  }, [isFinal, roles, hasAnyRole, services]);

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
      const canProgram = hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']);
      return (
        <LiveClassesPanel
          user={user}
          canProgram={canProgram}
          programId={selectedProgram}
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
      case 'adminliveclasses':
      case 'liveclasses': {
        const canProgram = hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']);
        return <LiveClassesPanel user={user} canProgram={canProgram} programId={selectedProgram} />;
      }
      case 'programs': return <AdminProgramsManager />;
      case 'masters':
        return (
          <MastersHub
            onOpenMaster={(moduleId) => {
              setOpenServicePanel(moduleId);
              setCurrentView('servicePanel');
            }}
          />
        );
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

      <div className="dashboard-content">
        {renderContent()}
      </div>

      {/* Asistente nutricional flotante. Solo para el usuario final con plan. */}
      {isFinal && services.find((s) => s.id === 'food-plan') && (
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
      {chatOpen && isFinal && <NutritionChat />}
    </div>
  );
}
