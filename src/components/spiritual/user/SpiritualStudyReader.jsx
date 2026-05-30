import './SpiritualStudyReader.css';

function renderStudyLines(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    if (trimmed.startsWith('## ')) {
      return (
        <h5 key={i} className="spiritual-study-reader__section">
          {trimmed.slice(3)}
        </h5>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h5 key={i} className="spiritual-study-reader__section">
          {trimmed.slice(2)}
        </h5>
      );
    }
    return <p key={i}>{trimmed}</p>;
  });
}

export default function SpiritualStudyReader({ study, onClose }) {
  if (!study) return null;

  const body = study.description || study.content_text || study.contentText || '';

  return (
    <div className="spiritual-study-reader" role="region" aria-labelledby="spiritual-study-reader-title">
      <header className="spiritual-study-reader__header">
        <div>
          <p className="spiritual-study-reader__label">Estudio bíblico</p>
          <h4 id="spiritual-study-reader-title">{study.title || 'Estudio'}</h4>
          {study.author?.name || study.category?.name ? (
            <p className="spiritual-study-reader__meta">
              {[study.author?.name, study.category?.name].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <button type="button" className="spiritual-study-reader__close-btn" onClick={onClose}>
          Cerrar
        </button>
      </header>
      <div className="spiritual-study-reader__body">
        {body ? renderStudyLines(body) : (
          <p className="spiritual-study-reader__empty">Este estudio aún no tiene contenido de texto.</p>
        )}
      </div>
      <footer className="spiritual-study-reader__footer">
        <button type="button" className="btn-secondary w-full text-sm" onClick={onClose}>
          ← Volver al resumen de hoy
        </button>
      </footer>
    </div>
  );
}
