import PanelAdminSection from './PanelAdminSection';

const CARDS = [
  { id: 'training', view: 'training' },
  {
    id: 'admintraining',
    view: 'admintraining',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'admin_training', 'admin_entrenador']),
  },
  {
    id: 'admingallery',
    view: 'admingallery',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'entrenador', 'admin_training', 'admin_entrenador']),
  },
  {
    id: 'adminusers',
    view: 'adminusers',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']),
  },
  {
    id: 'progress',
    view: 'progress',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_training', 'admin_entrenador', 'entrenador']),
  },
];

export default function TrainersAdminView({ hasAnyRole, onNavigate, onBack, trainingExternal, trainingExternalUrl }) {
  if (trainingExternal) {
    const url = trainingExternalUrl || 'http://localhost:5175';
    return (
      <div className="dashboard-main-view p-6 max-w-xl">
        <button type="button" className="text-sm text-stone-600 mb-4 hover:underline" onClick={onBack}>
          ← Volver
        </button>
        <h3 className="text-xl font-bold text-stone-900 mb-2">Entrenamiento (módulo externo)</h3>
        <p className="text-stone-600 mb-4">
          El módulo training externo se activa con <code className="text-xs">VITE_TRAINING_EXTERNAL=true</code>.
          Por defecto el shell abre el panel interno con licencia y branding centralizado.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block">
          Abrir módulo training
        </a>
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
