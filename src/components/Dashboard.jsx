import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import api from '../services/api';
import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { useFrontendConfig } from '../context/FrontendConfigContext';
import { getPublicBrandLogo } from '../utils/frontendConfigMerge';
import { resolveMediaUrl } from '../utils/mediaUrl';
import AdminFrontendAppearance from './AdminFrontendAppearance';

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
import { isFoodExternal, getFoodModulePublicUrl, isFoodLegacyView, openFoodModule } from '../utils/foodModule';
import {
  isTrainingExternal,
  isTrainingLegacyMode,
  isTrainingLegacyView,
  openTrainingModule,
  openTrainingModuleView,
  consumeTrainingLaunch,
} from '../utils/trainingModule';
import MyPlanView from './dashboard/MyPlanView';
import ServicesHero from './dashboard/ServicesHero';
import AdminPaymentLinks from './AdminPaymentLinks';
import AdminModuleVigencias from './AdminModuleVigencias';
import FoodPlanAdminView from './dashboard/FoodPlanAdminView';
import D28DAdminView from './dashboard/D28DAdminView';
import TrainersAdminView from './dashboard/TrainersAdminView';
import MastersHub from './dashboard/MastersHub';
import D28dRoutinesMaster from './admin/D28dRoutinesMaster';
import D28dCoachTracking from './d28d/D28dCoachTracking';
import D28dZoomAccountsMaster from './d28d/D28dZoomAccountsMaster';
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { config: frontendConfig, brandName: publicBrandName } = useFrontendConfig();

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
  const [coachBrand, setCoachBrand] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');
    const view = params.get('view');
    if (service === 'food-plan') {
      setOpenServicePanel('food-plan');
      setCurrentView('servicePanel');
      params.delete('service');
      params.delete('view');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', next);
    } else if (view && isFoodLegacyView(view)) {
      setCurrentView(view);
      params.delete('view');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, []);

  const roles = useMemo(() => userRoles(user), [user]);
  const hasAnyRole = useMemo(() => makeHasAnyRole(roles), [roles]);
  const isFinal = isFinalUser(user);
  const services = useMemo(
    () => getServicesFor(user, frontendConfig, lang),
    [user, frontendConfig, lang],
  );

  useEffect(() => {
    consumeTrainingLaunch(navigate, setOpenServicePanel, setCurrentView);
  }, [user?.id]);

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
    const tid = user?.trainer_id;
    if (!tid) { setCoachBrand(null); return; }
    let active = true;
    (async () => {
      try {
        const r = await api.get(`/trainers/${tid}/branding`);
        if (active) setCoachBrand(r.data);
      } catch {
        if (active) setCoachBrand(null);
      }
    })();
    return () => { active = false; };
  }, [user?.trainer_id]);

  // === Branding (white-label) =============================================
  const brandName = (gymBrand?.brand_name && gymBrand.brand_name.trim())
    || (coachBrand?.white_label_enabled && coachBrand?.brand_name?.trim())
    || publicBrandName
    || PUBLIC_BRAND_NAME;
  const brandLogo = gymBrand?.logo_url
    || (coachBrand?.white_label_enabled ? coachBrand?.logo_url : '')
    || getPublicBrandLogo(frontendConfig)
    || '';
  const brandLogoSrc = brandLogo ? resolveMediaUrl(brandLogo) : '';

  // === Handlers ============================================================
  const navigate = (view) => {
    if (view === 'home') {
      setOpenServicePanel(null);
      setSelectedProgram(null);
      setCurrentView('home');
      return;
    }
    if (isFoodExternal() && isFoodLegacyView(view)) {
      openFoodModule('/dashboard');
      return;
    }
    // Solo relanzar SSO al entrar por módulo externo; dentro del shell los maestros navegan directo.
    if (isTrainingExternal() && isTrainingLegacyView(view)) {
      openTrainingModuleView(view);
      return;
    }
    setCurrentView(view);
    if (isTrainingLegacyView(view)) {
      setOpenServicePanel('training');
    } else if (view === 'servicePanel') {
      /* mantiene openServicePanel actual */
    } else {
      setOpenServicePanel(null);
    }
  };

  const backToTrainingPanel = () => {
    setOpenServicePanel('training');
    setCurrentView('servicePanel');
  };

  const onPickService = async (service) => {
    if (!service) return;
    if (service.destinationView === 'external:food' || (service.moduleLaunch === 'food' && isFoodExternal())) {
      openFoodModule('/dashboard');
      return;
    }
    if (service.destinationView === 'external:training' || (service.moduleLaunch === 'training' && isTrainingExternal())) {
      await openTrainingModule('/dashboard', '/coach');
      return;
    }
    if (service.moduleLaunch === 'training' && isTrainingLegacyMode()) {
      setOpenServicePanel('training');
      setCurrentView('servicePanel');
      return;
    }
    if (service.destinationView?.startsWith('service:')) {
      // Admin/coach → panel del servicio (gym vive solo dentro de D28D).
      let moduleId = service.destinationView.split(':')[1];
      if (moduleId === 'gym') moduleId = 'd28d';
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
    const home = t('nav.home', 'Inicio');
    const account = t('nav.myaccount', 'Mi Cuenta');
    if (isFinal) {
      const items = [{ id: 'home', label: home }];
      if (services.find((s) => s.id === 'food-plan') && !isFoodExternal()) {
        items.push({ id: 'myplan', label: t('nav.myplan', 'Mi Plan') });
      }
      if (services.find((s) => s.id === 'training')) items.push({ id: 'training', label: t('nav.training', 'Entrenamiento') });
      items.push({ id: 'progress', label: t('nav.progress', 'Progreso') });
      if (services.find((s) => s.id === 'd28d') || services.find((s) => s.id === 'live-classes')) {
        items.push({ id: 'liveclasses', label: t('nav.liveclasses_short', 'Clases') });
      }
      items.push({ id: 'myaccount', label: account });
      return items.slice(0, 6);
    }

    if (!hasAnyRole(['super_admin'])) {
      if (hasAnyRole(['admin_d28d']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: home },
          { id: 'programs', label: t('nav.programs_d28d', 'Programas D28D') },
          { id: 'liveclasses', label: t('nav.liveclasses', 'Clases en Vivo') },
          { id: 'admingyms', label: t('nav.gyms', 'Gimnasios') },
          { id: 'adminusers', label: t('nav.users', 'Usuarios') },
          { id: 'admingallery', label: t('nav.gallery', 'Galería') },
          { id: 'myaccount', label: account },
        ];
      }
      if (hasAnyRole(['admin_food', 'admin_food_plan']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        if (isFoodExternal()) {
          return [
            { id: 'home', label: home },
            { id: 'adminusers', label: t('nav.users', 'Usuarios') },
            { id: 'myaccount', label: account },
          ];
        }
        return [
          { id: 'home', label: home },
          { id: 'adminusers', label: t('nav.users', 'Usuarios') },
          { id: 'admin', label: t('nav.plans_short', 'Planes') },
          { id: 'foodsmanager', label: t('nav.foods_catalog', 'Alimentos') },
          { id: 'recipes', label: t('nav.recipes', 'Recetas') },
          { id: 'progress', label: t('nav.tracking', 'Seguimiento') },
          { id: 'myaccount', label: account },
        ];
      }
      if (hasAnyRole(['admin_entrenador', 'admin_training']) && !hasAnyRole(['admin_marca', 'admin_gimnasio'])) {
        return [
          { id: 'home', label: home },
          { id: 'adminusers', label: t('nav.users', 'Usuarios') },
          { id: 'modulevigencias', label: t('nav.vigencias', 'Vigencias') },
          { id: 'admintraining', label: t('nav.routines', 'Rutinas') },
          { id: 'admingallery', label: t('nav.gallery', 'Galería') },
          { id: 'progress', label: t('nav.tracking', 'Seguimiento') },
          { id: 'myaccount', label: account },
        ];
      }
      if (roles.includes('entrenador_d28d') && !roles.includes('entrenador')) {
        return [
          { id: 'home', label: home },
          { id: 'liveclasses', label: t('nav.liveclasses', 'Clases en Vivo') },
          { id: 'd28dtracking', label: t('nav.tracking', 'Seguimiento') },
          { id: 'myaccount', label: account },
        ];
      }
      if (roles.includes('entrenador')) {
        return [
          { id: 'home', label: home },
          { id: 'adminusers', label: t('nav.myusers', 'Mis usuarios') },
          { id: 'modulevigencias', label: t('nav.vigencias', 'Vigencias') },
          { id: 'coachroutines', label: t('nav.routine_templates', 'Plantillas rutina') },
          { id: 'admintraining', label: t('nav.planning', 'Planificación') },
          { id: 'admingallery', label: t('nav.gallery', 'Galería') },
          { id: 'progress', label: t('nav.tracking', 'Seguimiento') },
          { id: 'myaccount', label: account },
        ];
      }
      if (hasAnyRole(['admin_gimnasio', 'admin_gym', 'admin_marca'])) {
        return [
          { id: 'home', label: home },
          { id: 'admingyms', label: t('nav.mybrand', 'Mi marca') },
          { id: 'adminusers', label: t('nav.users', 'Usuarios') },
          { id: 'modulevigencias', label: t('nav.vigencias', 'Vigencias') },
          { id: 'liveclasses', label: t('nav.liveclasses', 'Clases en Vivo') },
          { id: 'admingallery', label: t('nav.gallery', 'Galería') },
          { id: 'myaccount', label: account },
        ];
      }
    }

    if (hasAnyRole(['super_admin'])) {
      return [
        { id: 'home', label: home },
        { id: 'admingyms', label: t('nav.companies', 'Empresas') },
        { id: 'adminusers', label: t('nav.users', 'Usuarios') },
        { id: 'masters', label: t('nav.masters', 'Maestros') },
        { id: 'audit', label: t('nav.audit', 'Auditoría') },
        { id: 'paymentlinks', label: t('nav.paymentlinks', 'Pagos') },
        { id: 'modulevigencias', label: t('nav.vigencias', 'Vigencias') },
        { id: 'appearance', label: t('nav.appearance', 'Apariencia') },
        { id: 'myaccount', label: account },
      ];
    }
    return [
      { id: 'home', label: home },
      { id: 'myaccount', label: account },
    ];
  }, [isFinal, roles, hasAnyRole, services, lang, t]);

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
      return (
        <FoodPlanAdminView
          hasAnyRole={hasAnyRole}
          onNavigate={navigate}
          onBack={onBackToHome}
          foodExternal={isFoodExternal()}
          foodExternalUrl={getFoodModulePublicUrl()}
        />
      );
    }
    if (openServicePanel === 'd28d') {
      const navigateD28d = (view) => {
        const d28dViews = new Set([
          'liveclasses', 'programs', 'd28dzoom', 'admingyms', 'adminusers',
          'admincompanies', 'admingallery', 'adminliveclasses',
        ]);
        if (d28dViews.has(view)) {
          setOpenServicePanel('d28d');
          setCurrentView(view);
          return;
        }
        navigate(view);
      };
      return (
        <D28DAdminView
          hasAnyRole={hasAnyRole}
          onNavigate={navigateD28d}
          onPickProgram={(programId) => {
            setSelectedProgram(programId);
            setOpenServicePanel('d28d');
            setCurrentView('liveclasses');
          }}
          onBack={onBackToHome}
        />
      );
    }
    if (openServicePanel === 'training') {
      return (
        <TrainersAdminView
          hasAnyRole={hasAnyRole}
          onNavigate={navigate}
          onBack={onBackToHome}
          trainingExternal={isTrainingExternal()}
        />
      );
    }
    if (openServicePanel === 'd28d-zoom') {
      if (!hasAnyRole(['super_admin', 'admin_d28d'])) return renderHome();
      return (
        <D28dZoomAccountsMaster
          onBack={() => {
            setOpenServicePanel(null);
            setCurrentView('masters');
          }}
        />
      );
    }
    if (openServicePanel === 'd28d-routines') {
      if (!hasAnyRole(['super_admin', 'admin_d28d', 'entrenador_d28d'])) {
        return renderHome();
      }
      return (
        <D28dRoutinesMaster
          variant="platform"
          readOnly={!hasAnyRole(['super_admin', 'admin_d28d'])}
          onBack={() => {
            setOpenServicePanel(null);
            setCurrentView('masters');
          }}
        />
      );
    }
    if (openServicePanel === 'coach-routines') {
      if (!hasAnyRole(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador'])) {
        return renderHome();
      }
      return (
        <D28dRoutinesMaster
          variant="coach"
          readOnly={false}
          onBack={onBackToHome}
        />
      );
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
      case 'paymentlinks': return hasAnyRole(['super_admin']) ? <AdminPaymentLinks /> : null;
      case 'modulevigencias':
        return hasAnyRole([
          'super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador',
          'admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista',
        ]) ? <AdminModuleVigencias /> : null;
      case 'appearance': return hasAnyRole(['super_admin']) ? <AdminFrontendAppearance /> : null;
      case 'progress': return <Progress />;
      case 'd28dtracking':
        if (!hasAnyRole(['entrenador_d28d'])) return renderHome();
        return <D28dCoachTracking onBack={() => navigate('home')} />;
      case 'equivalentes': return <Equivalentes />;
      case 'training': return <TrainingModule />;
      case 'coachroutines':
        if (!hasAnyRole(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador'])) return renderHome();
        return (
          <D28dRoutinesMaster
            variant="coach"
            readOnly={false}
            onBack={backToTrainingPanel}
          />
        );
      case 'admintraining':
        if (!hasAnyRole(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador', 'super_admin', 'admin_marca', 'admin_gimnasio'])) {
          return renderHome();
        }
        return <AdminTrainingManager onBack={backToTrainingPanel} />;
      case 'admingallery': return <AdminTrainingGallery />;
      case 'adminliveclasses':
      case 'liveclasses': {
        const canProgram = hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']);
        return <LiveClassesPanel user={user} canProgram={canProgram} programId={selectedProgram} />;
      }
      case 'programs': return <AdminProgramsManager />;
      case 'd28dzoom':
        if (!hasAnyRole(['super_admin', 'admin_d28d'])) return renderHome();
        return (
          <D28dZoomAccountsMaster
            onBack={() => {
              setOpenServicePanel('d28d');
              setCurrentView('servicePanel');
            }}
          />
        );
      case 'masters':
        return (
          <MastersHub
            hasAnyRole={hasAnyRole}
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
          {brandLogoSrc
            ? <img src={brandLogoSrc} alt={brandName} style={{ height: 28, width: 'auto', borderRadius: 4 }} />
            : null}
          <h1 style={{ fontSize: '1.05rem', margin: 0 }}>
            {(() => {
              const parts = String(brandName || 'D28D GYM VIRTUAL').split(' ');
              const head = parts[0] || 'D28D';
              const tail = parts.slice(1).join(' ');
              return (
                <>
                  <span className="brand-d28d">{head}</span>
                  {tail ? ` ${tail}` : ''}
                </>
              );
            })()}
          </h1>
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
          <button onClick={logout} className="btn-logout">{t('auth.logout', 'Cerrar Sesión')}</button>
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
              className="fab-assistant"
              onClick={() => setChatOpen(true)}
              aria-label={t('nav.assistant', 'Asistente')}
            >
              {t('nav.assistant', 'Asistente')}
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
