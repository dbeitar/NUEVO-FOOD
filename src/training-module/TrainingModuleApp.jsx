import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../context/useI18n';
import PanelAdminSection from '../components/dashboard/PanelAdminSection';
import TrainingModule from '../components/TrainingModule';
import AdminTrainingManager from '../components/AdminTrainingManager';
import AdminTrainingGallery from '../components/AdminTrainingGallery';
import AdminUsers from '../components/AdminUsers';
import D28dRoutinesMaster from '../components/admin/D28dRoutinesMaster';
import TrainingExpertProgress from './TrainingExpertProgress';

const COACH_CARDS = [
  { id: 'training', view: '/athlete' },
  { id: 'coachroutines', view: '/coach/routines' },
  { id: 'admintraining', view: '/coach/planning' },
  { id: 'admingallery', view: '/coach/gallery' },
  { id: 'adminusers', view: '/coach/users' },
  { id: 'progress', view: '/coach/progress' },
];

function rolesOf(user) {
  return Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol].filter(Boolean);
}

function hasAnyRoleFactory(roles) {
  return (list) => list.some((r) => roles.includes(r));
}

function coachCardsFilter(hasAnyRole) {
  return COACH_CARDS.filter((c) => {
    if (c.id === 'coachroutines' || c.id === 'admintraining' || c.id === 'adminusers' || c.id === 'progress') {
      return hasAnyRole(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador', 'super_admin', 'admin_marca', 'admin_gimnasio']);
    }
    if (c.id === 'admingallery') {
      return hasAnyRole(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador', 'super_admin', 'admin_marca', 'admin_gimnasio']);
    }
    return true;
  });
}

function TrainingCoachHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const roles = rolesOf(user);
  const hasAnyRole = hasAnyRoleFactory(roles);
  const cards = coachCardsFilter(hasAnyRole).map((c) => ({
    ...c,
    when: undefined,
  }));

  return (
    <PanelAdminSection
      panelId="training"
      backLabelKey="training.back_d28d"
      onBack={() => { window.location.href = '/'; }}
      hasAnyRole={hasAnyRole}
      onNavigate={(view) => navigate(view.startsWith('/') ? view : `/${view}`)}
      cards={cards}
    />
  );
}

function ModuleChrome({ children, title }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center gap-3 mb-4 px-2">
        <button type="button" className="btn-secondary text-sm" onClick={() => navigate('/coach')}>
          {t('training.back_panel', '← Capacitación')}
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={() => { window.location.href = '/'; }}>
          {t('training.back_d28d', '← D28D')}
        </button>
        {title && <h2 className="d28d-page-title text-lg">{title}</h2>}
      </div>
      {children}
    </div>
  );
}

export default function TrainingModuleApp() {
  const { user, loading } = useAuth();
  const roles = rolesOf(user);
  const coachMode = roles.some((r) => [
    'entrenador', 'nutricionista', 'admin_training', 'admin_entrenador',
    'admin_marca', 'admin_gimnasio', 'super_admin',
  ].includes(r));

  if (loading) {
    return <div className="loading p-8">Cargando módulo Entrenadores…</div>;
  }

  if (!user) {
    return <Navigate to="/shell-sso" replace />;
  }

  return (
    <div className="training-module-root min-h-screen bg-stone-950 text-stone-100">
      <Routes>
        <Route path="/" element={<Navigate to={coachMode ? '/coach' : '/athlete'} replace />} />
        <Route path="/coach" element={<TrainingCoachHome />} />
        <Route
          path="/coach/planning"
          element={(
            <ModuleChrome title="Planificación">
              <AdminTrainingManager onBack={() => window.history.back()} />
            </ModuleChrome>
          )}
        />
        <Route
          path="/coach/routines"
          element={(
            <ModuleChrome title="Plantillas">
              <D28dRoutinesMaster variant="coach" readOnly={false} onBack={() => window.history.back()} />
            </ModuleChrome>
          )}
        />
        <Route
          path="/coach/gallery"
          element={(
            <ModuleChrome title="Galería">
              <AdminTrainingGallery />
            </ModuleChrome>
          )}
        />
        <Route
          path="/coach/users"
          element={(
            <ModuleChrome title="Usuarios">
              <AdminUsers />
            </ModuleChrome>
          )}
        />
        <Route
          path="/coach/progress"
          element={(
            <TrainingExpertProgress onBack={() => window.history.back()} />
          )}
        />
        <Route
          path="/athlete"
          element={(
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <button type="button" className="btn-secondary text-sm" onClick={() => { window.location.href = '/'; }}>
                  ← D28D
                </button>
                {coachMode && (
                  <button type="button" className="btn-secondary text-sm" onClick={() => window.location.href = '/training-module/coach'}>
                    Panel coach
                  </button>
                )}
              </div>
              <TrainingModule />
            </div>
          )}
        />
        <Route path="*" element={<Navigate to={coachMode ? '/coach' : '/athlete'} replace />} />
      </Routes>
    </div>
  );
}
