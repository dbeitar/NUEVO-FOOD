import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { useFeature } from './hooks/useFeature'
import { RootState, AppDispatch } from './store/store'
import { getMe } from './store/authSlice'
import LoginPage from './pages/auth/LoginPage'
import PlanVencidoPage from './pages/auth/PlanVencidoPage'
import RegisterPage from './pages/auth/RegisterPage'
import ShellSsoPage from './pages/auth/ShellSsoPage'
import UserDashboard from './pages/user/Dashboard'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import NutritionPage from './pages/user/NutritionPage'
import ChatbotPage from './pages/user/ChatbotPage'
import ProfilePage from './pages/user/ProfilePage'
import MyPlanPage from './pages/user/MyPlanPage'
import MeasurementsPage from './pages/user/MeasurementsPage'
import DailyReportPage from './pages/user/DailyReportPage'
import RecipesPage from './pages/user/RecipesPage'
import TrainerNotesPage from './pages/user/TrainerNotesPage'
import RecipeManagement from './pages/superadmin/RecipeManagement'
import FoodManagement from './pages/superadmin/FoodManagement'
import NotificationTemplates from './pages/trainer/NotificationTemplates'
import MeasurementReminderConfig from './pages/trainer/MeasurementReminderConfig'
import TrainersPage from './pages/user/TrainersPage'
import GymManagement from './pages/superadmin/GymManagement'
import GymView from './pages/admin/GymView'
import UserManagement from './pages/admin/UserManagement'
import PlanConfig from './pages/superadmin/PlanConfig'
import Layout from './components/Layout'

function isD28dEmbeddedShell() {
  return import.meta.env.VITE_FOOD_EMBEDDED === 'true'
    || (typeof localStorage !== 'undefined' && localStorage.getItem('d28d_shell') === 'true')
}

function PublicAuthRoute({ children }: { children: JSX.Element }) {
  const { accessToken } = useSelector((s: RootState) => s.auth)
  if (isD28dEmbeddedShell() && accessToken) {
    return <Navigate to="/dashboard" replace />
  }
  if (isD28dEmbeddedShell() && !accessToken) {
    window.location.href = '/'
    return null
  }
  return children
}

function PrivateRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, accessToken } = useSelector((s: RootState) => s.auth)
  if (!accessToken || !user) {
    if (isD28dEmbeddedShell()) {
      const shellTok = typeof localStorage !== 'undefined' ? localStorage.getItem('d28d_token') : null
      if (shellTok) {
        window.location.replace(`/food-plan/shell-sso?relaunch=1`)
        return null
      }
      window.location.replace('/')
      return null
    }
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function FeatureRoute({ feature, children }: { feature: string; children: JSX.Element }) {
  const { user } = useSelector((s: RootState) => s.auth)
  const hasAccess = useFeature(feature)
  if (!hasAccess && user?.role === 'USER') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Función no disponible</h2>
        <p className="text-gray-500 text-sm max-w-xs">Esta funcionalidad no está incluida en tu plan actual. Contacta a tu administrador para actualizarlo.</p>
      </div>
    )
  }
  return children
}

function RoleRedirect() {
  const { user } = useSelector((s: RootState) => s.auth)
  if (!user) return <Navigate to="/login" replace />
  const map: Record<string, string> = {
    USER: '/dashboard', TRAINER: '/trainer', ADMIN: '/admin', SUPER_ADMIN: '/superadmin',
  }
  return <Navigate to={map[user.role] || '/dashboard'} replace />
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { accessToken } = useSelector((s: RootState) => s.auth)

  // Refresh subscription/features on app load
  useEffect(() => {
    if (accessToken) dispatch(getMe())
  }, [])

  const routes = (
      <Routes>
        <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
        <Route path="/plan-vencido" element={<PlanVencidoPage />} />
        <Route path="/register" element={<PublicAuthRoute><RegisterPage /></PublicAuthRoute>} />
        <Route path="/shell-sso" element={<ShellSsoPage />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* User routes */}
        <Route path="/dashboard" element={<PrivateRoute roles={['USER']}><Layout><UserDashboard /></Layout></PrivateRoute>} />
        <Route path="/nutrition" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="food_log"><NutritionPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/chatbot" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="chatbot"><ChatbotPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/trainers" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="choose_trainer"><TrainersPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute roles={['USER','TRAINER','ADMIN','SUPER_ADMIN']}><Layout><ProfilePage /></Layout></PrivateRoute>} />
        <Route path="/my-plan" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="personal_nutrition"><MyPlanPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/measurements" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="measurements"><MeasurementsPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/daily-report" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="daily_report"><DailyReportPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/recipes" element={<PrivateRoute roles={['USER']}><Layout><FeatureRoute feature="recipes"><RecipesPage /></FeatureRoute></Layout></PrivateRoute>} />
        <Route path="/trainer-notes" element={<PrivateRoute roles={['USER']}><Layout><TrainerNotesPage /></Layout></PrivateRoute>} />

        {/* Trainer routes */}
        <Route path="/trainer" element={<PrivateRoute roles={['TRAINER']}><Layout><TrainerDashboard /></Layout></PrivateRoute>} />
        <Route path="/trainer/notifications" element={<PrivateRoute roles={['TRAINER']}><Layout><NotificationTemplates /></Layout></PrivateRoute>} />
        <Route path="/trainer/measurement-reminder" element={<PrivateRoute roles={['TRAINER']}><Layout><MeasurementReminderConfig /></Layout></PrivateRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<PrivateRoute roles={['ADMIN','SUPER_ADMIN']}><Layout><AdminDashboard /></Layout></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute roles={['ADMIN','SUPER_ADMIN']}><Layout><UserManagement /></Layout></PrivateRoute>} />
        <Route path="/admin/gyms" element={<PrivateRoute roles={['ADMIN','SUPER_ADMIN']}><Layout><GymView /></Layout></PrivateRoute>} />

        {/* Super Admin routes */}
        <Route path="/superadmin" element={<PrivateRoute roles={['SUPER_ADMIN']}><Layout><SuperAdminDashboard /></Layout></PrivateRoute>} />
        <Route path="/superadmin/gyms" element={<PrivateRoute roles={['SUPER_ADMIN']}><Layout><GymManagement /></Layout></PrivateRoute>} />
        <Route path="/superadmin/plans" element={<PrivateRoute roles={['SUPER_ADMIN']}><Layout><PlanConfig /></Layout></PrivateRoute>} />
        <Route path="/superadmin/recipes" element={<PrivateRoute roles={['SUPER_ADMIN']}><Layout><RecipeManagement /></Layout></PrivateRoute>} />
        <Route path="/superadmin/foods" element={<PrivateRoute roles={['SUPER_ADMIN','ADMIN']}><Layout><FoodManagement /></Layout></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )

  const embedded = import.meta.env.VITE_FOOD_EMBEDDED === 'true'
  return embedded ? routes : <BrowserRouter>{routes}</BrowserRouter>
}
