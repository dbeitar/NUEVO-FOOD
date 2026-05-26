import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ShellSsoPage from './pages/auth/ShellSsoPage';
import LoginPage from './pages/auth/LoginPage';
import CoachDashboard from './pages/coach/CoachDashboard';
import CoachPlanning from './pages/coach/CoachPlanning';
import CoachGallery from './pages/coach/CoachGallery';
import CoachUsers from './pages/coach/CoachUsers';
import CoachVigencias from './pages/coach/CoachVigencias';
import CoachProgress from './pages/coach/CoachProgress';
import AthleteDashboard from './pages/athlete/AthleteDashboard';
import WorkoutPage from './pages/athlete/WorkoutPage';

function RequireAuth({ children, coach }: { children: ReactNode; coach?: boolean }) {
  const { user, isCoach } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (coach === true && !isCoach) return <Navigate to="/athlete" replace />;
  if (coach === false && isCoach) return <Navigate to="/coach" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/shell-sso" element={<ShellSsoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/coach" element={<RequireAuth coach><Layout mode="coach" /></RequireAuth>}>
          <Route index element={<CoachDashboard />} />
          <Route path="planning" element={<CoachPlanning />} />
          <Route path="gallery" element={<CoachGallery />} />
          <Route path="users" element={<CoachUsers />} />
          <Route path="vigencias" element={<CoachVigencias />} />
          <Route path="progress/:id" element={<CoachProgress />} />
        </Route>

        <Route path="/athlete" element={<RequireAuth coach={false}><Layout mode="athlete" /></RequireAuth>}>
          <Route index element={<AthleteDashboard />} />
          <Route path="workout" element={<WorkoutPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
