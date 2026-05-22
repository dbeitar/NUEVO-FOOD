import { resolveMediaUrl } from '../../utils/mediaUrl';
import { useI18n } from '../../context/useI18n';

export default function ServicesHero({ user, services, brandName, onPickService }) {
  const { t, lang } = useI18n();
  const greetName = user?.nombre ? user.nombre.split(' ')[0] : null;
  const greeting = greetName
    ? t('services.greeting', 'Hola, {name}', { name: greetName })
    : t('services.greeting_short', 'Hola');
  const brand = brandName || 'D28D';

  if (!services || services.length === 0) {
    return (
      <div className="dashboard-main-view">
        <header className="dashboard-header">
          <h2>{greeting}</h2>
          <p className="d28d-text-muted">
            {t('services.no_services', 'Aún no tienes servicios activos.', { brand })}
          </p>
        </header>
      </div>
    );
  }

  const single = services.length === 1;
  const titleParts = single
    ? t('services.title_single', 'TU ESPACIO').split(' ')
    : t('services.title_multi', 'TUS SERVICIOS').split(' ');

  return (
    <div className="dashboard-main-view">
      <div className="services-hero">
        <p className="services-hero-subtitle" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem' }}>
          {greeting}
        </p>
        <h2 className="services-hero-title">
          {titleParts[0]}{' '}
          <span>{titleParts.slice(1).join(' ') || (single ? 'ESPACIO' : 'SERVICIOS')}</span>
        </h2>
        <p className="services-hero-subtitle">
          {single
            ? t('services.welcome_single', 'Bienvenido a {brand}.', { brand })
            : t('services.welcome_multi', 'Bienvenido a {brand}.', { brand })}
        </p>

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
              aria-label={t('services.open_aria', 'Abrir {title}', { title: s.title })}
            >
              <img src={resolveMediaUrl(s.img)} alt={s.alt} className="service-card-hero-img" />
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
