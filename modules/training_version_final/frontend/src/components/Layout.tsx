import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ mode }: { mode: 'coach' | 'athlete' }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = mode === 'coach'
    ? [
        { to: '/coach', label: 'Inicio' },
        { to: '/coach/planning', label: 'Planificación' },
        { to: '/coach/gallery', label: 'Galería' },
        { to: '/coach/users', label: 'Atletas' },
        { to: '/coach/vigencias', label: 'Vigencias' },
      ]
    : [
        { to: '/athlete', label: 'Inicio' },
        { to: '/athlete/workout', label: 'Entreno' },
      ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <strong>Entrenadores</strong>
          <span className="muted"> · {user?.firstName} {user?.lastName}</span>
        </div>
        <button type="button" className="btn-ghost" onClick={logout}>Salir</button>
      </header>
      <nav className="app-nav">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className={loc.pathname === n.to ? 'active' : ''}>{n.label}</Link>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
