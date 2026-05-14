// Vista de administración del módulo de PLAN DE ALIMENTACIÓN.
// Reúne las herramientas nutricionales: calculadora, planes, alimentos,
// equivalentes, recetas y registro diario.

export default function FoodPlanAdminView({ hasAnyRole, onNavigate, onBack }) {
  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <h2>Plan de Alimentación</h2>
          <p style={{ color: '#475569' }}>Planes, alimentos y herramientas nutricionales.</p>
        </div>
        <button className="btn-secondary" onClick={onBack} aria-label="Volver a Servicios">
          ← Servicios
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="card" onClick={() => onNavigate('calculator')}>
          <h3>Calculadora nutricional</h3>
          <p>Calcula una referencia inicial para el usuario.</p>
          <button className="btn-card">Abrir</button>
        </div>

        {hasAnyRole(['super_admin', 'admin_marca', 'admin_gimnasio', 'entrenador', 'nutricionista', 'admin_food_plan', 'admin_food']) && (
          <div className="card" onClick={() => onNavigate('admin')}>
            <h3>Configurar planes</h3>
            <p>Define o ajusta el plan de cada usuario.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}

        {hasAnyRole(['super_admin', 'admin_food_plan', 'admin_food']) && (
          <div className="card" onClick={() => onNavigate('foodsmanager')}>
            <h3>Alimentos (catálogo)</h3>
            <p>Lista de alimentos, macros y porciones de referencia.</p>
            <button className="btn-card">Abrir</button>
          </div>
        )}

        <div className="card" onClick={() => onNavigate('foodlog')}>
          <h3>Registro de comidas</h3>
          <p>Diario nutricional de los usuarios.</p>
          <button className="btn-card">Abrir</button>
        </div>

        <div className="card" onClick={() => onNavigate('equivalentes')}>
          <h3>Equivalentes por grupo</h3>
          <p>Sustituciones manteniendo macros.</p>
          <button className="btn-card">Abrir</button>
        </div>

        <div className="card" onClick={() => onNavigate('recipes')}>
          <h3>Recetas</h3>
          <p>Biblioteca de recetas saludables.</p>
          <button className="btn-card">Abrir</button>
        </div>
      </div>
    </div>
  );
}
