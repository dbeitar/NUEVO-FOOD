import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

const MODULES = [
  { code: 'food', label: 'FOOD' },
  { code: 'training', label: 'TRAINING' },
  { code: 'd28d', label: 'D28D' },
  { code: 'gym', label: 'GYM' },
];

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
  }, []);

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
    payment_url: '',
    active: false,
    sort_order: 0,
  };

  if (loading) return <p className="d28d-text-muted">{t('payments.loading', 'Cargando enlaces…')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="d28d-page-title">{t('payments.title', 'Enlaces de pago por módulo')}</h2>
        <p className="d28d-text-muted">{t('payments.subtitle', 'Solo super_admin. URLs externas.')}</p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="space-y-4">
        {MODULES.map((m) => {
          const row = { ...byCode(m.code), module_code: m.code, label: byCode(m.code).label || m.label };
          return (
            <div key={m.code} className="card p-4 space-y-3">
              <h3 className="font-semibold">{m.label}</h3>
              <input
                className="input w-full"
                placeholder="https://..."
                value={row.payment_url || ''}
                onChange={(e) => setLinks((prev) => {
                  const rest = prev.filter((x) => x.module_code !== m.code);
                  return [...rest, { ...row, payment_url: e.target.value }];
                })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.active === true}
                  onChange={(e) => setLinks((prev) => {
                    const rest = prev.filter((x) => x.module_code !== m.code);
                    return [...rest, { ...row, active: e.target.checked }];
                  })}
                />
                {t('payments.active', 'Activo (visible en registro si hay URL)')}
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={saving === m.code}
                onClick={() => save(row)}
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
