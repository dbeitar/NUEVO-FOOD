import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function ShellSsoPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const returnUrl = params.get('return');
    if (!token) {
      setError('Token SSO no recibido');
      return;
    }
    (async () => {
      try {
        const { data } = await api.post('/auth/shell-exchange', { token });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        if (data.branding) {
          localStorage.setItem('shellBranding', JSON.stringify(data.branding));
          const root = document.documentElement;
          const b = data.branding;
          if (b.primary_color) root.style.setProperty('--brand-primary', b.primary_color);
          if (b.secondary_color) root.style.setProperty('--brand-secondary', b.secondary_color);
        }
        if (returnUrl) {
          try {
            const u = new URL(returnUrl);
            if (u.origin === window.location.origin || u.hostname === 'localhost') {
              window.location.href = returnUrl;
              return;
            }
          } catch { /* external return */ }
        }
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Error SSO');
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">Conectando con D28D…</h1>
        {error ? (
          <>
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/login" className="text-blue-600 underline">Ir a login Food</a>
          </>
        ) : (
          <p className="text-slate-600">Validando sesión única del shell…</p>
        )}
      </div>
    </div>
  );
}
