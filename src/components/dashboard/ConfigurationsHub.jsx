import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../context/useI18n';

const CARDS = [
  { id: 'communication', title: 'Comunicación', desc: 'Plantillas, eventos, WhatsApp y auditoría del centro de comunicaciones.' },
  { id: 'faq-center', title: 'FAQ Center', desc: 'Preguntas frecuentes por módulo (D28D, Training, Platform).' },
  { id: 'paymentlinks', title: 'Enlaces y métodos de pago', desc: 'Wompi, pago en sede por módulo.' },
  { id: 'appearance', title: 'Apariencia', desc: 'Marca, textos e imágenes del frontend.' },
  { id: 'audit', title: 'Auditoría', desc: 'Registro de acciones del sistema.' },
  { id: 'modulevigencias', title: 'Vigencias', desc: 'Confirmación de pagos y extensiones.' },
];

export default function ConfigurationsHub({ onBack, onNavigate, hasAnyRole }) {
  const { t } = useI18n();

  return (
    <div className="dashboard-main-view space-y-6">
      <header className="flex items-center gap-3">
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            {t('panel.back_services', 'Volver')}
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Configuraciones</h2>
          <p className="text-sm text-stone-600">Pagos, apariencia, auditoría y vigencias globales.</p>
        </div>
      </header>

      <div className="services-hero-grid">
        {CARDS.map((c) => {
          if (c.id === 'audit' && hasAnyRole && !hasAnyRole(['super_admin'])) return null;
          if (c.id === 'appearance' && hasAnyRole && !hasAnyRole(['super_admin'])) return null;
          if (c.id === 'paymentlinks' && hasAnyRole && !hasAnyRole(['super_admin'])) return null;
          if (c.id === 'communication' && hasAnyRole && !hasAnyRole(['super_admin'])) return null;
          if (c.id === 'faq-center' && hasAnyRole && !hasAnyRole(['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador'])) return null;
          return (
            <button
              key={c.id}
              type="button"
              className="service-card-hero"
              onClick={() => onNavigate(c.id)}
              style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
            >
              <div className="service-card-hero-content p-6">
                <h3 className="service-card-hero-title">{c.title}</h3>
                <p className="service-card-hero-desc">{c.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
