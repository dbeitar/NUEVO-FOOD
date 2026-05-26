import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ShellSsoPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Token SSO no recibido');
      return;
    }
    (async () => {
      try {
        const { data } = await api.post('/auth/shell-exchange', { token });
        setSession(
          { accessToken: data.accessToken, refreshToken: data.refreshToken },
          data.user,
        );
        if (data.branding) {
          localStorage.setItem('shellBranding', JSON.stringify(data.branding));
          const b = data.branding as Record<string, string>;
          if (b.primary_color) document.documentElement.style.setProperty('--brand-primary', b.primary_color);
          if (b.secondary_color) document.documentElement.style.setProperty('--brand-secondary', b.secondary_color);
        }
        const dest = data.destinationView || '/athlete';
        navigate(dest.startsWith('/') ? dest : `/${dest}`, { replace: true });
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e.response?.data?.message || e.message || 'Error SSO');
      }
    })();
  }, [params, navigate, setSession]);

  return (
    <div className="card" style={{ maxWidth: 420, margin: '4rem auto', textAlign: 'center' }}>
      <h1>Conectando con D28D…</h1>
      {error ? (
        <>
          <p style={{ color: '#f87171' }}>{error}</p>
          <a href="/login">Ir a login</a>
        </>
      ) : (
        <p className="muted">Validando sesión única del shell…</p>
      )}
    </div>
  );
}
