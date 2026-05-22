import { useMemo } from 'react';
import { useFrontendConfig } from '../../context/FrontendConfigContext';
import { useI18n } from '../../context/useI18n';
import { getMastersFromConfig } from '../../utils/frontendConfigMerge';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const MASTERS_DEFAULT = [
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
  {
    id: 'd28d-routines',
    title: 'Rutinas D28D',
    desc: 'Maestro de rutinas para clases en vivo: bloques, ejercicios, versiones e importación.',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    alt: 'Maestro de rutinas D28D',
  },
];

export default function MastersHub({ onOpenMaster, hasAnyRole }) {
  const { config } = useFrontendConfig();
  const { t, lang } = useI18n();
  const masters = useMemo(
    () => getMastersFromConfig(config, MASTERS_DEFAULT, lang),
    [config, lang],
  );
  const titleParts = t('masters.title', 'MAESTROS DEL SISTEMA').split(' ');

  return (
    <div className="dashboard-main-view">
      <div className="services-hero">
        <h2 className="services-hero-title">
          {titleParts[0]}{' '}
          <span>{titleParts.slice(1).join(' ') || 'DEL SISTEMA'}</span>
        </h2>
        <p className="services-hero-subtitle">
          {t('masters.subtitle', 'Administra los catálogos y contenidos de los tres servicios del ecosistema.')}
        </p>

        <div className="services-hero-grid">
          {masters.map((m) => {
            if (m.id === 'd28d-routines' && hasAnyRole && !hasAnyRole(['super_admin', 'admin_d28d'])) {
              return null;
            }
            return (
            <button
              key={m.id}
              type="button"
              className="service-card-hero"
              onClick={() => onOpenMaster(m.id)}
              style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
              aria-label={t('masters.open_aria', 'Abrir maestro {title}', { title: m.title })}
            >
              <img src={resolveMediaUrl(m.img)} alt={m.alt} className="service-card-hero-img" />
              <div className="service-card-hero-content">
                <h3 className="service-card-hero-title">{m.title}</h3>
                <p className="service-card-hero-desc">{m.desc}</p>
              </div>
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
