import { useMemo } from 'react';
import { useFrontendConfig } from '../../context/FrontendConfigContext';
import { useI18n } from '../../context/useI18n';
import { getMastersFromConfig } from '../../utils/frontendConfigMerge';
import { resolveMediaUrl } from '../../utils/mediaUrl';

/** Maestros raíz — modelo comercial v2 (operación vs oferta vs configuración). */
const MASTERS_DEFAULT = [
  {
    id: 'd28d',
    title: 'D28D',
    desc: 'Operación: programas, ciclos, clases, galería, gimnasios. Zoom se configura en cada programa.',
    img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    alt: 'D28D operación',
  },
  {
    id: 'food-plan',
    title: 'Plan de Alimentación',
    desc: 'Catálogo, recetas y módulo nutricional (sin cambiar lógica del módulo Food).',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    alt: 'Plan de alimentación',
  },
  {
    id: 'training',
    title: 'Entrenadores',
    desc: 'Coaches, rutinas, galería y asignación de atletas.',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    alt: 'Entrenadores',
  },
  {
    id: 'commercial-plans',
    title: 'Planes y licencias',
    desc: 'Oferta comercial: planes D28D por programa, Food, Entrenadores e invites.',
    img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    alt: 'Planes y licencias',
    superAdminOnly: true,
  },
  {
    id: 'configurations',
    title: 'Configuraciones',
    desc: 'Pagos, apariencia, auditoría y vigencias.',
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    alt: 'Configuraciones',
    superAdminOnly: true,
  },
];

/** IDs legacy → redirigir al hub comercial (compatibilidad bookmarks). */
export const LEGACY_MASTER_REDIRECTS = {
  'd28d-plans': 'commercial-plans',
  'training-plans': 'commercial-plans',
  'program-invites': 'commercial-plans',
  'd28d-zoom': 'd28d',
  'd28d-routines': 'd28d',
};

export default function MastersHub({ onOpenMaster, hasAnyRole }) {
  const { config } = useFrontendConfig();
  const { t, lang } = useI18n();
  const masters = useMemo(() => {
    const fromConfig = getMastersFromConfig(config, MASTERS_DEFAULT, lang);
    const allowedIds = new Set(MASTERS_DEFAULT.map((m) => m.id));
    return fromConfig.filter((m) => allowedIds.has(m.id));
  }, [config, lang]);
  const titleParts = t('masters.title', 'MAESTROS DEL SISTEMA').split(' ');

  const open = (rawId) => {
    const id = LEGACY_MASTER_REDIRECTS[rawId] || rawId;
    onOpenMaster(id);
  };

  return (
    <div className="dashboard-main-view">
      <div className="services-hero">
        <h2 className="services-hero-title">
          {titleParts[0]}{' '}
          <span>{titleParts.slice(1).join(' ') || 'DEL SISTEMA'}</span>
        </h2>
        <p className="services-hero-subtitle">
          {t('masters.subtitle_v2', 'Operación D28D, servicios independientes y oferta comercial en un solo lugar.')}
        </p>

        <div className="services-hero-grid">
          {masters.map((m) => {
            const def = MASTERS_DEFAULT.find((d) => d.id === m.id) || m;
            if (def.superAdminOnly && hasAnyRole && !hasAnyRole(['super_admin'])) {
              return null;
            }
            if (m.id === 'commercial-plans' && hasAnyRole && !hasAnyRole(['super_admin'])) {
              return null;
            }
            return (
              <button
                key={m.id}
                type="button"
                className="service-card-hero"
                onClick={() => open(m.id)}
                style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                aria-label={t('masters.open_aria', 'Abrir maestro {title}', { title: m.title })}
              >
                <img src={resolveMediaUrl(m.img)} alt={m.alt} className="service-card-hero-img" />
                <div className="service-card-hero-content">
                  <h3 className="service-card-hero-title">{m.title}</h3>
                  <p className="service-card-hero-desc">{m.desc || def.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
