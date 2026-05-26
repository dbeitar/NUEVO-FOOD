/** Campos ES + EN para el maestro de apariencia. */
export function BilingualTextField({ label, valueEs, valueEn, onChangeEs, onChangeEn, multiline = false, rows = 2 }) {
  const Input = multiline ? 'textarea' : 'input';
  return (
    <div className="bilingual-fields space-y-2">
      <span className="d28d-label">{label}</span>
      <label className="block">
        <span className="d28d-text-muted" style={{ fontSize: '0.65rem' }}>ES</span>
        <Input
          className="input w-full mt-1"
          rows={multiline ? rows : undefined}
          value={valueEs || ''}
          onChange={(e) => onChangeEs(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="d28d-text-muted" style={{ fontSize: '0.65rem' }}>EN</span>
        <Input
          className="input w-full mt-1"
          rows={multiline ? rows : undefined}
          value={valueEn || ''}
          onChange={(e) => onChangeEn(e.target.value)}
        />
      </label>
    </div>
  );
}
