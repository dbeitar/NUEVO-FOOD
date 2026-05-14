// Panel unificado de Clases en Vivo con dos tabs:
//   - Programar: vista admin (crea/edita plantillas y reuniones).
//   - Calendario: vista usuario (se inscribe y entra al Zoom desde aquí).
// Para usuario final sin permiso de programar, solo se muestra el tab Calendario.

import { useState } from 'react';
import AdminLiveClasses from '../AdminLiveClasses';
import LiveClasses from '../LiveClasses';

const TABS = {
  PROGRAM: 'program',
  CALENDAR: 'calendar',
};

export default function LiveClassesPanel({ canProgram = false, programId = null, onBack = null }) {
  const [tab, setTab] = useState(canProgram ? TABS.PROGRAM : TABS.CALENDAR);

  return (
    <div className="dashboard-main-view">
      <header
        className="dashboard-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
      >
        <div>
          <h2>Clases en Vivo</h2>
          <p style={{ color: '#475569', margin: 0 }}>
            {canProgram
              ? 'Programa las plantillas de clases o agéndate desde el calendario.'
              : 'Agéndate en una clase y entra al Zoom desde el calendario.'}
          </p>
        </div>
        {onBack && (
          <button className="btn-secondary" onClick={onBack} aria-label="Volver">
            ← Volver
          </button>
        )}
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Vistas de Clases en Vivo"
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1rem',
        }}
      >
        {canProgram && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === TABS.PROGRAM}
            onClick={() => setTab(TABS.PROGRAM)}
            style={tabStyle(tab === TABS.PROGRAM)}
          >
            Programar
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={tab === TABS.CALENDAR}
          onClick={() => setTab(TABS.CALENDAR)}
          style={tabStyle(tab === TABS.CALENDAR)}
        >
          Calendario
        </button>
      </div>

      {/* Contenido */}
      <div role="tabpanel">
        {tab === TABS.PROGRAM && canProgram && <AdminLiveClasses />}
        {tab === TABS.CALENDAR && <LiveClasses programId={programId} />}
      </div>
    </div>
  );
}

function tabStyle(active) {
  return {
    padding: '0.6rem 1rem',
    border: 'none',
    background: 'transparent',
    color: active ? '#0f172a' : '#64748b',
    borderBottom: active ? '2px solid #0f172a' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: active ? 600 : 500,
  };
}
