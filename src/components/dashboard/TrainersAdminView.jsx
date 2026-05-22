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

export default function TrainersAdminView({ hasAnyRole, onNavigate, onBack }) {
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
