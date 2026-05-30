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
    <section className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-stone-50 p-6 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-600" aria-hidden />
        <h3 className="text-lg font-semibold text-stone-900">Hoy</h3>
      </header>

      {error ? <p className="text-sm text-stone-500">{error}</p> : null}

      {feed.verse ? (
        <div className="mb-4 rounded-xl bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Versículo del día</p>
          {feed.verse.reference ? (
            <p className="mt-1 text-sm font-semibold text-stone-800">{feed.verse.reference}</p>
          ) : null}
          <p className="mt-2 text-stone-700 italic">&ldquo;{feed.verse.text}&rdquo;</p>
          {feed.verse.reflection ? (
            <p className="mt-2 text-sm text-stone-600">{feed.verse.reflection}</p>
          ) : null}
        </div>
      ) : null}

      {feed.devotional ? (
        <div className="mb-4 rounded-xl bg-white/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Devocional</p>
          <p className="mt-1 font-semibold text-stone-800">{feed.devotional.title}</p>
          <p className="text-sm text-stone-600">
            Día {feed.devotional.next_day?.day_index || 1} de {feed.devotional.duration_days}
            {' · '}
            {feed.devotional.completed_count} completados
          </p>
          {feed.devotional.next_day ? (
            <p className="mt-2 text-sm text-stone-600 line-clamp-3">{feed.devotional.next_day.reflection}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
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
          <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-700">
            <Calendar className="h-3.5 w-3.5" /> Próximos eventos
          </p>
          <ul className="space-y-2">
            {feed.events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm">
                <span>{ev.title}</span>
                <button type="button" className="text-amber-700 underline" onClick={() => registerEvent(ev.id)}>
                  Inscribirme
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {feed.studies?.length ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700">Estudios recomendados</p>
          <ul className="space-y-2">
            {feed.studies.map((st) => (
              <li key={st.id}>
                <button
                  type="button"
                  className="w-full rounded-lg bg-white/80 px-3 py-2 text-left text-sm hover:bg-white"
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
                  {st.category?.name ? <span className="ml-2 text-stone-500">· {st.category.name}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && onOpenBible ? (
        <button
          type="button"
          className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-800 hover:underline"
          onClick={onOpenBible}
        >
          <BookOpen className="h-4 w-4" />
          Explorar la Biblia
        </button>
      ) : null}

      {!compact ? (
        <p className="mt-4 flex items-center gap-1 text-xs text-stone-400">
          <Heart className="h-3 w-3" /> Acompañamiento espiritual integrado
        </p>
      ) : null}
    </section>
  );
}
