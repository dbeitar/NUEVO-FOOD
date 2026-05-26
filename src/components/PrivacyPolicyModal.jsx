import { useI18n } from '../context/useI18n';
import { getPrivacyContent } from '../i18n/legalContent';

const PrivacyPolicyModal = ({ onClose, onAccept }) => {
  const { t, lang } = useI18n();
  const privacyContent = getPrivacyContent(lang);

  return (
    <div className="policy-modal-overlay" onClick={onClose}>
      <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="policy-modal-header">
          <h2>{t('legal.privacy_title', 'Política de Privacidad')}</h2>
          <button type="button" className="policy-close-btn" onClick={onClose} aria-label={t('common.close', 'Cerrar')}>✕</button>
        </div>

        <div className="policy-modal-content">
          <div className="policy-text">
            {privacyContent.split('\n\n').map((section, idx) => (
              <div key={idx} className="policy-section">
                {section.startsWith('#') ? (
                  <h3>{section.replace(/^#+\s/, '')}</h3>
                ) : section.startsWith('- ') ? (
                  <ul>
                    {section.split('\n').map((item, i) => (
                      <li key={i}>{item.replace(/^- /, '')}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{section}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="policy-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.close', 'Cerrar')}
          </button>
          <button type="button" className="btn-primary" onClick={onAccept}>
            {t('legal.accept_continue', 'Aceptar y Continuar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
