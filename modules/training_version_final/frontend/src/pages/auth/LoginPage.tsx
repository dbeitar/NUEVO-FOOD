import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { setSession, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) {
    navigate(user.role === 'ATHLETE' ? '/athlete' : '/coach', { replace: true });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      const dest = ['COACH', 'ADMIN', 'SUPER_ADMIN'].includes(data.user.role) ? '/coach' : '/athlete';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const ex = err as { response?: { data?: { message?: string } } };
      setError(ex.response?.data?.message || 'Error de login');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '3rem auto' }}>
      <h1>Entrenadores D28D</h1>
      <p className="muted">Módulo independiente · acceso directo o SSO shell</p>
      <form onSubmit={onSubmit}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label style={{ display: 'block', marginTop: '1rem' }}>Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        <button type="submit" className="btn" style={{ marginTop: '1rem', width: '100%' }}>Entrar</button>
      </form>
    </div>
  );
}
