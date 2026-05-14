// Hero de inicio. Muestra los SERVICIOS que el usuario tiene activos
// (uno o varios). NO es un selector técnico de módulos: es la entrada
// natural a las cosas del usuario, con su brand arriba.
//
// Para usuario final: cada card lleva a su experiencia de consumo
//   (Mi Plan, Mi Entrenamiento, Mis Clases, Mi gimnasio).
// Para admin/coach: cada card lleva al maestro independiente del servicio.

export default function ServicesHero({ user, services, brandName, onPickService }) {
  const greetName = user?.nombre ? user.nombre.split(' ')[0] : null;
  const greeting = greetName ? `Hola, ${greetName}` : 'Hola';

  if (!services || services.length === 0) {
    return (
      <div className="dashboard-main-view">
        <header className="dashboard-header">
          <h2>{greeting}</h2>
          <p style={{ color: '#475569' }}>
            Aún no tienes servicios activos en {brandName || 'tu plataforma'}.
            Contacta a tu coach o al equipo de tu gimnasio para activarlos.
          </p>
        </header>
      </div>
    );
  }

  // Si solo tiene un servicio, simplificamos: un solo banner grande,
  // sin la sensación de "elige una de varias opciones".
  const single = services.length === 1;

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header">
        <h2>{greeting}</h2>
        <p style={{ color: '#475569' }}>
          {single
            ? `Bienvenido a ${brandName}. Aquí tienes tu espacio.`
            : `Bienvenido a ${brandName}. Estos son tus servicios.`}
        </p>
      </header>

      <div className="services-hero">
        {!single && (
          <>
            <h2 className="services-hero-title">TUS <span>SERVICIOS</span></h2>
            <p className="services-hero-subtitle">Entra al servicio que quieras revisar hoy.</p>
          </>
        )}

        <div
          className="services-hero-grid"
          style={single ? { gridTemplateColumns: '1fr', maxWidth: 720, margin: '0 auto' } : undefined}
        >
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              className="service-card-hero"
              onClick={() => onPickService(s)}
              style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
              aria-label={`Abrir ${s.title}`}
            >
              <img src={s.img} alt={s.alt} className="service-card-hero-img" />
              <div className="service-card-hero-content">
                <h3 className="service-card-hero-title">{s.title}</h3>
                <p className="service-card-hero-desc">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
