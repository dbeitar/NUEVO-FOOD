import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Calculator from './Calculator';
import AdminCalculator from './AdminCalculator';
import FoodLog from './FoodLog';
import AdminFoodsManager from './AdminFoodsManager';
import AdminUsers from './AdminUsers';
import AdminPlans from './AdminPlans';
import AdminCompanies from './AdminCompanies';
import MyAccount from './MyAccount';
import Progress from './Progress';
import Equivalentes from './Equivalentes';
import { useI18n } from '../context/I18nContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    try {
      const flag = localStorage.getItem('afterRegisterHome');
      return flag ? 'home' : 'progress';
    } catch {
      return 'progress';
    }
  });
  const [dayTotals, setDayTotals] = useState(null);
  const plan = { calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 };
  const today = new Date().toISOString().split('T')[0];
  const { t, lang, setLang } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/calculator') setCurrentView('calculator');
    else if (path === '/food-log') setCurrentView('foodlog');
    else if (path === '/my-account') setCurrentView('myaccount');
    else if (path === '/admin') setCurrentView('admin');
    else if (path === '/admin-users') setCurrentView('adminusers');
    else if (path === '/admin-plans') setCurrentView('adminplans');
    else if (path === '/admin-companies') setCurrentView('admincompanies');
    else if (path === '/foods-manager') setCurrentView('foodsmanager');
    else if (path === '/equivalentes') setCurrentView('equivalentes');
    else if (path === '/') setCurrentView('progress');
  }, [location.pathname]);
  
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
        const resp = await (await import('../services/api')).default.get('/food-log/totals', { params: { fecha: today } });
        setDayTotals(resp.data.data);
      } catch (err) {
        console.warn('Failed to fetch day totals', err);
      }
    };
    fetchTotals();
  }, [today]);

  const renderContent = () => {
    switch (currentView) {
      case 'calculator':
        return <Calculator />;
      case 'admin':
        return <AdminCalculator />;
      case 'foodlog':
        return <FoodLog />;
      case 'foodsmanager':
        return <AdminFoodsManager />;
      case 'adminusers':
        return <AdminUsers />;
      case 'adminplans':
        return <AdminPlans />;
      case 'admincompanies':
        return <AdminCompanies />;
      case 'myaccount':
        return <MyAccount />;
      case 'progress':
        return <Progress />;
      case 'equivalentes':
        return <Equivalentes />;
      default:
        return (
          <>
            <header className="dashboard-header">
              <h2>{t('welcome.title', 'Bienvenido, {name}!').replace('{name}', user?.nombre || '')}</h2>
              <p>{t('welcome.role', 'Rol')}: <strong>{user?.rol}</strong></p>
            </header>

            <div className="dashboard-grid">
              {user?.rol === 'super_admin' && (
                <div className="card" onClick={() => setCurrentView('admincompanies')}>
                  <h3>{t('card.companies.title', '🏢 Empresas')}</h3>
                  <p>{t('card.companies.desc', 'Consulta gimnasios, entrenadores y usuarios asociados')}</p>
                  <button className="btn-card">{t('card.companies.button', 'Abrir Empresas')}</button>
                </div>
              )}
              <div className="card" onClick={() => setCurrentView('calculator')}>
                <h3>{t('card.calculator.title', '🧮 Calculadora Nutricional')}</h3>
                <p>{t('card.calculator.desc', 'Calcula tu plan personalizado basado en tus datos')}</p>
                <button className="btn-card">{t('card.calculator.button', 'Ir a Calculadora')}</button>
              </div>

              {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
                <div className="card" onClick={() => setCurrentView('admin')}>
                  <h3>{t('card.admin.title', '⚙️ Administración')}</h3>
                  <p>{t('card.admin.desc', 'Gestiona los conceptos de la calculadora')}</p>
                  <button className="btn-card">{t('card.admin.button', 'Panel Admin')}</button>
                </div>
              ) : null}

              {(user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio') && (
                <div className="card" onClick={() => setCurrentView('adminusers')}>
                  <h3>{t('card.users.title', '👥 Usuarios y Roles')}</h3>
                  <p>{t('card.users.desc', 'Consulta y ajusta los roles de usuarios')}</p>
                  <button className="btn-card">{t('card.users.button', 'Abrir Usuarios')}</button>
                </div>
              )}
              {user?.rol === 'super_admin' && (
                <div className="card" onClick={() => setCurrentView('adminplans')}>
                  <h3>{t('card.plans.title', '🧾 Planes de Suscripción')}</h3>
                  <p>{t('card.plans.desc', 'Crea, edita y elimina planes')}</p>
                  <button className="btn-card">{t('card.plans.button', 'Gestionar Planes')}</button>
                </div>
              )}

              <div className="card">
                <h3>📊 Mi Plan</h3>
                <p>Consulta tu plan de alimentación personalizado</p>
                <button className="btn-card" onClick={() => setCurrentView('myaccount')}>Ver Plan</button>
              </div>

              <div className="card" onClick={() => setCurrentView('foodlog')}>
                <h3>🍔 Registro de Comidas</h3>
                <p>Registra lo que comiste hoy</p>
                <button className="btn-card">Registrar Comida</button>
              </div>

              <div className="card" onClick={() => setCurrentView('progress')}>
                <h3>📈 Progreso</h3>
                <p>Visualiza tu evolución</p>
                <button className="btn-card">Ver Estadísticas</button>
              </div>

              <div className="card" onClick={() => setCurrentView('equivalentes')}>
                <h3>🔄 Equivalentes por Grupo</h3>
                <p>Intercambia alimentos manteniendo macros</p>
                <button className="btn-card">Ver Equivalentes</button>
              </div>

              <div className="card">
                <h3>📚 Recetas</h3>
                <p>Explora recetas saludables</p>
                <button className="btn-card">Ver Recetas</button>
              </div>
            </div>

            <section className="quick-stats">
              <h3>Resumen del Día</h3>
              <div className="stats-grid">
                <div className="stat-box">
                  <label>Calorías</label>
                  <p>{Math.round(dayTotals?.totalCalorias || 0)} / {plan.calorias} kcal</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalCalorias || 0) / plan.calorias) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Proteína</label>
                  <p>{Math.round(dayTotals?.totalProteina || 0)} / {plan.proteina}g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalProteina || 0) / plan.proteina) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Carbohidratos</label>
                  <p>{Math.round(dayTotals?.totalCarbohidratos || 0)} / {plan.carbohidratos}g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalCarbohidratos || 0) / plan.carbohidratos) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Grasas</label>
                  <p>{Math.round(dayTotals?.totalGrasas || 0)} / {plan.grasas}g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(((dayTotals?.totalGrasas || 0) / plan.grasas) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>🍽️ Food Plan</h1>
        </div>
        <div className="navbar-menu">
          <button 
            onClick={() => setCurrentView('progress')}
            className={currentView === 'progress' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.progress', 'Progreso')}
          </button>
          <button 
            onClick={() => setCurrentView('home')}
            className={currentView === 'home' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.home', 'Inicio')}
          </button>
          <button 
            onClick={() => setCurrentView('calculator')}
            className={currentView === 'calculator' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.calculator', 'Calculadora')}
          </button>
          <button 
            onClick={() => setCurrentView('foodlog')}
            className={currentView === 'foodlog' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.foods', 'Alimentos')}
          </button>
          <button 
            onClick={() => setCurrentView('equivalentes')}
            className={currentView === 'equivalentes' ? 'nav-link active' : 'nav-link'}
          >
            {t('nav.equivalentes', 'Equivalentes')}
          </button>
          {user?.rol === 'super_admin' && (
            <button 
              onClick={() => setCurrentView('admincompanies')}
              className={currentView === 'admincompanies' ? 'nav-link active' : 'nav-link'}
            >
              {t('nav.companies', 'Empresas')}
            </button>
          )}
          {user?.rol !== 'super_admin' && (
            <button 
              onClick={() => setCurrentView('myaccount')}
              className={currentView === 'myaccount' ? 'nav-link active' : 'nav-link'}
            >
              {t('nav.myaccount', 'Mi Cuenta')}
            </button>
          )}
          {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
            <>
              <button 
                onClick={() => setCurrentView('foodsmanager')}
                className={currentView === 'foodsmanager' ? 'nav-link active' : 'nav-link'}
              >
                {t('nav.foodsmanager', 'Maestro de Alimentos')}
              </button>
              <button 
                onClick={() => setCurrentView('adminplans')}
                className={currentView === 'adminplans' ? 'nav-link active' : 'nav-link'}
              >
                {t('nav.plans', 'Planes')}
              </button>
              <button 
                onClick={() => setCurrentView('adminusers')}
                className={currentView === 'adminusers' ? 'nav-link active' : 'nav-link'}
              >
                {t('nav.users', 'Usuarios')}
              </button>
              <button 
                onClick={() => setCurrentView('admin')}
                className={currentView === 'admin' ? 'nav-link active' : 'nav-link'}
              >
                {t('nav.admin', 'Admin')}
              </button>
            </>
          ) : null}
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
    </div>
  );
}
