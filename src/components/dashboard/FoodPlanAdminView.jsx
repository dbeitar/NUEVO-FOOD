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

export default function FoodPlanAdminView({ hasAnyRole, onNavigate, onBack, foodExternal, foodExternalUrl }) {
  if (foodExternal) {
    const url = foodExternalUrl || 'https://foodplan.tech';
    return (
      <div className="dashboard-main-view p-6 max-w-xl">
        <button type="button" className="text-sm text-stone-600 mb-4 hover:underline" onClick={onBack}>
          ← Volver
        </button>
        <h3 className="text-xl font-bold text-stone-900 mb-2">Plan de Alimentación (Food Plan)</h3>
        <p className="text-stone-600 mb-4">
          El módulo nutricional opera en Food Plan embebido (<code className="text-xs">/food-plan</code>).
          Las rutas legacy del monolito requieren <code className="text-xs">VITE_FOOD_LEGACY=true</code>.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          Abrir Food Plan
        </a>
      </div>
    );
  }
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
