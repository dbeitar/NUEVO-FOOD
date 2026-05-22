import { useI18n } from '../../context/useI18n';

const SOCIAL_KEYS = [
  { key: 'website', label: 'Web' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'whatsapp', label: 'WhatsApp (redes)' },
];

export default function WhiteLabelFields({ formData, setFormData, showDomain = true }) {
  const { t } = useI18n();
  const social = formData.social_links && typeof formData.social_links === 'object'
    ? formData.social_links
    : {};

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSocial = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      social_links: { ...(prev.social_links || {}), [key]: value },
    }));
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <h5 className="text-sm font-semibold text-stone-800 mb-4">
        {t('wl.title', 'Marca blanca — Gym / Coach')}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">{t('wl.favicon', 'Favicon URL')}</label>
          <input className="input" name="favicon_url" value={formData.favicon_url || ''} onChange={onChange} placeholder="https://..." />
        </div>
        <div>
          <label className="label">{t('wl.cover', 'Portada URL')}</label>
          <input className="input" name="cover_url" value={formData.cover_url || ''} onChange={onChange} placeholder="https://..." />
        </div>
        {showDomain && (
          <div className="md:col-span-2">
            <label className="label">{t('wl.domain', 'Dominio futuro')}</label>
            <input
              className="input font-mono text-sm"
              name="custom_domain"
              value={formData.custom_domain || ''}
              onChange={onChange}
              placeholder="app.mimarca.com"
            />
          </div>
        )}
      </div>
      <p className="text-xs text-stone-500 mt-3 mb-2">{t('wl.social', 'Redes sociales')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {SOCIAL_KEYS.map(({ key, label }) => (
          <div key={key}>
            <label className="label text-xs">{label}</label>
            <input
              className="input text-sm"
              value={social[key] || ''}
              onChange={(e) => onSocial(key, e.target.value)}
              placeholder={key === 'website' ? 'https://' : '@usuario'}
            />
          </div>
        ))}
      </div>
      {(formData.cover_url || formData.favicon_url) && (
        <div className="mt-4 flex gap-4 items-start">
          {formData.cover_url && (
            <img src={formData.cover_url} alt="" className="h-20 w-32 object-cover rounded-lg border border-slate-200" />
          )}
          {formData.favicon_url && (
            <img src={formData.favicon_url} alt="" className="h-12 w-12 object-contain rounded border border-slate-200" />
          )}
        </div>
      )}
    </div>
  );
}
