import { useMemo } from 'react';
import { useFrontendConfig } from '../../context/FrontendConfigContext';
import { useI18n } from '../../context/useI18n';
import { getPanelView } from '../../utils/frontendConfigMerge';
import { panelCardText } from '../../utils/panelI18n';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export default function PanelAdminSection({
  panelId,
  onBack,
  backLabelKey = 'panel.back_services',
  hasAnyRole,
  onNavigate,
  cards,
}) {
  const { config } = useFrontendConfig();
  const { t, lang } = useI18n();
  const panel = useMemo(() => getPanelView(config, panelId, lang), [config, panelId, lang]);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header panel-admin-header">
        <div className="panel-admin-header-main">
          {panel.hero?.img ? (
            <img
              src={resolveMediaUrl(panel.hero.img)}
              alt=""
              className="panel-admin-hero-thumb"
            />
          ) : null}
          <div>
            <button type="button" className="btn-secondary panel-back-btn" onClick={onBack}>
              {t(backLabelKey, '← Servicios')}
            </button>
            <h2 className="d28d-page-title">{panel.hero?.title || panelId}</h2>
            <p className="d28d-text-muted">{panel.hero?.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {cards.map((c) => {
          if (c.when && !c.when(hasAnyRole)) return null;
          const cardCfg = panel.cards?.[c.id] || {};
          const title = panelCardText(t, config, panelId, c.id, 'title', lang);
          const desc = panelCardText(t, config, panelId, c.id, 'desc', lang);
          const img = cardCfg.img ? resolveMediaUrl(cardCfg.img) : '';
          return (
            <div
              key={c.id}
              className={`card admin-panel-card ${img ? 'has-img' : ''}`}
              onClick={() => onNavigate(c.view)}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(c.view)}
              role="button"
              tabIndex={0}
            >
              {img ? <img src={img} alt={cardCfg.alt || title} className="admin-panel-card-img" /> : null}
              <h3 className="d28d-section-title">{title}</h3>
              <p className="d28d-text-muted">{desc}</p>
              <button type="button" className="btn-card">{t('panel.open', 'Abrir')}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
