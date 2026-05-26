import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import FoodPlanShell from './food-plan/FoodPlanShell.jsx'
import TrainingShell from './training-module/TrainingShell.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { I18nProvider } from './context/I18nContext.jsx'
import { FrontendConfigProvider } from './context/FrontendConfigContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const onFoodPlanPath = pathname.startsWith('/food-plan');
const onTrainingModulePath = pathname.startsWith('/training-module');

const shellTree = (
  <I18nProvider>
    <FrontendConfigProvider>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </FrontendConfigProvider>
  </I18nProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {onFoodPlanPath ? (
      <FoodPlanShell />
    ) : onTrainingModulePath ? (
      <TrainingShell />
    ) : (
      <BrowserRouter>{shellTree}</BrowserRouter>
    )}
  </React.StrictMode>,
)
