import { useMemo } from 'react';
import { useFrontendConfig } from '../../context/FrontendConfigContext';
import { useI18n } from '../../context/useI18n';
import { getPanelView, getProgramsFromConfig } from '../../utils/frontendConfigMerge';
import { panelCardText } from '../../utils/panelI18n';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const PROGRAMS_DEFAULT = [
  {
    id: 'vital',
    name: 'Vital D28D',
    desc: 'Bienestar integral y salud femenina.',
    img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80',
    accent: '#ffd700',
  },
  {
    id: 'pancitas',
    name: 'Pancitas Fit',
    desc: 'Entrenamiento especializado para embarazo.',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    accent: '#ffd700',
  },
  {
    id: 'virtual_d28d',
    name: 'Virtual D28D',
    desc: 'El programa clásico de transformación en 28 días.',
    img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
    accent: '#ffd700',
  },
];

const OPERATION_CARDS = [
  {
    id: 'liveclasses',
    view: 'liveclasses',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d']),
  },
  {
    id: 'programs',
    view: 'programs',
    when: (has) => has(['super_admin', 'admin_d28d']),
  },
  {
    id: 'd28d-routines',
    view: 'd28d-routines',
    when: (has) => has(['super_admin', 'admin_d28d', 'entrenador_d28d']),
  },
  {
    id: 'd28d-challenges-admin',
    view: 'd28d-challenges-admin',
    when: (has) => has(['super_admin', 'admin_d28d']),
  },
  {
    id: 'admingallery',
    view: 'admingallery',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'admin_training', 'admin_entrenador']),
  },
];

/** Gimnasios dentro de D28D: solo plataforma crea sedes; admin gym opera usuarios/clases/asistencia. */
const GYM_CARDS = [
  {
    id: 'admingyms',
    view: 'admingyms',
    when: (has) => has(['super_admin', 'admin_d28d']),
  },
  {
    id: 'adminusers',
    view: 'adminusers',
    when: (has) => has(['super_admin', 'admin_d28d', 'admin_marca', 'admin_gimnasio', 'admin_gym']),
  },
  {
    id: 'liveclasses',
    view: 'liveclasses',
    when: (has) => has(['admin_marca', 'admin_gimnasio', 'admin_gym']),
  },
  {
    id: 'admincompanies',
    view: 'admincompanies',
    when: (has) => has(['super_admin', 'admin_d28d']),
  },
];

function PanelCard({ t, config, panelId, cardId, cardCfg, img, onClick, lang }) {
  const title = panelCardText(t, config, panelId, cardId, 'title', lang);
  const desc = panelCardText(t, config, panelId, cardId, 'desc', lang);
  return (
    <div
      className={`card admin-panel-card ${img ? 'has-img' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
    >
      {img ? <img src={img} alt={cardCfg?.alt || title} className="admin-panel-card-img" /> : null}
      <h3 className="d28d-section-title">{title}</h3>
      <p className="d28d-text-muted">{desc}</p>
      <button type="button" className="btn-card">{t('panel.open', 'Abrir')}</button>
    </div>
  );
}

export default function D28DAdminView({ hasAnyRole, onNavigate, onPickProgram, onBack }) {
  const { config } = useFrontendConfig();
  const { t, lang } = useI18n();
  const panel = useMemo(() => getPanelView(config, 'd28d', lang), [config, lang]);
  const programs = useMemo(
    () => getProgramsFromConfig(config, PROGRAMS_DEFAULT, lang),
    [config, lang],
  );

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header panel-admin-header">
        <div className="panel-admin-header-main">
          {panel.hero?.img ? (
            <img src={resolveMediaUrl(panel.hero.img)} alt="" className="panel-admin-hero-thumb" />
          ) : null}
          <div>
            <button type="button" className="btn-secondary panel-back-btn" onClick={onBack}>
              {t('panel.back_services', '← Servicios')}
            </button>
            <h2 className="d28d-page-title">{panel.hero?.title || 'D28D · Programas'}</h2>
            <p className="d28d-text-muted">{panel.hero?.subtitle}</p>
          </div>
        </div>
      </header>

      <h3 className="d28d-section-title" style={{ margin: '1rem 0 0.5rem' }}>{t('panel.active_programs', 'Programas activos')}</h3>
      <div className="services-hero-grid">
        {programs.map((p) => (
          <button
            key={p.id}
            type="button"
            className="service-card-hero"
            onClick={() => onPickProgram(p.id)}
            style={{
              textAlign: 'left',
              border: '1px solid var(--d28d-border)',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <img src={resolveMediaUrl(p.img)} alt={p.name} className="service-card-hero-img" />
            <div className="service-card-hero-content">
              <h3 className="service-card-hero-title service-card-hero-title--accent">{p.name}</h3>
              <p className="service-card-hero-desc">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <h3 className="d28d-section-title" style={{ margin: '1.5rem 0 0.5rem' }}>{t('panel.operation', 'Operación')}</h3>
      <div className="dashboard-grid">
        {OPERATION_CARDS.map((c) => {
          if (c.when && !c.when(hasAnyRole)) return null;
          const cardCfg = panel.cards?.[c.id] || {};
          const img = cardCfg.img ? resolveMediaUrl(cardCfg.img) : '';
          return (
            <PanelCard
              key={c.id}
              t={t}
              config={config}
              panelId="d28d"
              cardId={c.id}
              cardCfg={cardCfg}
              img={img}
              lang={lang}
              onClick={() => onNavigate(c.view)}
            />
          );
        })}
      </div>

      {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d']) && (
        <>
          <h3 className="d28d-section-title" style={{ margin: '1.5rem 0 0.5rem' }}>{t('panel.white_label_gyms', 'Gimnasios marca blanca')}</h3>
          <p className="d28d-text-muted" style={{ marginTop: 0 }}>
            {hasAnyRole(['super_admin', 'admin_d28d'])
              ? t('panel.white_label_desc_admin', '')
              : t('panel.white_label_desc_user', '')}
          </p>
          <div className="dashboard-grid">
            {GYM_CARDS.map((c) => {
              if (c.when && !c.when(hasAnyRole)) return null;
              const cardCfg = panel.cards?.[c.id] || {};
              const img = cardCfg.img ? resolveMediaUrl(cardCfg.img) : '';
              return (
                <PanelCard
                  key={c.id}
                  t={t}
                  config={config}
                  panelId="d28d"
                  cardId={c.id}
                  cardCfg={cardCfg}
                  img={img}
                  lang={lang}
                  onClick={() => onNavigate(c.view)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
