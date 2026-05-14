// Maestro independiente de GYM (marca blanca).
// Branding, gimnasios, usuarios del centro y métricas básicas.

export default function GymAdminView({ brandName, adminOverview, hasAnyRole, onNavigate, onBack }) {
  const showBack = typeof onBack === 'function';
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h2>Maestro Gym{brandName ? ` · ${brandName}` : ''}</h2>
          <p style={{ color: '#475569' }}>Tu centro: marca, equipo, usuarios y métricas básicas.</p>
        </div>
        {showBack && (
          <button className="btn-secondary" onClick={onBack} aria-label="Volver a Servicios">
            ← Servicios
          </button>
        )}
      </header>

      <div className="dashboard-grid">
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']) && (
          <div className="card" onClick={() => onNavigate('admingyms')}>
            <h3>Mi marca y branding</h3>
            <p>Logo, nombre, colores y mensaje de bienvenida.</p>
            <button className="btn-card">Editar marca</button>
          </div>
        )}
        <div className="card" onClick={() => onNavigate('adminusers')}>
          <h3>Usuarios</h3>
          <p>Personas inscritas en tu centro.</p>
          <button className="btn-card">Ver usuarios</button>
        </div>
        {hasAnyRole(['super_admin']) && (
          <div className="card" onClick={() => onNavigate('admincompanies')}>
            <h3>Empresas / clientes B2B</h3>
            <p>Cuentas corporativas y convenios.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}
        {hasAnyRole(['super_admin']) && (
          <div className="card" onClick={() => onNavigate('adminplans')}>
            <h3>Planes de suscripción</h3>
            <p>Configura los planes comerciales.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}
      </div>
      {adminOverview?.counts && (
        <section className="quick-stats" style={{ marginTop: '1rem' }}>
          <h3>Métricas básicas</h3>
          <div className="stats-grid">
            <div className="stat-box"><label>Gimnasios</label><p>{adminOverview.counts.gyms}</p></div>
            <div className="stat-box"><label>Usuarios</label><p>{adminOverview.counts.users}</p></div>
            <div className="stat-box"><label>Planes</label><p>{adminOverview.counts.plans}</p></div>
            <div className="stat-box"><label>Suscripciones activas</label><p>{adminOverview.counts.activeSubscriptions}</p></div>
          </div>
        </section>
      )}
    </div>
  );
}
