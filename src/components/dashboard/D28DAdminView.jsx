// Maestro independiente de D28D.
// Aquí viven los 3 programas (Vital, Pancitas, Virtual) con sus fotos y los
// maestros operativos: clases en vivo, ciclos de programa y galería de videos.
const PROGRAMS = [
  {
    id: 'vital',
    name: 'Vital D28D',
    desc: 'Bienestar integral y salud femenina.',
    img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80',
    accent: '#ec4899',
  },
  {
    id: 'pancitas',
    name: 'Pancitas Fit',
    desc: 'Entrenamiento especializado para embarazo.',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    accent: '#8b5cf6',
  },
  {
    id: 'virtual_d28d',
    name: 'Virtual D28D',
    desc: 'El programa clásico de transformación en 28 días.',
    img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    accent: '#10b981',
  },
];

export default function D28DAdminView({ hasAnyRole, onNavigate, onPickProgram, onBack }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h2>Maestro D28D</h2>
          <p style={{ color: '#475569' }}>Programas, clases en vivo y galería de videos.</p>
        </div>
        <button className="btn-secondary" onClick={onBack} aria-label="Volver a Servicios">
          ← Servicios
        </button>
      </header>

      <h3 style={{ margin: '1rem 0 0.5rem' }}>Programas activos</h3>
      <div className="services-hero-grid">
        {PROGRAMS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="service-card-hero"
            onClick={() => onPickProgram(p.id)}
            style={{
              textAlign: 'left',
              border: `2px solid ${p.accent}33`,
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 16,
            }}
          >
            <img src={p.img} alt={p.name} className="service-card-hero-img" />
            <div className="service-card-hero-content">
              <h3 className="service-card-hero-title" style={{ color: p.accent }}>{p.name}</h3>
              <p className="service-card-hero-desc">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <h3 style={{ margin: '1.5rem 0 0.5rem' }}>Operación</h3>
      <div className="dashboard-grid">
        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']) && (
          <div className="card" onClick={() => onNavigate('adminliveclasses')}>
            <h3>Clases en vivo y reuniones</h3>
            <p>Crea y gestiona enlaces (Zoom) y plantillas de las sesiones.</p>
            <button className="btn-card">Gestionar</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_d28d']) && (
          <div className="card" onClick={() => onNavigate('programs')}>
            <h3>Maestro de programas</h3>
            <p>Ciclos y configuración de los 3 programas principales.</p>
            <button className="btn-card">Administrar</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training', 'admin_entrenador']) && (
          <div className="card" onClick={() => onNavigate('admingallery')}>
            <h3>Galería de videos</h3>
            <p>Videos por ejercicio para rutinas y clases.</p>
            <button className="btn-card">Abrir galería</button>
          </div>
        )}
      </div>
    </div>
  );
}
