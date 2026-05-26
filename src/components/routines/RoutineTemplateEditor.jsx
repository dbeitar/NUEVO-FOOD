import { useState } from 'react';
import {
  BLOCK_TYPES,
  BLOCK_LABELS,
  BLOCK_CONFIG_FIELDS,
  NIVEL_OPTIONS,
  OBJETIVO_OPTIONS,
  EQUIPMENT_OPTIONS,
  VARIANT_LEVELS,
  emptyBlock,
  emptyExercise,
} from '../../shared/routineTemplateConstants';

function BlockConfigEditor({ tipo, config, onChange }) {
  const fields = BLOCK_CONFIG_FIELDS[tipo] || [];
  if (!fields.length) return null;
  return (
    <div className="grid sm:grid-cols-3 gap-2 mt-2">
      {fields.map((f) => (
        <label key={f.key} className="block text-xs">
          <span className="font-semibold">{f.label}</span>
          <input
            className="input w-full"
            type={f.type === 'number' ? 'number' : 'text'}
            value={config?.[f.key] ?? ''}
            onChange={(e) => onChange({
              ...config,
              [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
            })}
          />
        </label>
      ))}
    </div>
  );
}

export default function RoutineTemplateEditor({
  form,
  setForm,
  categoryOptions = [],
  readOnly = false,
}) {
  const [variantTab, setVariantTab] = useState({});

  const updateBlock = (idx, patch) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      blocks[idx] = { ...blocks[idx], ...patch };
      return { ...prev, blocks };
    });
  };

  const updateExercise = (bIdx, eIdx, patch) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const exercises = [...(blocks[bIdx].exercises || [])];
      exercises[eIdx] = { ...exercises[eIdx], ...patch };
      blocks[bIdx] = { ...blocks[bIdx], exercises };
      return { ...prev, blocks };
    });
  };

  const updateVariant = (bIdx, eIdx, level, field, value) => {
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const ex = { ...(blocks[bIdx].exercises[eIdx] || {}) };
      const variantes = { ...(ex.variantes || {}) };
      variantes[level] = { ...(variantes[level] || {}), [field]: value };
      ex.variantes = variantes;
      blocks[bIdx].exercises[eIdx] = ex;
      return { ...prev, blocks };
    });
  };

  const toggleEquipment = (id) => {
    setForm((prev) => {
      const list = new Set(prev.equipamiento || []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      return { ...prev, equipamiento: [...list] };
    });
  };

  const disabled = readOnly;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="font-bold text-stone-900">Información general</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Nombre</span>
            <input className="input w-full" disabled={disabled} value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Categoría</span>
            <select className="input w-full" disabled={disabled} value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Subcategoría</span>
            <input className="input w-full" disabled={disabled} value={form.subcategoria} onChange={(e) => setForm((p) => ({ ...p, subcategoria: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Objetivo</span>
            <select className="input w-full" disabled={disabled} value={form.objetivo} onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}>
              {OBJETIVO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Nivel</span>
            <select className="input w-full" disabled={disabled} value={form.nivel} onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))}>
              {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Duración</span>
            <input className="input w-full" disabled={disabled} placeholder="45 min" value={form.duracion} onChange={(e) => setForm((p) => ({ ...p, duracion: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Estado</span>
            <select className="input w-full" disabled={disabled} value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>
              <option value="activa">Activa</option>
              <option value="archivada">Archivada</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">Descripción</span>
          <textarea className="input w-full min-h-[72px]" disabled={disabled} value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Notas técnicas (entrenador)</span>
          <textarea className="input w-full min-h-[72px]" disabled={disabled} value={form.notas_tecnicas} onChange={(e) => setForm((p) => ({ ...p, notas_tecnicas: e.target.value }))} />
        </label>
        <div>
          <span className="text-sm font-semibold block mb-2">Equipamiento</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <label key={eq.id} className="inline-flex items-center gap-1 text-sm border rounded-full px-3 py-1 border-slate-200">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={(form.equipamiento || []).includes(eq.id)}
                  onChange={() => toggleEquipment(eq.id)}
                />
                {eq.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900">Bloques</h3>
          {!disabled && (
            <button type="button" className="btn-secondary text-sm" onClick={() => setForm((p) => ({ ...p, blocks: [...p.blocks, emptyBlock(p.blocks.length)] }))}>
              + Bloque
            </button>
          )}
        </div>

        {form.blocks.map((block, bIdx) => (
          <div key={bIdx} className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <label className="block">
                <span className="text-xs font-semibold">Tipo</span>
                <select
                  className="input w-full"
                  disabled={disabled}
                  value={block.tipo}
                  onChange={(e) => updateBlock(bIdx, { tipo: e.target.value, config: {} })}
                >
                  {BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-1 lg:col-span-3">
                <span className="text-xs font-semibold">Nombre bloque</span>
                <input className="input w-full" disabled={disabled} value={block.nombre || ''} onChange={(e) => updateBlock(bIdx, { nombre: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold">Técnica</span>
                <input className="input w-full" disabled={disabled} value={block.tecnica || ''} onChange={(e) => updateBlock(bIdx, { tecnica: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold">Duración</span>
                <input className="input w-full" disabled={disabled} value={block.duracion || ''} onChange={(e) => updateBlock(bIdx, { duracion: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold">Descanso</span>
                <input className="input w-full" disabled={disabled} value={block.descanso || ''} onChange={(e) => updateBlock(bIdx, { descanso: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold">Observaciones bloque</span>
                <input className="input w-full" disabled={disabled} value={block.observaciones || ''} onChange={(e) => updateBlock(bIdx, { observaciones: e.target.value })} />
              </label>
            </div>
            {!disabled && (
              <BlockConfigEditor
                tipo={block.tipo}
                config={block.config}
                onChange={(config) => updateBlock(bIdx, { config })}
              />
            )}

            <div className="space-y-3">
              {(block.exercises || []).map((ex, eIdx) => {
                const vKey = `${bIdx}-${eIdx}`;
                const activeVariant = variantTab[vKey] || 'principiante';
                return (
                  <div key={eIdx} className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <input className="input sm:col-span-2" disabled={disabled} placeholder="Ejercicio" value={ex.nombre} onChange={(e) => updateExercise(bIdx, eIdx, { nombre: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Series" value={ex.series || ''} onChange={(e) => updateExercise(bIdx, eIdx, { series: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Repeticiones" value={ex.repeticiones || ''} onChange={(e) => updateExercise(bIdx, eIdx, { repeticiones: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Tiempo" value={ex.duracion || ''} onChange={(e) => updateExercise(bIdx, eIdx, { duracion: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Descanso" value={ex.descanso || ''} onChange={(e) => updateExercise(bIdx, eIdx, { descanso: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Tempo" value={ex.tempo || ''} onChange={(e) => updateExercise(bIdx, eIdx, { tempo: e.target.value })} />
                      <input className="input" disabled={disabled} placeholder="Intensidad" value={ex.intensidad || ''} onChange={(e) => updateExercise(bIdx, eIdx, { intensidad: e.target.value })} />
                      <input className="input sm:col-span-2" disabled={disabled} placeholder="Video URL" value={ex.video_url || ''} onChange={(e) => updateExercise(bIdx, eIdx, { video_url: e.target.value })} />
                      <input className="input sm:col-span-2" disabled={disabled} placeholder="Imagen URL" value={ex.imagen_url || ''} onChange={(e) => updateExercise(bIdx, eIdx, { imagen_url: e.target.value })} />
                      <input className="input sm:col-span-2 lg:col-span-4" disabled={disabled} placeholder="Observaciones" value={ex.observaciones || ''} onChange={(e) => updateExercise(bIdx, eIdx, { observaciones: e.target.value })} />
                    </div>
                    <div>
                      <div className="flex gap-1 mb-2">
                        {VARIANT_LEVELS.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            className={`text-xs px-2 py-1 rounded-full ${activeVariant === v.id ? 'bg-lime-600 text-white' : 'bg-slate-100'}`}
                            onClick={() => setVariantTab((t) => ({ ...t, [vKey]: v.id }))}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { field: 'series', label: 'Series' },
                          { field: 'repeticiones', label: 'Repeticiones' },
                          { field: 'duracion', label: 'Tiempo' },
                          { field: 'descanso', label: 'Descanso' },
                          { field: 'tempo', label: 'Tempo' },
                          { field: 'intensidad', label: 'Intensidad' },
                        ].map(({ field, label }) => (
                          <input
                            key={field}
                            className="input text-xs"
                            disabled={disabled}
                            placeholder={label}
                            value={ex.variantes?.[activeVariant]?.[field] || ''}
                            onChange={(e) => updateVariant(bIdx, eIdx, activeVariant, field, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                    {!disabled && (block.exercises.length > 1) && (
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => updateBlock(bIdx, { exercises: block.exercises.filter((_, i) => i !== eIdx) })}
                      >
                        Quitar ejercicio
                      </button>
                    )}
                  </div>
                );
              })}
              {!disabled && (
                <button type="button" className="btn-secondary text-sm" onClick={() => updateBlock(bIdx, { exercises: [...(block.exercises || []), emptyExercise(block.exercises.length)] })}>
                  + Ejercicio
                </button>
              )}
            </div>
            {!disabled && form.blocks.length > 1 && (
              <button type="button" className="text-xs text-red-600" onClick={() => setForm((p) => ({ ...p, blocks: p.blocks.filter((_, i) => i !== bIdx) }))}>
                Eliminar bloque
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
