import PanelAdminSection from './PanelAdminSection';

const CARDS = [
  {
    id: 'adminusers',
    view: 'adminusers',
    when: (has) => has(['super_admin', 'admin_food_plan', 'admin_food', 'admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista']),
  },
  {
    id: 'admin',
    view: 'admin',
    when: (has) => has(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista', 'admin_food_plan', 'admin_food']),
  },
  {
    id: 'progress',
    view: 'progress',
    when: (has) => has(['super_admin', 'admin_food_plan', 'admin_food', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista']),
  },
  { id: 'calculator', view: 'calculator' },
  {
    id: 'foodsmanager',
    view: 'foodsmanager',
    when: (has) => has(['super_admin', 'admin_food_plan', 'admin_food']),
  },
  { id: 'foodlog', view: 'foodlog' },
  { id: 'equivalentes', view: 'equivalentes' },
  { id: 'recipes', view: 'recipes' },
];

export default function FoodPlanAdminView({ hasAnyRole, onNavigate, onBack }) {
  return (
    <PanelAdminSection
      panelId="food-plan"
      onBack={onBack}
      hasAnyRole={hasAnyRole}
      onNavigate={onNavigate}
      cards={CARDS}
    />
  );
}
