import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import FoodPlanShell from './food-plan/FoodPlanShell.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { I18nProvider } from './context/I18nContext.jsx'
import { FrontendConfigProvider } from './context/FrontendConfigContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

const onFoodPlanPath = typeof window !== 'undefined'
  && window.location.pathname.startsWith('/food-plan');

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
    ) : (
      <BrowserRouter>{shellTree}</BrowserRouter>
    )}
  </React.StrictMode>,
)
