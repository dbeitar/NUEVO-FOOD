import PanelAdminSection from './PanelAdminSection';
import { openTrainingModule } from '../../utils/trainingModule';

const CARDS = [
  { id: 'training', view: 'training' },
  {
    id: 'coachbrand',
    view: 'myaccount',
    when: (has) => has(['entrenador', 'nutricionista']),
  },
  {
    id: 'coachroutines',
    view: 'coachroutines',
    when: (has) => has(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador']),
  },
  {
    id: 'admintraining',
    view: 'admintraining',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training', 'admin_entrenador']),
  },
  {
    id: 'admingallery',
    view: 'admingallery',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training', 'admin_entrenador', 'nutricionista']),
  },
  {
    id: 'adminusers',
    view: 'adminusers',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']),
  },
  {
    id: 'modulevigencias',
    view: 'modulevigencias',
    when: (has) => has(['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista']),
  },
  {
    id: 'progress',
    view: 'progress',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']),
  },
];

export default function TrainersAdminView({ hasAnyRole, onNavigate, onBack, trainingExternal, trainingExternalUrl }) {
  if (trainingExternal) {
    return (
      <div className="dashboard-main-view p-6 max-w-xl">
        <button type="button" className="text-sm text-stone-600 mb-4 hover:underline" onClick={onBack}>
          ← Volver
        </button>
        <h3 className="text-xl font-bold text-stone-900 mb-2">Módulo Entrenadores</h3>
        <p className="text-stone-600 mb-4">
          Opera en el módulo embebido (<code className="text-xs">/training-module</code>), igual que Food Plan.
          El panel legacy del shell requiere <code className="text-xs">VITE_TRAINING_LEGACY=true</code>.
        </p>
        <button type="button" className="btn-primary" onClick={() => openTrainingModule('/dashboard', '/coach')}>
          Abrir módulo Entrenadores
        </button>
      </div>
    );
  }
  return (
    <PanelAdminSection
      panelId="training"
      onBack={onBack}
      hasAnyRole={hasAnyRole}
      onNavigate={onNavigate}
      cards={CARDS}
    />
  );
}
