import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthProvider } from '../context/AuthContext.jsx';
import { I18nProvider } from '../context/I18nContext.jsx';
import { FrontendConfigProvider } from '../context/FrontendConfigContext.jsx';
import ErrorBoundary from '../components/ErrorBoundary';
import TrainingModuleApp from './TrainingModuleApp';

function TrainingShellSsoGate() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const handoff = params.get('token') || sessionStorage.getItem('d28d_training_handoff');
    sessionStorage.removeItem('d28d_training_handoff');
    const shellToken = localStorage.getItem('d28d_token') || localStorage.getItem('token');

    if (!handoff && !shellToken) {
      setError('Token SSO no recibido. Vuelve al inicio D28D y abre Entrenadores de nuevo.');
      return;
    }

    (async () => {
      try {
        if (shellToken) localStorage.setItem('d28d_token', shellToken);
        localStorage.setItem('d28d_shell', 'true');
        localStorage.setItem('d28d_shell_label', import.meta.env.VITE_BRAND_NAME || 'D28D Gimnasio Virtual');
        if (shellToken) localStorage.setItem('token', shellToken);

        let payload = null;
        if (handoff) {
          try {
            const { data } = await api.post(
              '/training-module/exchange',
              { token: handoff },
              { skipShellAuth: true, skipAuthClearOn401: true },
            );
            payload = data?.data || data;
          } catch (handoffErr) {
            if (handoffErr.response?.status !== 401 || !shellToken) throw handoffErr;
          }
        }
        if (!payload?.user && shellToken) {
          const { data } = await api.post(
            '/training-module/exchange-session',
            {},
            { headers: { Authorization: `Bearer ${shellToken}` }, skipShellAuth: true },
          );
          payload = data?.data || data;
        }
        if (!payload?.user) {
          setError('No se recibió sesión del módulo Entrenadores.');
          return;
        }

        sessionStorage.setItem('training_module_session', JSON.stringify({
          user: payload.user,
          branding: payload.branding,
          coach_mode: payload.coach_mode,
          at: Date.now(),
        }));
        if (payload.branding) {
          localStorage.setItem('shellTrainingBranding', JSON.stringify(payload.branding));
          const b = payload.branding;
          if (b.primary_color) document.documentElement.style.setProperty('--brand-primary', b.primary_color);
          if (b.secondary_color) document.documentElement.style.setProperty('--brand-secondary', b.secondary_color);
        }

        const urlDest = params.get('dest');
        const storedDest = sessionStorage.getItem('d28d_training_dest');
        sessionStorage.removeItem('d28d_training_dest');
        const dest = urlDest
          || storedDest
          || payload.destinationView
          || (payload.coach_mode ? '/coach' : '/athlete');
        navigate(dest.startsWith('/') ? dest : `/${dest}`, { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Error conectando módulo Entrenadores');
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-stone-950 text-stone-100">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-lime-400 mb-2">Módulo Entrenadores</h1>
        {error ? (
          <>
            <p className="text-red-400 mb-4">{error}</p>
            <a href="/" className="text-lime-400 underline">Volver a D28D</a>
          </>
        ) : (
          <p className="text-stone-400">Conectando tu sesión…</p>
        )}
      </div>
    </div>
  );
}

export default function TrainingShell() {
  useEffect(() => {
    localStorage.setItem('d28d_shell', 'true');
  }, []);

  return (
    <I18nProvider>
      <FrontendConfigProvider>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter basename="/training-module">
              <Routes>
                <Route path="/shell-sso" element={<TrainingShellSsoGate />} />
                <Route path="/*" element={<TrainingModuleApp />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </FrontendConfigProvider>
    </I18nProvider>
  );
}
