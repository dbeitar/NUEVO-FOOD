import PanelAdminSection from './PanelAdminSection';
import { openTrainingModule } from '../../utils/trainingModule';

/** Panel del entrenador (marca blanca): orden operativo — galería primero. */
const COACH_CARDS = [
  { id: 'admingallery', view: 'admingallery' },
  { id: 'coachai', view: 'coachai' },
  { id: 'admintraining', view: 'admintraining' },
  { id: 'adminusers', view: 'adminusers' },
  { id: 'progress', view: 'progress' },
];

/** Admin de entrenadores (operaciones): coaches + usuarios vinculados. */
const OPS_CARDS = [
  { id: 'admintrainers', view: 'admintrainers' },
  { id: 'adminusers', view: 'adminusers' },
  { id: 'progress', view: 'progress' },
];

export default function TrainersAdminView({
  hasAnyRole,
  onNavigate,
  onBack,
  trainingExternal,
  trainingExternalUrl,
  variant = 'coach',
}) {
  if (trainingExternal) {
    return (
      <div className="dashboard-main-view p-6 max-w-xl">
        <button type="button" className="text-sm text-stone-600 mb-4 hover:underline" onClick={onBack}>
          ← Volver
        </button>
        <h3 className="text-xl font-bold text-stone-900 mb-2">Módulo Entrenadores</h3>
        <p className="text-stone-600 mb-4">
          Opera en el módulo embebido (<code className="text-xs">/training-module</code>), igual que FOOD_PLAN.
        </p>
        <button type="button" className="btn-primary" onClick={() => openTrainingModule('/dashboard', '/coach')}>
          Abrir módulo Entrenadores
        </button>
      </div>
    );
  }

  const cards = variant === 'ops' ? OPS_CARDS : COACH_CARDS;
  const backLabelKey = variant === 'ops' ? 'panel.back_services' : 'panel.back_panel';

  return (
    <PanelAdminSection
      panelId="training"
      onBack={onBack}
      backLabelKey={backLabelKey}
      hasAnyRole={hasAnyRole}
      onNavigate={onNavigate}
      cards={cards}
    />
  );
}
