// Hub central de MAESTROS del sistema. Solo lo ve super_admin desde
// el menú superior. Es un atajo para entrar al maestro de cada uno de
// los tres servicios del ecosistema (D28D, Plan de Alimentación,
// Entrenadores). No duplica funcionalidad: cada card abre el panel
// correspondiente (D28DAdminView / FoodPlanAdminView / TrainersAdminView)
// con todas sus secciones internas.

const MASTERS = [
  {
    id: 'd28d',
    title: 'D28D',
    desc: 'Programas (Vital, Pancitas, Virtual), clases en vivo, galería y gimnasios marca blanca.',
    img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    alt: 'Programas D28D',
  },
  {
    id: 'food-plan',
    title: 'Plan de Alimentación',
    desc: 'Calculadora, catálogo de alimentos, recetas, equivalentes y planes nutricionales.',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    alt: 'Plan de alimentación',
  },
  {
    id: 'training',
    title: 'Entrenadores',
    desc: 'Entrenadores, rutinas, galería de videos y asignación de usuarios.',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    alt: 'Entrenadores y rutinas',
  },
];

export default function MastersHub({ onOpenMaster }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header">
        <h2>Maestros del sistema</h2>
        <p style={{ color: '#475569' }}>
          Administra los catálogos y contenidos de los tres servicios del ecosistema.
        </p>
      </header>

      <div className="services-hero">
        <div className="services-hero-grid">
          {MASTERS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="service-card-hero"
              onClick={() => onOpenMaster(m.id)}
              style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
              aria-label={`Abrir maestro ${m.title}`}
            >
              <img src={m.img} alt={m.alt} className="service-card-hero-img" />
              <div className="service-card-hero-content">
                <h3 className="service-card-hero-title">{m.title}</h3>
                <p className="service-card-hero-desc">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
