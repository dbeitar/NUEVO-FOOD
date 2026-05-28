import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';
import { emitToast } from '../context/toast';

const MODULE_TABS = [
  { code: '', label: 'Todos' },
  { code: 'food', label: 'FOOD_PLAN' },
  { code: 'training', label: 'TRAINING' },
  { code: 'd28d', label: 'D28D' },
  { code: 'gym', label: 'Gym' },
];

const ESTADO_BADGE = {
  activo: 'badge-green',
  pendiente_sede: 'badge-warning',
  pendiente_pago_online: 'badge-warning',
  vencido: 'badge-danger',
};

export default function AdminModuleVigencias() {
  const { t } = useI18n();
  const [module, setModule] = useState('');
  const [data, setData] = useState({ pending: [], expiring: [], licenses: [], notifications: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = module ? `?module=${module}` : '';
      const r = await api.get(`/payment-admin/overview${q}`);
      setData(r.data?.data || r.data || {});
    } catch {
      setError(t('vigencias.load_error', 'No se pudo cargar vigencias y pagos'));
    } finally {
      setLoading(false);
    }
  }, [module, t]);

  useEffect(() => { load(); }, [load]);

  const confirmPayment = async (accountId) => {
    try {
      await api.post(`/payment-admin/confirm/${accountId}`, {
        days: 30,
        module_code: module || 'd28d',
      });
      emitToast({ type: 'success', title: 'Pago confirmado', message: 'Vigencia activada 30 días' });
      load();
    } catch (e) {
      emitToast({ type: 'error', title: 'Error', message: e.response?.data?.error || 'No se pudo confirmar' });
    }
  };

  const extendLicense = async (userId, moduleCode) => {
    const days = Number(window.prompt(t('vigencias.days_prompt', 'Días a extender'), '30'));
    if (!days || days < 1) return;
    try {
      await api.post(`/payment-admin/extend/${userId}`, { module_code: moduleCode, days });
      emitToast({ type: 'success', title: 'Vigencia extendida', message: `+${days} días en ${moduleCode}` });
      load();
    } catch (e) {
      emitToast({ type: 'error', title: 'Error', message: e.response?.data?.error || 'No se pudo extender' });
    }
  };

  if (loading) return <p className="d28d-text-muted">{t('vigencias.loading', 'Cargando vigencias…')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="d28d-page-title">{t('vigencias.title', 'Pagos, vigencias y notificaciones')}</h2>
        <p className="d28d-text-muted">
          {t('vigencias.subtitle', 'Confirma pagos en sede, revisa vencimientos y extiende licencias por módulo (patrón FOOD_PLAN).')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.code || 'all'}
            type="button"
            className={module === tab.code ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setModule(tab.code)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section className="card p-4">
        <h3 className="font-semibold mb-3">{t('vigencias.pending', 'Pagos pendientes')}</h3>
        {data.pending?.length === 0 && (
          <p className="text-sm text-stone-500">{t('vigencias.no_pending', 'Sin pagos pendientes.')}</p>
        )}
        <div className="space-y-3">
          {(data.pending || []).map((row) => (
            <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-stone-200 pb-3">
              <div>
                <strong>{row.usuario_nombre}</strong>
                <div className="text-sm text-stone-600">{row.usuario_email}</div>
                <div className="text-sm">
                  Plan {row.plan} · <span className={ESTADO_BADGE[row.estado] || 'badge-slate'}>{row.estado}</span>
                  {' · '}{row.metodoPago}
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={() => confirmPayment(row.id)}>
                {t('vigencias.confirm', 'Confirmar pago')}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">{t('vigencias.expiring', 'Cuentas por vencer')}</h3>
        {(data.expiring || []).length === 0 && (
          <p className="text-sm text-stone-500">{t('vigencias.no_expiring', 'Nada por vencer en los próximos 30 días.')}</p>
        )}
        <ul className="space-y-2 text-sm">
          {(data.expiring || []).map((row) => (
            <li key={row.id}>
              {row.usuario_nombre} — vence {new Date(row.fecha_vencimiento).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-3">{t('vigencias.licenses', 'Licencias por módulo')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 border-b">
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Módulo</th>
                <th className="py-2 pr-4">Vence</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {(data.licenses || []).map((lic, i) => (
                <tr key={`${lic.user_id}-${lic.module_code}-${i}`} className="border-b border-stone-100">
                  <td className="py-2 pr-4">{lic.usuario_nombre}</td>
                  <td className="py-2 pr-4 uppercase">{lic.module_code}</td>
                  <td className="py-2 pr-4">
                    {lic.valid_until
                      ? `${new Date(lic.valid_until).toLocaleDateString()} (${lic.days_left}d)`
                      : '—'}
                  </td>
                  <td className="py-2">
                    <button type="button" className="btn-secondary text-xs" onClick={() => extendLicense(lic.user_id, lic.module_code)}>
                      {t('vigencias.extend', 'Extender')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
