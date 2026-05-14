// Panel unificado de Clases en Vivo con dos tabs:
//   - Programar: vista admin (crea/edita plantillas y reuniones).
//   - Calendario: vista usuario (se inscribe y entra al Zoom desde aquí).
//
// Filtro por programa:
//   - Usuario final → solo el calendario de su programa asignado
//     (user.program_id o user.module_access.d28d_program). Si no tiene
//     programa asignado, ve todas las clases globales.
//   - Admin → selector de programa visible arriba del calendario.

import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import AdminLiveClasses from '../AdminLiveClasses';
import LiveClasses from '../LiveClasses';

const TABS = {
  PROGRAM: 'program',
  CALENDAR: 'calendar',
};

// Programa asignado al usuario (si lo tiene). Es lectura defensiva: el campo
// puede venir en distintos lados según cómo el coach lo asignó.
function getAssignedProgramId(user) {
  if (!user) return null;
  return (
    user.program_id
    || user.programa_d28d
    || user.module_access?.d28d_program
    || user.module_access?.program
    || null
  );
}

export default function LiveClassesPanel({ user = null, canProgram = false, programId: forcedProgramId = null, onBack = null }) {
  const [tab, setTab] = useState(canProgram ? TABS.PROGRAM : TABS.CALENDAR);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(forcedProgramId || '');

  // Programa fijo para usuario final (no admin).
  const assignedProgram = useMemo(() => getAssignedProgramId(user), [user]);

  // Cargar catálogo de programas para el selector del admin.
  useEffect(() => {
    if (!canProgram) return;
    let active = true;
    (async () => {
      try {
        const r = await api.get('/programs');
        const arr = r.data?.data || r.data || [];
        if (active && Array.isArray(arr)) setPrograms(arr);
      } catch {
        if (active) setPrograms([]);
      }
    })();
    return () => { active = false; };
  }, [canProgram]);

  // El programId real que pasamos al calendario.
  // - Admin: lo que tenga seleccionado en el dropdown (vacío = todos).
  // - Usuario final: si tiene programa asignado, ese; si no, todos.
  const effectiveProgramId = canProgram
    ? (selectedProgram || null)
    : (assignedProgram || forcedProgramId || null);

  const selectedProgramLabel = useMemo(() => {
    if (canProgram) {
      if (!selectedProgram) return 'Todos los programas';
      const p = programs.find((x) => (x.id || x.code || x.slug) === selectedProgram);
      return p?.name || p?.title || p?.nombre || selectedProgram;
    }
    if (!assignedProgram) return null;
    return assignedProgram;
  }, [canProgram, selectedProgram, programs, assignedProgram]);

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
              ? 'Programa plantillas o revisa el calendario y filtra por programa.'
              : assignedProgram
                ? `Calendario de tu programa asignado.`
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

      {/* Filtro por programa visible solo en tab Calendario */}
      {tab === TABS.CALENDAR && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {canProgram ? (
            <>
              <label htmlFor="program-filter" style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                Programa:
              </label>
              <select
                id="program-filter"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="input"
                style={{ padding: '0.4rem 0.6rem', maxWidth: 260 }}
                aria-label="Filtrar calendario por programa"
              >
                <option value="">Todos los programas</option>
                {programs.map((p) => {
                  const id = p.id || p.code || p.slug;
                  const name = p.name || p.title || p.nombre || id;
                  return (
                    <option key={id} value={id}>{name}</option>
                  );
                })}
              </select>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Mostrando: {selectedProgramLabel}
              </span>
            </>
          ) : assignedProgram ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.8rem',
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: '0.85rem',
                color: '#0f172a',
              }}
            >
              <span aria-hidden="true">●</span>
              <span>
                Tu programa: <strong>{selectedProgramLabel}</strong>
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: '0.4rem 0.8rem',
                background: '#fef3c7',
                borderRadius: 8,
                fontSize: '0.85rem',
                color: '#78350f',
              }}
            >
              Aún no tienes un programa asignado. Habla con tu coach para que te asigne uno.
            </div>
          )}
        </div>
      )}

      {/* Contenido */}
      <div role="tabpanel">
        {tab === TABS.PROGRAM && canProgram && <AdminLiveClasses />}
        {tab === TABS.CALENDAR && (
          <LiveClasses key={effectiveProgramId || 'all'} programId={effectiveProgramId} />
        )}
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
