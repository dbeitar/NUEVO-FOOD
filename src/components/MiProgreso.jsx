import { useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import { getServicesFor } from './dashboard/userServices';
import { useFrontendConfig } from '../context/FrontendConfigContext';
import { isFoodExternal, openFoodModule } from '../utils/foodModule';
import { isTrainingExternal, openTrainingModule } from '../utils/trainingModule';
import D28dProgressDashboard from './d28d/D28dProgressDashboard';
import D28dChallengesPanel from './d28d/D28dChallengesPanel';
import TrainingProgressPanel from './training/TrainingProgressPanel';
import HelpAssistantWidget from './HelpAssistantWidget';

const TABS = [
  { id: 'resumen', label: 'Progreso' },
  { id: 'habitos', label: 'Hábitos' },
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'logros', label: 'Logros' },
];

export default function MiProgreso() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { config: frontendConfig } = useFrontendConfig();
  const [tab, setTab] = useState('resumen');

  const services = useMemo(
    () => getServicesFor(user, frontendConfig, lang),
    [user, frontendConfig, lang],
  );

  const hasFood = services.some((s) => s.id === 'food-plan');
  const hasD28d = services.some((s) => s.id === 'd28d' || s.id === 'live-classes');
  const hasTraining = services.some((s) => s.id === 'training');
  const foodExternal = hasFood && isFoodExternal();
  const trainingExternal = hasTraining && isTrainingExternal();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {t('nav.mi_progreso', 'Mi Progreso')}
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          {t('mi_progreso.subtitle', 'Tu avance en nutrición, entrenamiento y programa D28D en un solo lugar.')}
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2" role="tablist">
        {TABS.filter((tb) => {
          if (tb.id === 'asistencia' || tb.id === 'eventos' || tb.id === 'logros') return hasD28d;
          if (tb.id === 'habitos') return hasFood || hasTraining;
          return true;
        }).map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === tb.id ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-700'
            }`}
            onClick={() => setTab(tb.id)}
          >
            {t(`mi_progreso.tab.${tb.id}`, tb.label)}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-6">
          {hasD28d ? <D28dProgressDashboard /> : null}
          {hasTraining && !trainingExternal ? <TrainingProgressPanel /> : null}
          {hasFood && !foodExternal ? (
            <p className="text-sm text-stone-600">
              {t('mi_progreso.food_legacy_hint', 'Tu registro nutricional diario está en FOOD_PLAN desde Inicio → FOOD_PLAN.')}
            </p>
          ) : null}
          {!hasD28d && !hasTraining && !hasFood ? (
            <p className="text-stone-500">{t('services.no_services', 'Aún no tienes servicios activos.')}</p>
          ) : null}
        </div>
      )}

      {tab === 'habitos' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">{t('mi_progreso.tab.habitos', 'Hábitos')}</h2>
          {hasFood && foodExternal ? (
            <div>
              <p className="text-sm text-stone-600 mb-3">
                {t('mi_progreso.food_habits', 'Registro de comidas, medidas y chat nutricional viven en FOOD_PLAN.')}
              </p>
              <button type="button" className="btn-primary" onClick={() => openFoodModule('/dashboard')}>
                {t('mi_progreso.open_food', 'Abrir FOOD_PLAN')}
              </button>
            </div>
          ) : null}
          {hasTraining ? (
            <div className="mt-4">
              {trainingExternal ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openTrainingModule('/dashboard', '/athlete', user)}
                >
                  {t('mi_progreso.open_training', 'Abrir entrenamiento')}
                </button>
              ) : (
                <TrainingProgressPanel />
              )}
            </div>
          ) : null}
          {!hasFood && !hasTraining ? (
            <p className="text-stone-500">{t('mi_progreso.no_habits', 'Sin módulos de hábitos activos.')}</p>
          ) : null}
        </div>
      )}

      {tab === 'asistencia' && hasD28d ? (
        <div className="space-y-4">
          <D28dProgressDashboard />
        </div>
      ) : null}

      {tab === 'eventos' && hasD28d ? <D28dChallengesPanel /> : null}

      {tab === 'logros' && hasD28d ? (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-2">{t('mi_progreso.tab.logros', 'Logros')}</h2>
          <p className="text-sm text-stone-600">
            {t('mi_progreso.logros_hint', 'Completa eventos en la pestaña Eventos para desbloquear podios y reconocimientos.')}
          </p>
        </div>
      ) : null}

      {(tab === 'resumen' || tab === 'asistencia' || tab === 'eventos' || tab === 'logros') && hasD28d ? (
        <HelpAssistantWidget modulo="d28d" />
      ) : null}
      {tab === 'habitos' && hasTraining && !trainingExternal ? (
        <HelpAssistantWidget modulo="training" />
      ) : null}
    </div>
  );
}
