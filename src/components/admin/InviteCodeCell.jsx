import { useState } from 'react';
import { Copy, Pencil, Save, X } from 'lucide-react';

/**
 * Celda de código de invitación: visible, copiable y editable inline.
 */
export default function InviteCodeCell({ value, onSave, readOnly = false, placeholder = 'Sin código' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const display = value?.trim() ? value.trim() : null;

  const copyCode = async () => {
    if (!display) return;
    try {
      await navigator.clipboard.writeText(display);
    } catch {
      /* noop */
    }
  };

  const startEdit = () => {
    setDraft(display || '');
    setLocalError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(display || '');
    setLocalError('');
  };

  const save = async () => {
    setSaving(true);
    setLocalError('');
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (err) {
      const data = err?.response?.data;
      setLocalError(typeof data === 'string' ? data : data?.error || 'No se pudo guardar el código');
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    return (
      <code className="text-xs font-mono bg-stone-100 text-stone-800 px-2 py-1 rounded border border-stone-200">
        {display || placeholder}
      </code>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[200px]">
        <div className="flex items-center gap-1">
          <input
            type="text"
            className="input text-xs font-mono uppercase py-1 flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="GYM-EJEMPLO-001"
            autoFocus
          />
          <button
            type="button"
            className="p-1.5 rounded-lg bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"
            onClick={save}
            disabled={saving || !draft.trim()}
            title="Guardar"
          >
            <Save size={14} />
          </button>
          <button type="button" className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100" onClick={cancelEdit} title="Cancelar">
            <X size={14} />
          </button>
        </div>
        {localError && <span className="text-xs text-red-600">{localError}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <code className="text-xs font-mono bg-lime-50 border border-lime-200 text-lime-900 px-2 py-1 rounded">
        {display || <span className="text-stone-400">{placeholder}</span>}
      </code>
      {display && (
        <button type="button" className="p-1 text-stone-500 hover:text-stone-800" onClick={copyCode} title="Copiar código">
          <Copy size={14} />
        </button>
      )}
      <button type="button" className="p-1 text-stone-500 hover:text-lime-700" onClick={startEdit} title="Editar código">
        <Pencil size={14} />
      </button>
    </div>
  );
}
