export default function SuperAdminHome({ roles, adminOverview, onNavigate }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header">
        <h2>Panel general</h2>
        <p style={{ color: '#475569' }}>
          Roles: {roles.map((r) => (
            <span
              key={r}
              className="inline-block px-2 py-0.5 bg-lime-500/20 text-lime-600 rounded text-xs font-semibold uppercase tracking-wider mr-1"
            >
              {String(r).replace(/_/g, ' ')}
            </span>
          ))}
        </p>
      </header>
      <div className="dashboard-grid">
        <div className="card" onClick={() => onNavigate('admingyms')}>
          <h3>Centros y marcas</h3>
          <p>Gimnasios, marca blanca, branding.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('adminusers')}>
          <h3>Usuarios y roles</h3>
          <p>Gestión de cuentas y permisos.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('admintraining')}>
          <h3>Plantillas de rutinas</h3>
          <p>Maestro de entrenamiento.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('admingallery')}>
          <h3>Galería de videos</h3>
          <p>Videos de referencia por ejercicio.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('adminliveclasses')}>
          <h3>Clases en vivo</h3>
          <p>Agenda y enlaces Zoom.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('programs')}>
          <h3>Programas D28D</h3>
          <p>Vital, Pancitas, Virtual D28D.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('adminplans')}>
          <h3>Planes de suscripción</h3>
          <p>Configura los planes comerciales.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('audit')}>
          <h3>Auditoría</h3>
          <p>Eventos del sistema.</p>
          <button className="btn-card">Abrir</button>
        </div>
      </div>
      {adminOverview?.counts && (
        <section className="quick-stats" style={{ marginTop: '1rem' }}>
          <h3>Resumen general</h3>
          <div className="stats-grid">
            <div className="stat-box"><label>Gimnasios</label><p>{adminOverview.counts.gyms}</p></div>
            <div className="stat-box"><label>Usuarios</label><p>{adminOverview.counts.users}</p></div>
            <div className="stat-box"><label>Entrenadores</label><p>{adminOverview.counts.trainers}</p></div>
            <div className="stat-box"><label>Suscripciones activas</label><p>{adminOverview.counts.activeSubscriptions}</p></div>
          </div>
        </section>
      )}
    </div>
  );
}
