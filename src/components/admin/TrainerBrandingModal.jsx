import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import api from '../../services/api';
import { useI18n } from '../../context/useI18n';
import WhiteLabelFields from './WhiteLabelFields';

const emptyBranding = {
  logo_url: '',
  brand_name: '',
  brand_slug: '',
  welcome_message: '',
  support_whatsapp: '',
  primary_color: '#2563eb',
  secondary_color: '#10b981',
  white_label_enabled: true,
  favicon_url: '',
  cover_url: '',
  social_links: {},
  custom_domain: '',
};

export default function TrainerBrandingModal({ trainer, onClose, onSaved }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState(emptyBranding);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trainer?.id) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/trainers/${trainer.id}/branding`);
        const b = data?.branding || data || {};
        if (active) {
          setFormData({
            ...emptyBranding,
            logo_url: b.logo_url || '',
            brand_name: b.brand_name || trainer.nombre || '',
            brand_slug: b.brand_slug || '',
            welcome_message: b.welcome_message || '',
            support_whatsapp: b.support_whatsapp || '',
            primary_color: b.primary_color || '#2563eb',
            secondary_color: b.secondary_color || '#10b981',
            white_label_enabled: b.white_label_enabled !== false,
            favicon_url: b.favicon_url || '',
            cover_url: b.cover_url || '',
            social_links: b.social_links || {},
            custom_domain: b.custom_domain || '',
          });
        }
      } catch {
        if (active) setError(t('wl.load_error', 'No se pudo cargar la marca'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [trainer?.id, trainer?.nombre, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/trainers/${trainer.id}`, formData);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('wl.save_error', 'Error al guardar marca'));
    } finally {
      setSaving(false);
    }
  };

  if (!trainer) return null;

  return (
    <div className="form-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="form-modal max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="form-modal-header">
          <h4 className="font-semibold text-stone-900">
            {t('wl.coach_brand', 'Marca coach')}: {trainer.nombre}
          </h4>
          <button type="button" className="text-stone-500 hover:text-stone-900" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-stone-500">{t('common.loading', 'Cargando...')}</p>
        ) : (
          <form id="trainer-branding-form" onSubmit={handleSubmit} className="form-modal-content">
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('gyms.logo_url', 'Logo URL')}</label>
                <input className="input" name="logo_url" value={formData.logo_url} onChange={(e) => setFormData((p) => ({ ...p, logo_url: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('gyms.brand_name', 'Nombre marca')}</label>
                <input className="input" name="brand_name" value={formData.brand_name} onChange={(e) => setFormData((p) => ({ ...p, brand_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Slug</label>
                <input className="input" name="brand_slug" value={formData.brand_slug} onChange={(e) => setFormData((p) => ({ ...p, brand_slug: e.target.value }))} />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" name="support_whatsapp" value={formData.support_whatsapp} onChange={(e) => setFormData((p) => ({ ...p, support_whatsapp: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('gyms.primary_color', 'Color primario')}</label>
                <input type="color" className="input h-10" name="primary_color" value={formData.primary_color} onChange={(e) => setFormData((p) => ({ ...p, primary_color: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t('gyms.secondary_color', 'Color secundario')}</label>
                <input type="color" className="input h-10" name="secondary_color" value={formData.secondary_color} onChange={(e) => setFormData((p) => ({ ...p, secondary_color: e.target.value }))} />
              </div>
            </div>
            <label className="block mt-4">
              <span className="label">{t('gyms.welcome_message', 'Mensaje bienvenida')}</span>
              <textarea className="input min-h-[72px]" name="welcome_message" value={formData.welcome_message} onChange={(e) => setFormData((p) => ({ ...p, welcome_message: e.target.value }))} />
            </label>
            <WhiteLabelFields formData={formData} setFormData={setFormData} />
            <div className="form-modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>{t('common.cancel', 'Cancelar')}</button>
              <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
                <Save size={16} />
                {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
