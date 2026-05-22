import {
  BLOCK_LABELS,
  EQUIPMENT_OPTIONS,
  VARIANT_LEVELS,
} from '../../shared/routineTemplateConstants';

function ConfigSummary({ tipo, config }) {
  const entries = Object.entries(config || {}).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return null;
  return (
    <p className="text-xs text-slate-500 mt-1">
      {entries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </p>
  );
}

export default function RoutineTemplateViewer({ routine, sessionAdjustments, compact = false }) {
  if (!routine) {
    return <p className="text-sm text-slate-500">Sin plantilla seleccionada.</p>;
  }

  const equipLabels = (routine.equipamiento || [])
    .map((id) => EQUIPMENT_OPTIONS.find((e) => e.id === id)?.label || id)
    .join(', ');

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="text-sm text-stone-700 space-y-1">
        <p><strong>{routine.nombre}</strong> · {routine.categoria}{routine.subcategoria ? ` / ${routine.subcategoria}` : ''}</p>
        <p className="text-xs text-stone-500">
          {routine.objetivo && <>Objetivo: {routine.objetivo} · </>}
          Nivel: {routine.nivel || '—'} · Duración: {routine.duracion || '—'}
          {routine.version ? ` · v${routine.version}` : ''}
        </p>
        {routine.descripcion && <p className="text-xs">{routine.descripcion}</p>}
        {equipLabels && <p className="text-xs"><span className="font-semibold">Equipo:</span> {equipLabels}</p>}
        {routine.notas_tecnicas && (
          <p className="text-xs bg-amber-50 border border-amber-100 rounded-lg p-2">
            <span className="font-semibold">Notas técnicas:</span> {routine.notas_tecnicas}
          </p>
        )}
        {sessionAdjustments && (
          <p className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2">
            <span className="font-semibold">Ajustes de esta sesión:</span> {sessionAdjustments}
          </p>
        )}
      </div>

      {(routine.blocks || []).map((block) => (
        <div key={block.id || block.orden} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="font-semibold text-sm text-stone-900">
            {BLOCK_LABELS[block.tipo] || block.tipo}
            {block.nombre ? ` — ${block.nombre}` : ''}
          </div>
          {(block.tecnica || block.duracion || block.descanso) && (
            <p className="text-xs text-slate-600 mt-1">
              {[block.tecnica && `Técnica: ${block.tecnica}`, block.duracion && `Duración: ${block.duracion}`, block.descanso && `Descanso: ${block.descanso}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <ConfigSummary tipo={block.tipo} config={block.config} />
          {block.observaciones && <p className="text-xs text-slate-500 mt-1">{block.observaciones}</p>}
          <ul className="mt-2 space-y-2">
            {(block.exercises || []).map((ex) => (
              <li key={ex.id || ex.orden} className="text-sm border-l-2 border-lime-400 pl-2">
                <span className="font-medium">{ex.nombre}</span>
                <span className="text-xs text-slate-500 block">
                  {[ex.series && `${ex.series} series`, ex.repeticiones && `${ex.repeticiones} reps`, ex.duracion, ex.descanso && `rest ${ex.descanso}`, ex.tempo && `tempo ${ex.tempo}`, ex.intensidad && `int. ${ex.intensidad}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {ex.observaciones && <span className="text-xs text-slate-500 block">{ex.observaciones}</span>}
                {ex.variantes && VARIANT_LEVELS.some((v) => ex.variantes[v.id]?.repeticiones || ex.variantes[v.id]?.series) && (
                  <div className="text-xs text-slate-500 mt-1 grid gap-0.5">
                    {VARIANT_LEVELS.map((v) => {
                      const slice = ex.variantes[v.id];
                      if (!slice?.repeticiones && !slice?.series) return null;
                      return (
                        <span key={v.id}>
                          {v.label}: {[slice.series && `${slice.series}s`, slice.repeticiones && `${slice.repeticiones}r`].filter(Boolean).join(' ')}
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
