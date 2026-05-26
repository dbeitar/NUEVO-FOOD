import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import TrainingExpertProgress from '../../training-module/TrainingExpertProgress';

function FoodCoachTrackingPanel() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Ruta exacta solicitada: panel entrenador Food
        const foodDest = '/trainer';
        sessionStorage.setItem('d28d_food_dest', foodDest);
        const returnUrl = `${window.location.origin}/dashboard`;
        const res = await api.get('/food-module/launch', {
          params: { return_url: returnUrl, dest: foodDest, panel: 'trainer' },
        });
        let nextUrl = res.data?.data?.url || '';
        if (!nextUrl) throw new Error('No se recibió URL del módulo Food');
        try {
          const u = new URL(nextUrl, window.location.origin);
          u.searchParams.set('dest', foodDest);
          nextUrl = u.toString();
        } catch { /* noop */ }
        if (active) setUrl(nextUrl);
      } catch (e) {
        const msg = e?.response?.data?.error || e?.message || 'No se pudo abrir Seguimiento Food';
        if (active) setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="card p-6 text-stone-600">Cargando Seguimiento Food…</div>;
  }
  if (error) {
    return (
      <div className="card p-6">
        <h3 className="font-bold text-stone-900 mb-2">Seguimiento Food</h3>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {error}
        </p>
        <p className="text-xs text-stone-500 mt-3">
          Nota: este panel requiere licencia activa del módulo <strong>food</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-200 bg-white">
        <h3 className="font-bold text-stone-900">Seguimiento Food</h3>
        <p className="text-xs text-stone-500">
          Panel del entrenador en Food Plan (
          <a href="https://foodplan.tech/trainer" target="_blank" rel="noreferrer" className="underline">
            foodplan.tech/trainer
          </a>
          ).
        </p>
      </div>
      <iframe
        title="Seguimiento Food"
        src={url}
        className="w-full"
        style={{ height: '80vh', border: 0 }}
        referrerPolicy="no-referrer"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

export default function CoachEcosystemTracking({ onBack = null }) {
  const [tab, setTab] = useState('training');

  const tabs = useMemo(() => ([
    { id: 'training', label: 'Seguimiento Training' },
    { id: 'food', label: 'Seguimiento Food' },
  ]), []);

  return (
    <div className="dashboard-main-view">
      <header className="dashboard-header page-header">
        <div className="flex flex-wrap justify-between gap-3 w-full">
          <div>
            {onBack && (
              <button type="button" className="btn-secondary mb-2" onClick={onBack}>
                ← Volver
              </button>
            )}
            <h1 className="d28d-page-title">Seguimiento</h1>
            <p className="d28d-text-muted subtitle">Dashboard profesional de coach (Training + Food).</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                  tab === t.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'training' && (
        <TrainingExpertProgress onBack={null} />
      )}

      {tab === 'food' && (
        <FoodCoachTrackingPanel />
      )}
    </div>
  );
}

