import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, Heart, Sparkles } from 'lucide-react';
import {
  fetchSpiritualFeed,
  completeDevotionalDay,
  startDevotional,
  registerEvent,
  openStudy,
  spiritualWidgetsEnabled,
} from '../../../utils/spiritualApi';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import './SpiritualTodayWidget.css';

export default function SpiritualTodayWidget({ compact = false, onOpenBible }) {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!spiritualWidgetsEnabled()) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchSpiritualFeed();
      setFeed(data);
    } catch (e) {
      if (e?.response?.status !== 404) setError('No se pudo cargar el contenido de hoy.');
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!spiritualWidgetsEnabled() || loading) return null;
  if (!feed?.enabled) return null;
  const hasContent = feed.verse || feed.devotional || feed.studies?.length || feed.events?.length;
  if (!hasContent && !error) return null;

  const handleStartDevotional = async () => {
    if (!feed.devotional?.plan_id) return;
    await startDevotional(feed.devotional.plan_id);
    await load();
  };

  const handleCompleteDay = async () => {
    const d = feed.devotional?.next_day?.day_index;
    if (!d || !feed.devotional?.plan_id) return;
    await completeDevotionalDay(feed.devotional.plan_id, d);
    await load();
  };

  return (
    <section className="spiritual-today-widget">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="spiritual-today-widget__icon h-5 w-5" aria-hidden />
        <h3 className="spiritual-today-widget__title">Hoy</h3>
      </header>

      {error ? <p className="spiritual-today-widget__error">{error}</p> : null}

      {feed.verse ? (
        <div className="spiritual-today-widget__card">
          <p className="spiritual-today-widget__label">Versículo del día</p>
          {feed.verse.reference ? (
            <p className="spiritual-today-widget__heading">{feed.verse.reference}</p>
          ) : null}
          <p className="spiritual-today-widget__quote">&ldquo;{feed.verse.text}&rdquo;</p>
          {feed.verse.reflection ? (
            <p className="spiritual-today-widget__body">{feed.verse.reflection}</p>
          ) : null}
        </div>
      ) : null}

      {feed.devotional ? (
        <div className="spiritual-today-widget__card">
          <p className="spiritual-today-widget__label">Devocional</p>
          <p className="spiritual-today-widget__heading">{feed.devotional.title}</p>
          <p className="spiritual-today-widget__meta">
            Día {feed.devotional.next_day?.day_index || 1} de {feed.devotional.duration_days}
            {' · '}
            {feed.devotional.completed_count} completados
          </p>
          {feed.devotional.next_day ? (
            <p className="spiritual-today-widget__body line-clamp-3">{feed.devotional.next_day.reflection}</p>
          ) : null}
          <div className="spiritual-today-widget__actions">
            {feed.devotional.completed_count === 0 ? (
              <button type="button" className="btn-primary text-sm" onClick={handleStartDevotional}>
                Comenzar
              </button>
            ) : null}
            {feed.devotional.next_day ? (
              <button type="button" className="btn-secondary text-sm" onClick={handleCompleteDay}>
                Marcar día completado
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {feed.events?.length ? (
        <div className="mb-4">
          <p className="spiritual-today-widget__label mb-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Próximos eventos
          </p>
          <ul className="space-y-2">
            {feed.events.map((ev) => (
              <li key={ev.id} className="spiritual-today-widget__list-item">
                <span>{ev.title}</span>
                <button type="button" className="spiritual-today-widget__link" onClick={() => registerEvent(ev.id)}>
                  Inscribirme
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {feed.studies?.length ? (
        <div>
          <p className="spiritual-today-widget__label mb-2">Estudios recomendados</p>
          <ul className="space-y-2">
            {feed.studies.map((st) => (
              <li key={st.id}>
                <button
                  type="button"
                  className="spiritual-today-widget__study-btn"
                  onClick={async () => {
                    const full = await openStudy(st.id);
                    if (full?.mediaUrl?.startsWith('http')) {
                      window.open(full.mediaUrl, '_blank', 'noopener');
                    } else if (full?.mediaUrl) {
                      window.open(resolveMediaUrl(full.mediaUrl), '_blank', 'noopener');
                    }
                  }}
                >
                  {st.title}
                  {st.category?.name ? (
                    <span className="spiritual-today-widget__study-meta"> · {st.category.name}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && onOpenBible ? (
        <button type="button" className="spiritual-today-widget__footer-link" onClick={onOpenBible}>
          <BookOpen className="h-4 w-4" />
          Explorar la Biblia
        </button>
      ) : null}

      {!compact ? (
        <p className="spiritual-today-widget__footnote">
          <Heart className="h-3 w-3" /> Acompañamiento espiritual integrado
        </p>
      ) : null}
    </section>
  );
}
