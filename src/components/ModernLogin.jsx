import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from './AuthLayout';

export default function ModernLogin({ onSwitchToRegister, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    try {
      const qsEmail = new URLSearchParams(window.location.search).get('email');
      const remembered = localStorage.getItem('rememberedEmail');
      const prefill = qsEmail || remembered || '';
      if (prefill) setEmail(prefill);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      try {
        localStorage.setItem('rememberedEmail', email);
      } catch {}
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Iniciar Sesión" subtitle="Bienvenido a Food Plan">
      {error ? (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12H8m8 0l-4 4m4-4l-4-4M4 6h16v12H4z" />
              </svg>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 px-4 py-2 pl-10 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-1">Contraseña</label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-stone-600 hover:text-stone-900 underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5s-3 1.343-3 3 1.343 3 3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.4 15a7.97 7.97 0 00-14.8 0M4 19h16" />
              </svg>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-300 bg-white text-stone-800 placeholder-slate-400 px-4 py-2 pl-10 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 outline-none transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-lime-500 hover:bg-lime-400 text-black font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
      </form>
      <div className="mt-6 text-center text-sm text-stone-600">
        ¿No tienes cuenta?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="underline hover:text-stone-900"
        >
          Regístrate
        </button>
      </div>
    </AuthLayout>
  );
}
