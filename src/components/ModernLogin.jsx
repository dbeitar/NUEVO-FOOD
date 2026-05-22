import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import AuthLayout from './AuthLayout';
import { useI18n } from '../context/useI18n';
import { PUBLIC_BRAND_NAME } from '../utils/branding';

export default function ModernLogin({ onSwitchToRegister, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    try {
      const qsEmail = new URLSearchParams(window.location.search).get('email');
      const remembered = localStorage.getItem('rememberedEmail');
      const fromRegister = localStorage.getItem('prefillEmail');
      const prefill = qsEmail || remembered || fromRegister || '';
      if (prefill) {
        setEmail(prefill);
        if (fromRegister) localStorage.removeItem('prefillEmail');
      }
    } catch (err) {
      console.warn('Failed to prefill modern login email', err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      try {
        localStorage.setItem('rememberedEmail', email);
      } catch (err) {
        console.warn('Failed to persist rememberedEmail', err);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.login', 'Iniciar Sesión')} subtitle={`${t('auth.welcome', 'Bienvenido a')} ${PUBLIC_BRAND_NAME}`}>
      {error ? (
        <div className="error-message">{t('auth.login_error', 'Error en el login')}: {error}</div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="email" className="label">{t('auth.email', 'Correo Electrónico')}</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder', 'tu@email.com')}
              className="input"
            />
          </div>
          <div className="form-group">
            <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
              <label htmlFor="password" className="label" style={{ marginBottom: 0 }}>{t('auth.password', 'Contraseña')}</label>
              <button type="button" onClick={onForgotPassword} className="link-button" style={{ fontSize: '0.75rem' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border-2 border-black/25 border-t-black animate-spin"
                />
                <span>{t('auth.logging_in', 'Iniciando sesión...')}</span>
              </>
            ) : (
              <span>{t('auth.login', 'Iniciar Sesión')}</span>
            )}
          </button>
      </form>
      <div className="mt-6 text-center text-sm" style={{ color: 'var(--d28d-muted)' }}>
        {t('auth.no_account', '¿No tienes cuenta?')}{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="link-button"
        >
          {t('auth.register_free', 'Regístrate gratis')}
        </button>
      </div>
    </AuthLayout>
  );
}
