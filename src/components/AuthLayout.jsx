import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { useFrontendConfig } from '../context/FrontendConfigContext';
import { useI18n } from '../context/useI18n';
import { pickLocalized } from '../utils/localizedField';

export default function AuthLayout({ title, subtitle, children, wide = false }) {
  const { config, brandName: cfgBrand } = useFrontendConfig();
  const { lang } = useI18n();
  const auth = config?.auth || {};
  const brandParts = String(cfgBrand || PUBLIC_BRAND_NAME || 'D28D GYM VIRTUAL').split(' ');
  const first = brandParts[0] || 'D28D';
  const rest = brandParts.slice(1).join(' ') || 'GYM VIRTUAL';

  return (
    <div className="auth-shell">
      <section className="auth-shell-hero" aria-hidden="false">
        <p className="auth-logo" style={{ marginBottom: '2rem' }}>
          <span className="brand-d28d">{first}</span> {rest}
        </p>
        <h1 className="auth-hero-title">
          <span className="line-white">{pickLocalized(auth, 'line_white', lang, 'ENTRENA EN VIVO')}</span>
          <span className="line-yellow">{pickLocalized(auth, 'line_yellow_1', lang, 'CON LOS MEJORES')}</span>
          <span className="line-yellow">{pickLocalized(auth, 'line_yellow_2', lang, 'PROFESIONALES')}</span>
        </h1>
        <p className="auth-hero-sub">
          {pickLocalized(auth, 'subtitle', lang, 'La energía de un gimnasio real, en la comodidad de tu casa.')}
        </p>
        <span className="btn-primary" style={{ pointerEvents: 'none', display: 'inline-flex' }}>
          {pickLocalized(auth, 'cta_label', lang, 'VER CLASES')}
        </span>
      </section>

      <section className="auth-shell-panel">
        <div className={`auth-box ${wide ? 'auth-box-large' : ''}`}>
          <p className="auth-logo">
            <span className="brand-d28d">{first}</span> {rest}
          </p>
          {title ? <h2 className="auth-title">{title}</h2> : null}
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
          {children}
        </div>
      </section>
    </div>
  );
}
