import PanelAdminSection from './PanelAdminSection';

const CARDS = [
  {
    id: 'admingyms',
    view: 'admingyms',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']),
  },
  {
    id: 'adminusers',
    view: 'adminusers',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d']),
  },
  {
    id: 'adminplans',
    view: 'adminplans',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym']),
  },
  {
    id: 'liveclasses',
    view: 'liveclasses',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym', 'admin_d28d']),
  },
];

export default function GymProductView({ hasAnyRole, onNavigate, onBack }) {
  return (
    <PanelAdminSection
      panelId="gym"
      onBack={onBack}
      backLabelKey="panel.back_home"
      hasAnyRole={hasAnyRole}
      onNavigate={onNavigate}
      cards={CARDS}
    />
  );
}
