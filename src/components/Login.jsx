import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    try {
      const qsEmail = new URLSearchParams(window.location.search).get('email');
      const remembered = localStorage.getItem('rememberedEmail');
      const prefill = localStorage.getItem('prefillEmail');
      const candidate = remembered || qsEmail || prefill || '';
      if (candidate) setEmail(candidate);
      if (remembered) setRemember(true);
      if (prefill) localStorage.removeItem('prefillEmail');
    } catch (err) {
      console.warn('Failed to prefill login email', err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      try {
        if (remember) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
      } catch (err) {
        console.warn('Failed to persist rememberedEmail', err);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || t('auth.login_error', 'Error en el login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box" style={{ maxWidth: 420 }}>
        <div className="text-center mb-6">
          <div className="text-4xl">🍽️</div>
          <h2 className="mt-4 text-3xl font-extrabold text-stone-900 tracking-tight">
            {t('auth.login', 'Iniciar Sesión')}
          </h2>
          <p className="auth-subtitle">
            {t('auth.welcome', 'Bienvenido a')} <span className="font-semibold text-lime-500">Food Plan</span>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              {t('auth.email', 'Correo Electrónico')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder={t('auth.email_placeholder', 'tu@email.com')}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              {t('auth.password', 'Contraseña')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 text-lime-400 border-slate-300 rounded focus:ring-lime-400"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-stone-700">
              {t('auth.remember_me', 'Recordar mi usuario')}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? t('auth.logging_in', 'Iniciando sesión...') : t('auth.login', 'Iniciar Sesión')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-stone-600">
                {t('auth.no_account', '¿No tienes cuenta?')}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (onSwitchToRegister) onSwitchToRegister();
            }}
            className="w-full btn-secondary"
          >
            {t('auth.register_free', 'Regístrate gratis')}
          </button>
        </div>
      </div>
    </div>
  );
}
