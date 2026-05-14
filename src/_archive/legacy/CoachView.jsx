export default function CoachView({ onNavigate }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header">
        <h2>Panel del coach</h2>
        <p style={{ color: '#475569' }}>Tus usuarios, su adherencia y comunicación rápida.</p>
      </header>
      <div className="dashboard-grid">
        <div className="card" onClick={() => onNavigate('adminusers')}>
          <h3>Mis usuarios</h3>
          <p>Asigna planes, edita rutinas, revisa adherencia.</p>
          <button className="btn-card">Ver usuarios</button>
        </div>
        <div className="card" onClick={() => onNavigate('admintraining')}>
          <h3>Mis rutinas</h3>
          <p>Plantillas y rutinas asignadas a tus clientes.</p>
          <button className="btn-card">Abrir rutinas</button>
        </div>
        <div className="card" onClick={() => onNavigate('admin')}>
          <h3>Configurar planes nutricionales</h3>
          <p>Define o ajusta el plan de cada usuario.</p>
          <button className="btn-card">Abrir</button>
        </div>
        <div className="card" onClick={() => onNavigate('progress')}>
          <h3>Seguimiento</h3>
          <p>Métricas básicas por usuario y por semana.</p>
          <button className="btn-card">Ver seguimiento</button>
        </div>
      </div>
    </div>
  );
}
