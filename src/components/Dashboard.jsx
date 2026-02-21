import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Calculator from './Calculator';
import AdminCalculator from './AdminCalculator';
import FoodLog from './FoodLog';
import AdminFoodsManager from './AdminFoodsManager';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('home');

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
      default:
        return (
          <>
            <header className="dashboard-header">
              <h2>Bienvenido, {user?.nombre}!</h2>
              <p>Rol: <strong>{user?.rol}</strong></p>
            </header>

            <div className="dashboard-grid">
              <div className="card" onClick={() => setCurrentView('calculator')}>
                <h3>🧮 Calculadora Nutricional</h3>
                <p>Calcula tu plan personalizado basado en tus datos</p>
                <button className="btn-card">Ir a Calculadora</button>
              </div>

              {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
                <div className="card" onClick={() => setCurrentView('admin')}>
                  <h3>⚙️ Administración</h3>
                  <p>Gestiona los conceptos de la calculadora</p>
                  <button className="btn-card">Panel Admin</button>
                </div>
              ) : null}

              <div className="card">
                <h3>📊 Mi Plan</h3>
                <p>Consulta tu plan de alimentación personalizado</p>
                <button className="btn-card">Ver Plan</button>
              </div>

              <div className="card" onClick={() => setCurrentView('foodlog')}>
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
                  <p>0 / 2500 kcal</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Proteína</label>
                  <p>0 / 150g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Carbohidratos</label>
                  <p>0 / 300g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div className="stat-box">
                  <label>Grasas</label>
                  <p>0 / 80g</p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
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
            onClick={() => setCurrentView('home')}
            className={currentView === 'home' ? 'nav-link active' : 'nav-link'}
          >
            Inicio
          </button>
          <button 
            onClick={() => setCurrentView('calculator')}
            className={currentView === 'calculator' ? 'nav-link active' : 'nav-link'}
          >
            Calculadora
          </button>
          <button 
            onClick={() => setCurrentView('foodlog')}
            className={currentView === 'foodlog' ? 'nav-link active' : 'nav-link'}
          >
            Alimentos
          </button>
          {user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio' ? (
            <>
              <button 
                onClick={() => setCurrentView('foodsmanager')}
                className={currentView === 'foodsmanager' ? 'nav-link active' : 'nav-link'}
              >
                Maestro de Alimentos
              </button>
              <button 
                onClick={() => setCurrentView('admin')}
                className={currentView === 'admin' ? 'nav-link active' : 'nav-link'}
              >
                Panel de Control
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
