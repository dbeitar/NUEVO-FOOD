import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import { buildWaMeUrl, resolvePlanSupport } from '../utils/whatsappSupport';
import HelpAssistantWidget from './HelpAssistantWidget';
import { getServicesFor } from './dashboard/userServices';
import { useFrontendConfig } from '../context/FrontendConfigContext';

function pickFaqModulo(services) {
  if (services.some((s) => s.id === 'd28d' || s.id === 'live-classes')) return 'd28d';
  if (services.some((s) => s.id === 'training')) return 'training';
  return 'platform';
}

export default function SupportCenter() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { config: frontendConfig } = useFrontendConfig();
  const [faq, setFaq] = useState({ categories: [], items: [] });
  const [q, setQ] = useState('');
  const [planSupport, setPlanSupport] = useState(null);

  const services = useMemo(
    () => getServicesFor(user, frontendConfig, lang),
    [user, frontendConfig, lang],
  );
  const modulo = pickFaqModulo(services);
  const foodOnly = services.some((s) => s.id === 'food-plan')
    && !services.some((s) => s.id === 'd28d' || s.id === 'live-classes' || s.id === 'training');

  useEffect(() => {
    api.get(`/faq/${modulo}`).then((r) => setFaq(r.data?.data || { categories: [], items: [] })).catch(() => {});
    api.get('/accounts/me').then((r) => {
      const d = r.data;
      setPlanSupport(d?.plan_support || resolvePlanSupport(d?.account) || null);
    }).catch(() => {});
  }, [modulo]);

  const filtered = (faq.items || []).filter((item) => {
    const text = `${item.pregunta || ''} ${item.respuesta || ''}`.toLowerCase();
    return !q.trim() || text.includes(q.trim().toLowerCase());
  });

  const waUrl = buildWaMeUrl(
    planSupport?.whatsapp || import.meta.env.VITE_SUPPORT_WHATSAPP || '573192635819',
    planSupport?.message,
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">{t('nav.support', 'Soporte')}</h1>
        <p className="text-sm text-stone-600 mt-1">
          {t('support.subtitle', 'Preguntas frecuentes y contacto con tu equipo.')}
        </p>
      </header>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <a href={waUrl} target="_blank" rel="noreferrer" className="btn-primary">
          {t('support.whatsapp', 'Contactar por WhatsApp')}
        </a>
      </div>

      <div>
        <input
          className="input w-full"
          placeholder={t('support.search_faq', 'Buscar en preguntas frecuentes…')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-stone-500 text-sm">{t('support.no_faq', 'Sin resultados.')}</p>
        ) : (
          filtered.map((item) => (
            <details key={item.id} className="card p-4">
              <summary className="font-semibold cursor-pointer">{item.pregunta}</summary>
              <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{item.respuesta}</p>
            </details>
          ))
        )}
      </div>

      {!foodOnly ? <HelpAssistantWidget modulo={modulo} /> : null}
    </div>
  );
}
