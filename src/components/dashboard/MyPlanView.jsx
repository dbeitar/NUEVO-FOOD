import { useI18n } from '../../context/useI18n';

export default function MyPlanView({
  myPlan,
  planLoading,
  dayTotals,
  onNavigate,
}) {
  const { t } = useI18n();

  if (planLoading) {
    return <div className="card"><p>Cargando tu plan…</p></div>;
  }

  if (!myPlan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Aún no tienes un plan asignado</h3>
        <p style={{ marginTop: '0.5rem', color: '#475569' }}>
          Tu coach o el equipo del centro asignará tu plan personal en cuanto inicies.
          Mientras tanto, puedes calcular una referencia inicial.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="btn-card" onClick={() => onNavigate('calculator')}>
            Calcular referencia
          </button>
          <button className="btn-card" onClick={() => onNavigate('myaccount')}>
            Completar mi perfil
          </button>
        </div>
      </div>
    );
  }

  const safeDiv = (a, b) => (Number(b) > 0 ? Math.min((Number(a) / Number(b)) * 100, 100) : 0);

  const items = [
    { label: t('ai.calories', 'Calorías'), unit: 'kcal', cur: dayTotals?.totalCalorias || 0, goal: myPlan.calorias },
    { label: t('ai.protein', 'Proteína'), unit: 'g', cur: dayTotals?.totalProteina || 0, goal: myPlan.proteina },
    { label: t('ai.carbs', 'Carbohidratos'), unit: 'g', cur: dayTotals?.totalCarbohidratos || 0, goal: myPlan.carbohidratos },
    { label: t('ai.fats', 'Grasas'), unit: 'g', cur: dayTotals?.totalGrasas || 0, goal: myPlan.grasas },
  ];

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header">
        <h2>Mi plan de hoy</h2>
        <p style={{ color: '#475569' }}>
          Objetivo: <strong>{myPlan.objetivo || '—'}</strong>
        </p>
      </header>

      <section className="quick-stats">
        <h3>Avance del día</h3>
        <div className="stats-grid">
          {items.map((it) => (
            <div className="stat-box" key={it.label}>
              <label>{it.label}</label>
              <p>{Math.round(it.cur)} / {it.goal || '—'} {it.unit}</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${safeDiv(it.cur, it.goal)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
        <div className="card" onClick={() => onNavigate('foodlog')}>
          <h3>Registrar mi comida</h3>
          <p>Anota lo que comiste para mantener el seguimiento.</p>
          <button className="btn-card">Abrir registro</button>
        </div>
        <div className="card" onClick={() => onNavigate('progress')}>
          <h3>Mi progreso</h3>
          <p>Mira tu evolución y los días con más adherencia.</p>
          <button className="btn-card">Ver progreso</button>
        </div>
        <div className="card" onClick={() => onNavigate('liveclasses')}>
          <h3>Clases disponibles</h3>
          <p>Reserva o únete a tus clases en vivo.</p>
          <button className="btn-card">Ver clases</button>
        </div>
        <div className="card" onClick={() => onNavigate('training')}>
          <h3>Mi entrenamiento</h3>
          <p>Tu rutina del día con sustituciones asistidas.</p>
          <button className="btn-card">Abrir rutina</button>
        </div>
      </div>
    </div>
  );
}
