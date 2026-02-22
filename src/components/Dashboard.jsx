import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Calculator from './Calculator';
import AdminCalculator from './AdminCalculator';
import FoodLog from './FoodLog';
import AdminFoodsManager from './AdminFoodsManager';
import AdminUsers from './AdminUsers';
import AdminPlans from './AdminPlans';
import MyAccount from './MyAccount';

const STORAGE_VIEW_KEY = 'foodplan_dashboard_view';

function getStoredView() {
  try {
    const v = sessionStorage.getItem(STORAGE_VIEW_KEY);
    if (v && ['home', 'calculator', 'foodlog', 'myaccount', 'admin', 'adminusers', 'adminplans', 'foodsmanager'].includes(v)) return v;
  } catch (_) {}
  return 'home';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState(getStoredView);

  const setView = (view) => {
    setCurrentView(view);
    try {
      sessionStorage.setItem(STORAGE_VIEW_KEY, view);
    } catch (_) {}
  };
  const [dayTotals, setDayTotals] = useState(null);
  const [plan, setPlan] = useState({ calorias: 2000, proteina: 150, carbohidratos: 250, grasas: 65 });
  const today = new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const resp = await (await import('../services/api')).default.get('/food-log/totals', { params: { fecha: today } });
        setDayTotals(resp.data.data);
      } catch (e) {
        // noop
      }
    };
    fetchTotals();
  }, []);

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
      case 'myaccount':
        return <MyAccount />;
      default:
        return (
          <>
            <header className="dashboard-header">
              <h2>Bienvenido, {user?.nombre}!</h2>
              <p>Rol: <strong>{user?.rol}</strong></p>
            </header>

            <div className="dashboard-grid">
              <div className="card" onClick={() => setView('calculator')}>
                <h3>🧮 Calculadora Nutricional</h3>
                <p>Calcula tu plan personalizado basado en tus datos</p>
                <button className="btn-card">Ir a Calculadora</button>
              </div>

              {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
                <div className="card" onClick={() => setView('admin')}>
                  <h3>⚙️ Administración</h3>
                  <p>Gestiona los conceptos de la calculadora</p>
                  <button className="btn-card">Panel Admin</button>
                </div>
              ) : null}

              {(user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio') && (
                <div className="card" onClick={() => setView('adminusers')}>
                  <h3>👥 Usuarios y Roles</h3>
                  <p>Consulta y ajusta los roles de usuarios</p>
                  <button className="btn-card">Abrir Usuarios</button>
                </div>
              )}
              {user?.rol === 'super_admin' && (
                <div className="card" onClick={() => setView('adminplans')}>
                  <h3>🧾 Planes de Suscripción</h3>
                  <p>Crea, edita y elimina planes</p>
                  <button className="btn-card">Gestionar Planes</button>
                </div>
              )}

              <div className="card">
                <h3>📊 Mi Plan</h3>
                <p>Consulta tu plan de alimentación personalizado</p>
                <button className="btn-card" onClick={() => setView('myaccount')}>Ver Plan</button>
              </div>

              <div className="card" onClick={() => setView('foodlog')}>
                <h3>🍔 Registro de Comidas</h3>
                <p>Registra lo que comiste hoy</p>
                <button className="btn-card">Registrar Comida</button>
              </div>

              <div className="card">
                <h3>📈 Progreso</h3>
                <p>Visualiza tu evolución</p>
                <button className="btn-card">Ver Estadísticas</button>
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
            onClick={() => setView('home')}
            className={currentView === 'home' ? 'nav-link active' : 'nav-link'}
          >
            Inicio
          </button>
          <button 
            onClick={() => setView('calculator')}
            className={currentView === 'calculator' ? 'nav-link active' : 'nav-link'}
          >
            Calculadora
          </button>
          <button 
            onClick={() => setView('foodlog')}
            className={currentView === 'foodlog' ? 'nav-link active' : 'nav-link'}
          >
            Alimentos
          </button>
          <button 
            onClick={() => setView('myaccount')}
            className={currentView === 'myaccount' ? 'nav-link active' : 'nav-link'}
          >
            Mi Cuenta
          </button>
          {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
            <>
              <button 
                onClick={() => setView('foodsmanager')}
                className={currentView === 'foodsmanager' ? 'nav-link active' : 'nav-link'}
              >
                Maestro de Alimentos
              </button>
              <button 
                onClick={() => setView('adminplans')}
                className={currentView === 'adminplans' ? 'nav-link active' : 'nav-link'}
              >
                Planes
              </button>
              <button 
                onClick={() => setView('adminusers')}
                className={currentView === 'adminusers' ? 'nav-link active' : 'nav-link'}
              >
                Usuarios
              </button>
              <button 
                onClick={() => setView('admin')}
                className={currentView === 'admin' ? 'nav-link active' : 'nav-link'}
              >
                Admin
              </button>
            </>
          ) : null}
        </div>
        <div className="navbar-user">
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
