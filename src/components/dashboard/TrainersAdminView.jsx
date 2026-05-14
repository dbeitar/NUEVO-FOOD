// Vista de administración del módulo de ENTRENADORES.
// Foco operativo: rutinas, asignación a usuarios y galería de videos.

export default function TrainersAdminView({ hasAnyRole, onNavigate, onBack }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h2>Entrenadores</h2>
          <p style={{ color: '#475569' }}>Rutinas, asignación a usuarios y seguimiento.</p>
        </div>
        <button className="btn-secondary" onClick={onBack} aria-label="Volver a Servicios">
          ← Servicios
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="card" onClick={() => onNavigate('training')}>
          <h3>Mi entrenamiento</h3>
          <p>Vista de la rutina del día con sustituciones asistidas.</p>
          <button className="btn-card">Abrir</button>
        </div>

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training', 'admin_entrenador']) && (
          <div className="card" onClick={() => onNavigate('admintraining')}>
            <h3>Rutinas</h3>
            <p>Plantillas, asignaciones y diario de entrenamiento.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training', 'admin_entrenador']) && (
          <div className="card" onClick={() => onNavigate('admingallery')}>
            <h3>Galería de videos</h3>
            <p>Videos por ejercicio (referencia visual).</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']) && (
          <div className="card" onClick={() => onNavigate('adminusers')}>
            <h3>Usuarios asignados</h3>
            <p>Listado de personas y sus rutinas asignadas.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']) && (
          <div className="card" onClick={() => onNavigate('progress')}>
            <h3>Seguimiento</h3>
            <p>Adherencia y avance de tus usuarios.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}
      </div>
    </div>
  );
}
