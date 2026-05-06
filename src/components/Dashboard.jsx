import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
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
import EcosystemOverview from './EcosystemOverview';
import { useI18n } from '../context/useI18n';
import NutritionChat from './NutritionChat';
import api from '../services/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => {
    return 'home';
  });
  const [selectedModule, setSelectedModule] = useState(null);
  const [dayTotals, setDayTotals] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const plan = { calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 };
  const today = new Date().toISOString().split('T')[0];
  const { t, lang, setLang } = useI18n();
  const hasAnyRole = (roles) => {
    const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.rol].filter(Boolean);
    return roles.some((role) => userRoles.includes(role));
  };

  useEffect(() => {
    // Limpiar flag de arranque en Home tras registro
    try {
      if (localStorage.getItem('afterRegisterHome')) {
        localStorage.removeItem('afterRegisterHome');
      }
    } catch {
      console.warn('No se pudo limpiar afterRegisterHome');
    }
    const fetchTotals = async () => {
      try {
        const resp = await api.get('/food-log/totals', { params: { fecha: today } });
        setDayTotals(resp.data.data);
      } catch (err) {
        console.warn('Failed to fetch day totals', err);
      }
    };
    fetchTotals();
  }, [today]);

  useEffect(() => {
    const isAdmin = hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_food_plan', 'admin_training', 'admin_gym']);
    if (!isAdmin) {
      setAdminOverview(null);
      return;
    }
    const fetchAdminOverview = async () => {
      try {
        const resp = await api.get('/admin/overview');
        setAdminOverview(resp?.data?.data || null);
      } catch (err) {
        console.warn('Failed to fetch admin overview', err);
        setAdminOverview(null);
      }
    };
    fetchAdminOverview();
  }, [user?.rol, user?.roles]);

  const renderContent = () => {
    switch (currentView) {
      case 'calculator':
        return <Calculator />;
      case 'admin':
        return <AdminCalculator />;
      case 'foodlog':
        return <FoodLog />;
      case 'recipes':
        return <Recipes />;
      case 'foodsmanager':
        return hasAnyRole(['super_admin']) ? <AdminFoodsManager /> : null;
      case 'adminusers':
        return <AdminUsers />;
      case 'adminplans':
        return hasAnyRole(['super_admin']) ? <AdminPlans /> : null;
      case 'admincompanies':
        return <AdminCompanies />;
      case 'admingyms':
        return <AdminGyms />;
      case 'myaccount':
        return <MyAccount />;
      case 'progress':
        return <Progress />;
      case 'equivalentes':
        return <Equivalentes />;
      case 'training':
        return <TrainingModule />;
      case 'admintraining':
        return <AdminTrainingManager />;
      case 'admingallery':
        return <AdminTrainingGallery />;
      case 'adminliveclasses':
        return <AdminLiveClasses />;
      case 'liveclasses':
        return <LiveClasses />;
      case 'ecosystem':
        return <EcosystemOverview />;
      default:
        return (
          <>
            <header className="dashboard-header">
              <h2>{t('welcome.title', 'Bienvenido, {name}!').replace('{name}', user?.nombre || '')}</h2>
              <p className="flex items-center gap-2">
                <span>{t('welcome.role', 'Roles')}:</span>
                {(user?.roles && user.roles.length ? user.roles : [user?.rol || 'usuario_final']).map(r => (
                  <span key={r} className="inline-block px-2 py-0.5 bg-lime-500/20 text-lime-600 rounded text-xs font-semibold uppercase tracking-wider">{String(r).replace(/_/g, ' ')}</span>
                ))}
              </p>
            </header>

            {/* Resumen administrativo movido abajo según el módulo */}

            {!selectedModule ? (
              <div className="services-hero">
                <h2 className="services-hero-title">NUESTROS <span>SERVICIOS</span></h2>
                <p className="services-hero-subtitle">Todo lo que necesitas para alcanzar tu mejor versión, en un solo lugar.</p>
                
                <div className="services-hero-grid">
                  <div className="service-card-hero" onClick={() => setSelectedModule('food-plan')}>
                    <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80" alt="D28D GYM virtual" className="service-card-hero-img" />
                    <div className="service-card-hero-content">
                      <h3 className="service-card-hero-title">FOOD PLAN</h3>
                      <p className="service-card-hero-desc">Alimentación inteligente guiada por expertos para maximizar tus resultados.</p>
                    </div>
                  </div>

                  <div className="service-card-hero" onClick={() => setSelectedModule('d28d')}>
                    <img src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80" alt="D28D" className="service-card-hero-img" />
                    <div className="service-card-hero-content">
                      <h3 className="service-card-hero-title">D28D</h3>
                      <p className="service-card-hero-desc">Galería de plantillas, agendamiento y sesiones en vivo. Transforma tu cuerpo en 28 días.</p>
                    </div>
                  </div>

                  <div className="service-card-hero" onClick={() => setSelectedModule('training')}>
                    <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80" alt="Entrenadores" className="service-card-hero-img" />
                    <div className="service-card-hero-content">
                      <h3 className="service-card-hero-title">ENTRENADORES</h3>
                      <p className="service-card-hero-desc">Módulo funcional para entrenadores. Asigna y edita rutinas de tus clientes.</p>
                    </div>
                  </div>

                  <div className="service-card-hero" onClick={() => setSelectedModule('gym')}>
                    <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80" alt="Maestro Gym" className="service-card-hero-img" />
                    <div className="service-card-hero-content">
                      <h3 className="service-card-hero-title">MAESTRO GYM</h3>
                      <p className="service-card-hero-desc">Gestión de modelo marca blanca. Los gimnasios consumen los videos y clases de D28D.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <button className="btn-secondary" onClick={() => setSelectedModule(null)}>
                  &larr; Volver a Servicios
                </button>
              </div>
            )}

            {selectedModule && (
              <div className="dashboard-grid">
                
                {/* --- MODULE: GYM --- */}
                {selectedModule === 'gym' && (
                  <>
                    {hasAnyRole(['super_admin']) && (
                      <div className="card" onClick={() => setCurrentView('ecosystem')}>
                        <h3>🧩 Ecosistema Modular</h3>
                        <p>Controla modulos, marcas blancas, permisos y reglas D28D bloqueadas.</p>
                        <button className="btn-card">Abrir Ecosistema</button>
                      </div>
                    )}
                    {hasAnyRole(['super_admin', 'admin_gym']) && (
                      <div className="card" onClick={() => setCurrentView('admincompanies')}>
                        <h3>{t('card.companies.title', '🏢 Empresas')}</h3>
                        <p>{t('card.companies.desc', 'Consulta gimnasios, entrenadores y usuarios asociados')}</p>
                        <button className="btn-card">{t('card.companies.button', 'Abrir Empresas')}</button>
                      </div>
                    )}
                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
                      <div className="card" onClick={() => setCurrentView('admingyms')}>
                        <h3>🏷️ Maestro Gym / Marca Blanca</h3>
                        <p>Crea gimnasios, colores, logo, slug, WhatsApp y mensaje de marca.</p>
                        <button className="btn-card">Abrir Maestro Gym</button>
                      </div>
                    )}
                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
                      <div className="card" onClick={() => setCurrentView('adminusers')}>
                        <h3>{t('card.users.title', '👥 Usuarios y Roles')}</h3>
                        <p>{t('card.users.desc', 'Consulta y ajusta los roles de usuarios')}</p>
                        <button className="btn-card">{t('card.users.button', 'Abrir Usuarios')}</button>
                      </div>
                    )}
                    {hasAnyRole(['super_admin', 'admin_gym']) && (
                      <div className="card" onClick={() => setCurrentView('adminplans')}>
                        <h3>{t('card.plans.title', '🧾 Planes de Suscripción')}</h3>
                        <p>{t('card.plans.desc', 'Crea, edita y elimina planes')}</p>
                        <button className="btn-card">{t('card.plans.button', 'Gestionar Planes')}</button>
                      </div>
                    )}
                  </>
                )}

                {/* --- MODULE: FOOD PLAN --- */}
                {selectedModule === 'food-plan' && (
                  <>
                    <div className="card" onClick={() => setCurrentView('calculator')}>
                      <h3>{t('card.calculator.title', '🧮 Calculadora Nutricional')}</h3>
                      <p>{t('card.calculator.desc', 'Calcula tu plan personalizado basado en tus datos')}</p>
                      <button className="btn-card">{t('card.calculator.button', 'Ir a Calculadora')}</button>
                    </div>

                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista', 'admin_food_plan']) ? (
                      <div className="card" onClick={() => setCurrentView('admin')}>
                        <h3>{t('card.admin.title', '⚙️ Administración')}</h3>
                        <p>{t('card.admin.desc', 'Gestiona los conceptos de la calculadora')}</p>
                        <button className="btn-card">{t('card.admin.button', 'Panel Admin')}</button>
                      </div>
                    ) : null}

                    <div className="card">
                      <h3>{t('card.myplan.title', '📊 Mi Plan')}</h3>
                      <p>{t('card.myplan.desc', 'Consulta tu plan de alimentación personalizado')}</p>
                      <button className="btn-card" onClick={() => setCurrentView('myaccount')}>{t('card.myplan.button', 'Ver Plan')}</button>
                    </div>

                    <div className="card" onClick={() => setCurrentView('foodlog')}>
                      <h3>{t('card.foodlog.title', '🍔 Registro de Comidas')}</h3>
                      <p>{t('card.foodlog.desc', 'Registra lo que comiste hoy')}</p>
                      <button className="btn-card">{t('card.foodlog.button', 'Registrar Comida')}</button>
                    </div>

                    <div className="card" onClick={() => setCurrentView('progress')}>
                      <h3>{t('card.progress.title', '📈 Progreso')}</h3>
                      <p>{t('card.progress.desc', 'Visualiza tu evolución')}</p>
                      <button className="btn-card">{t('card.progress.button', 'Ver Estadísticas')}</button>
                    </div>

                    <div className="card" onClick={() => setCurrentView('equivalentes')}>
                      <h3>{t('card.equivalentes.title', '🔄 Equivalentes por Grupo')}</h3>
                      <p>{t('card.equivalentes.desc', 'Intercambia alimentos manteniendo macros')}</p>
                      <button className="btn-card">{t('card.equivalentes.button', 'Ver Equivalentes')}</button>
                    </div>

                    <div className="card">
                      <h3>{t('card.recipes.title', '📚 Recetas')}</h3>
                      <p>{t('card.recipes.desc', 'Explora recetas saludables')}</p>
                      <button className="btn-card" onClick={() => setCurrentView('recipes')}>{t('card.recipes.button', 'Ver Recetas')}</button>
                    </div>
                  </>
                )}

                {/* --- MODULE: TRAINING --- */}
                {selectedModule === 'training' && (
                  <>
                    <div className="card" onClick={() => setCurrentView('training')}>
                      <h3>🏋️ Módulo Entrenamiento IA</h3>
                      <p>Genera rutinas con lógica biomecánica y configuración CV en JSON.</p>
                      <button className="btn-card">Abrir Entrenamiento</button>
                    </div>

                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training']) && (
                      <div className="card" onClick={() => setCurrentView('admintraining')}>
                        <h3>📋 Maestro de Rutinas</h3>
                        <p>Crea y edita plantillas de entrenamiento, gestiona rutinas y recoge los datos del diario.</p>
                        <button className="btn-card">Abrir Maestro</button>
                      </div>
                    )}

                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training']) && (
                      <div className="card" onClick={() => setCurrentView('admingallery')}>
                        <h3>🎬 Galería de Entrenamientos</h3>
                        <p>Administra videos de YouTube por ejercicio para las rutinas y clases.</p>
                        <button className="btn-card">Abrir Galería</button>
                      </div>
                    )}
                  </>
                )}

                {/* --- MODULE: D28D --- */}
                {selectedModule === 'd28d' && (
                  <>
                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']) && (
                      <div className="card" onClick={() => setCurrentView('adminliveclasses')}>
                        <h3>🟢 Clases en Vivo y Reuniones</h3>
                        <p>Crea y gestiona los links de reuniones (Zoom) y plantillas para las sesiones en vivo.</p>
                        <button className="btn-card">Gestionar Clases</button>
                      </div>
                    )}

                    {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
                      <div className="card" onClick={() => setCurrentView('admingyms')}>
                        <h3>🏷️ Maestro Gym / Marca Blanca</h3>
                        <p>Crea gimnasios, colores, logo, slug y configúralos para que consuman el ecosistema D28D.</p>
                        <button className="btn-card">Abrir Maestro Gym</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* --- DASHBOARD: FOOD PLAN --- */}
            {selectedModule === 'food-plan' && (
              <section className="quick-stats">
                <h3>{t('home.summary.title', 'Resumen del Día')}</h3>
                <div className="stats-grid">
                  <div className="stat-box">
                    <label>{t('ai.calories', 'Calorías')}</label>
                    <p>{Math.round(dayTotals?.totalCalorias || 0)} / {plan.calorias} kcal</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalCalorias || 0) / plan.calorias) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="stat-box">
                    <label>{t('ai.protein', 'Proteína')}</label>
                    <p>{Math.round(dayTotals?.totalProteina || 0)} / {plan.proteina}g</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalProteina || 0) / plan.proteina) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="stat-box">
                    <label>{t('ai.carbs', 'Carbohidratos')}</label>
                    <p>{Math.round(dayTotals?.totalCarbohidratos || 0)} / {plan.carbohidratos}g</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalCarbohidratos || 0) / plan.carbohidratos) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="stat-box">
                    <label>{t('ai.fats', 'Grasas')}</label>
                    <p>{Math.round(dayTotals?.totalGrasas || 0)} / {plan.grasas}g</p>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalGrasas || 0) / plan.grasas) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* --- DASHBOARD: D28D --- */}
            {selectedModule === 'd28d' && (
              <section className="quick-stats">
                <h3>Resumen D28D</h3>
                <div className="stats-grid">
                  <div className="stat-box"><label>Plantillas Globales</label><p>--</p></div>
                  <div className="stat-box"><label>Clases Programadas</label><p>--</p></div>
                  <div className="stat-box"><label>Asistencia Promedio</label><p>--</p></div>
                  <div className="stat-box"><label>Videos en Galería</label><p>--</p></div>
                </div>
              </section>
            )}

            {/* --- DASHBOARD: ENTRENADORES --- */}
            {selectedModule === 'training' && (
              <section className="quick-stats">
                <h3>Resumen de Entrenadores</h3>
                <div className="stats-grid">
                  <div className="stat-box"><label>Entrenadores Activos</label><p>{adminOverview?.counts?.trainers || 0}</p></div>
                  <div className="stat-box"><label>Rutinas Asignadas</label><p>--</p></div>
                  <div className="stat-box"><label>Sesiones Completadas</label><p>--</p></div>
                  <div className="stat-box"><label>Alertas Pendientes</label><p>0</p></div>
                </div>
              </section>
            )}

            {/* --- DASHBOARD: MAESTRO GYM --- */}
            {selectedModule === 'gym' && hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio']) && adminOverview?.counts && (
              <section className="quick-stats">
                <h3>Resumen Maestro Gym</h3>
                <div className="stats-grid">
                  <div className="stat-box"><label>Gimnasios Registrados</label><p>{adminOverview.counts.gyms}</p></div>
                  <div className="stat-box"><label>Usuarios Activos</label><p>{adminOverview.counts.users}</p></div>
                  <div className="stat-box"><label>Planes de Suscripción</label><p>{adminOverview.counts.plans}</p></div>
                  <div className="stat-box"><label>Suscripciones Activas</label><p>{adminOverview.counts.activeSubscriptions}</p></div>
                </div>
              </section>
            )}
          </>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>🍽️ D28D GYM virtual</h1>
        </div>
        <div className="navbar-menu">
          <button
            onClick={() => { setCurrentView('home'); setSelectedModule(null); }}
            className={currentView === 'home' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.home', 'Inicio')}
          </button>

          {/* --- MENÚ FOOD PLAN --- */}
          {selectedModule === 'food-plan' && (
            <>
              <button onClick={() => setCurrentView('progress')} className={currentView === 'progress' ? 'nav-link active' : 'nav-link'}>
                {t('nav.progress', 'Progreso')}
              </button>
              <button onClick={() => setCurrentView('calculator')} className={currentView === 'calculator' ? 'nav-link active' : 'nav-link'}>
                {t('nav.calculator', 'Calculadora')}
              </button>
              <button onClick={() => setCurrentView('foodlog')} className={currentView === 'foodlog' ? 'nav-link active' : 'nav-link'}>
                {t('nav.foods', 'Alimentos')}
              </button>
              <button onClick={() => setCurrentView('equivalentes')} className={currentView === 'equivalentes' ? 'nav-link active' : 'nav-link'}>
                {t('nav.equivalentes', 'Equivalentes')}
              </button>
              <button onClick={() => setCurrentView('recipes')} className={currentView === 'recipes' ? 'nav-link active' : 'nav-link'}>
                {t('nav.recipes', 'Recetas')}
              </button>
              
              {hasAnyRole(['super_admin', 'admin_food_plan']) && (
                <button onClick={() => setCurrentView('foodsmanager')} className={currentView === 'foodsmanager' ? 'nav-link active' : 'nav-link'}>
                  {t('nav.foodsmanager', 'Maestro de Alimentos')}
                </button>
              )}
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista', 'admin_food_plan']) && (
                <button onClick={() => setCurrentView('admin')} className={currentView === 'admin' ? 'nav-link active' : 'nav-link'}>
                  {t('nav.admin', 'Admin')}
                </button>
              )}
            </>
          )}

          {/* --- MENÚ TRAINING --- */}
          {selectedModule === 'training' && (
            <>
              <button onClick={() => setCurrentView('training')} className={currentView === 'training' ? 'nav-link active' : 'nav-link'}>
                Entrenamiento IA
              </button>
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training']) && (
                <button onClick={() => setCurrentView('admintraining')} className={currentView === 'admintraining' ? 'nav-link active' : 'nav-link'}>
                  Maestro de Rutinas
                </button>
              )}
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training']) && (
                <button onClick={() => setCurrentView('admingallery')} className={currentView === 'admingallery' ? 'nav-link active' : 'nav-link'}>
                  Galería de Entrenamientos
                </button>
              )}
            </>
          )}

          {/* --- MENÚ D28D --- */}
          {selectedModule === 'd28d' && (
            <>
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']) && (
                <button onClick={() => setCurrentView('adminliveclasses')} className={currentView === 'adminliveclasses' ? 'nav-link active' : 'nav-link'}>
                  Clases en Vivo
                </button>
              )}
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
                <button onClick={() => setCurrentView('admingyms')} className={currentView === 'admingyms' ? 'nav-link active' : 'nav-link'}>
                  Maestro Gym
                </button>
              )}
              <button onClick={() => setCurrentView('liveclasses')} className={currentView === 'liveclasses' ? 'nav-link active' : 'nav-link'}>
                Clases Públicas
              </button>
            </>
          )}

          {/* --- MENÚ GYM --- */}
          {selectedModule === 'gym' && (
            <>
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio']) && (
                <button onClick={() => setCurrentView('admingyms')} className={currentView === 'admingyms' ? 'nav-link active' : 'nav-link'}>
                  Maestro Gym
                </button>
              )}
              {hasAnyRole(['super_admin']) && (
                <button onClick={() => setCurrentView('admincompanies')} className={currentView === 'admincompanies' ? 'nav-link active' : 'nav-link'}>
                  {t('nav.companies', 'Empresas')}
                </button>
              )}
              {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio']) && (
                <button onClick={() => setCurrentView('adminusers')} className={currentView === 'adminusers' ? 'nav-link active' : 'nav-link'}>
                  {t('nav.users', 'Usuarios')}
                </button>
              )}
              {hasAnyRole(['super_admin']) && (
                <button onClick={() => setCurrentView('adminplans')} className={currentView === 'adminplans' ? 'nav-link active' : 'nav-link'}>
                  {t('nav.plans', 'Planes')}
                </button>
              )}
              {hasAnyRole(['super_admin']) && (
                <button onClick={() => setCurrentView('ecosystem')} className={currentView === 'ecosystem' ? 'nav-link active' : 'nav-link'}>
                  Ecosistema
                </button>
              )}
            </>
          )}

          {/* --- MI CUENTA (Siempre visible si no es super_admin, o según preferencia) --- */}
          {!hasAnyRole(['super_admin']) && (
            <button onClick={() => setCurrentView('myaccount')} className={currentView === 'myaccount' ? 'nav-link active' : 'nav-link'}>
              {t('nav.myaccount', 'Mi Cuenta')}
            </button>
          )}
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
          <button onClick={logout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {renderContent()}
      </div>
      <div className="fixed bottom-4 right-4 z-40">
        {!chatOpen && (
          <button
            className="rounded-full bg-lime-500 text-black shadow-lg px-4 py-3"
            onClick={() => setChatOpen(true)}
          >
            Health‑Bot
          </button>
        )}
      </div>
      {chatOpen && (
        <div onClick={() => setChatOpen(false)} className="fixed inset-0 pointer-events-none"></div>
      )}
      {chatOpen && <NutritionChat />}
    </div>
  );
}
