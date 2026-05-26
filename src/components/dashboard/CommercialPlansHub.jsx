import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../../context/useI18n';
import AdminPlans from '../AdminPlans';
import AdminProgramInvites from '../AdminProgramInvites';

const TABS = [
  { id: 'd28d', label: 'Planes D28D' },
  { id: 'food', label: 'Plan Alimentación' },
  { id: 'training', label: 'Plan Entrenadores' },
  { id: 'invites', label: 'Códigos por programa' },
];

export default function CommercialPlansHub({ onBack, onOpenVigencias }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('d28d');

  const inner = useMemo(() => {
    if (tab === 'food') {
      return (
        <AdminPlans
          mode="food"
          singlePlanOnly
          title="Plan comercial — Alimentación"
          embedded
        />
      );
    }
    if (tab === 'training') {
      return (
        <AdminPlans
          mode="training"
          singlePlanOnly
          title="Plan comercial — Entrenadores"
          embedded
        />
      );
    }
    if (tab === 'invites') {
      return <AdminProgramInvites embedded />;
    }
    return (
      <AdminPlans
        mode="d28d"
        title="Planes D28D (todos los programas)"
        embedded
      />
    );
  }, [tab]);

  return (
    <div className="dashboard-main-view space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              {t('panel.back_services', 'Volver')}
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Planes y licencias</h2>
            <p className="text-sm text-stone-600">
              Oferta comercial centralizada (D28D por programa, Food y Entrenadores). No mezcla operación ni Zoom.
            </p>
          </div>
        </div>
        {onOpenVigencias && (
          <button type="button" className="btn-secondary" onClick={onOpenVigencias}>
            {t('nav.vigencias', 'Vigencias y pagos')}
          </button>
        )}
      </header>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-lime-500 text-stone-900'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {inner}
    </div>
  );
}
