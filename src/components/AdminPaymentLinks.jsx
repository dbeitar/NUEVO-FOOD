import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

const MODULES = [
  { code: 'food', label: 'FOOD' },
  { code: 'training', label: 'TRAINING' },
  { code: 'd28d', label: 'D28D' },
  { code: 'gym', label: 'GYM' },
];

const WOMPI_DEFAULT = 'https://checkout.wompi.co/l/test_VPOS_Y0ivU1';

export default function AdminPaymentLinks() {
  const { t } = useI18n();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/payment-links/admin');
      setLinks(r.data.data || []);
    } catch {
      setError(t('payments.load_error', 'No se pudieron cargar los enlaces de pago'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const save = async (row) => {
    setSaving(row.module_code);
    try {
      await api.put('/payment-links/admin', row);
      await load();
    } catch {
      setError(t('payments.save_error', 'Error al guardar'));
    } finally {
      setSaving('');
    }
  };

  const byCode = (code) => links.find((l) => l.module_code === code) || {
    module_code: code,
    label: '',
    payment_url: WOMPI_DEFAULT,
    active: true,
    in_person_enabled: true,
    in_person_label: 'Pago en sede',
    online_label: 'Pago en línea (Wompi)',
    sort_order: 0,
  };

  const patch = (code, patchObj) => {
    const row = { ...byCode(code), module_code: code, ...patchObj };
    setLinks((prev) => [...prev.filter((x) => x.module_code !== code), row]);
    return row;
  };

  if (loading) return <p className="d28d-text-muted">{t('payments.loading', 'Cargando enlaces…')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="d28d-page-title">{t('payments.title', 'Enlaces de pago por módulo')}</h2>
        <p className="d28d-text-muted">
          {t('payments.subtitle', 'Dos métodos: Wompi (en línea) y pago en sede. Visible en registro y Mi cuenta.')}
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="space-y-4">
        {MODULES.map((m) => {
          const base = byCode(m.code);
          const row = links.find((x) => x.module_code === m.code) || base;
          return (
            <div key={m.code} className="card p-4 space-y-3">
              <h3 className="font-semibold">{m.label}</h3>
              <div>
                <label className="label text-sm">{t('payments.wompi_url', 'Enlace Wompi (pago en línea)')}</label>
                <input
                  className="input w-full"
                  placeholder={WOMPI_DEFAULT}
                  value={row.payment_url || ''}
                  onChange={(e) => patch(m.code, { payment_url: e.target.value, label: row.label || m.label })}
                />
              </div>
              <div>
                <label className="label text-sm">{t('payments.online_label', 'Etiqueta pago en línea')}</label>
                <input
                  className="input w-full"
                  value={row.online_label || 'Pago en línea (Wompi)'}
                  onChange={(e) => patch(m.code, { online_label: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.in_person_enabled !== false}
                  onChange={(e) => patch(m.code, { in_person_enabled: e.target.checked })}
                />
                {t('payments.in_person_enabled', 'Habilitar pago en sede')}
              </label>
              {row.in_person_enabled !== false && (
                <div>
                  <label className="label text-sm">{t('payments.in_person_label', 'Etiqueta pago en sede')}</label>
                  <input
                    className="input w-full"
                    value={row.in_person_label || 'Pago en sede'}
                    onChange={(e) => patch(m.code, { in_person_label: e.target.value })}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.active === true}
                  onChange={(e) => patch(m.code, { active: e.target.checked })}
                />
                {t('payments.active', 'Activo en registro / contratación')}
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={saving === m.code}
                onClick={() => save(links.find((x) => x.module_code === m.code) || row)}
              >
                {saving === m.code ? t('appearance.saving', 'Guardando…') : t('payments.save', 'Guardar')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
