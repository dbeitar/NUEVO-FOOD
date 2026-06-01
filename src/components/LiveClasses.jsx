import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import LiveClassSchedule from './LiveClassSchedule';
import './LiveClasses.css';

const viewOptions = [
  { id: 'month', label: 'Mensual' },
  { id: 'week', label: 'Semanal' },
  { id: 'day', label: 'Diaria' },
  { id: 'upcoming', label: 'Próximas' },
  { id: 'graphic', label: 'Horario Gráfico' },
];

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getClassStatus(item) {
  const now = new Date();
  const start = new Date(item.start_time);
  const end = new Date(item.end_time);
  if (now >= start && now <= end) return 'En curso';
  if (now >= new Date(start.getTime() - 5 * 60000) && now < start) return 'Próxima';
  if (now > end) return 'Completada';
  return 'Programada';
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diffToMonday);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function weekDays(anchor) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function monthDays(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function LiveClasses({ programId }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('graphic');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = programId ? { program_id: programId } : {};
      const resp = await api.get('/live-classes', { params });
      setClasses(resp.data?.data || []);
    } catch {
      setError('No se pudieron cargar las clases en vivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [programId]);

  const activeClasses = useMemo(() => classes.filter((item) => item.active), [classes]);
  const upcoming = useMemo(() => activeClasses.filter((item) => new Date(item.end_time) >= new Date()), [activeClasses]);

  const classesForDay = (day) => activeClasses.filter((item) => isSameDay(new Date(item.start_time), day));

  const moveAnchor = (step) => {
    const next = new Date(anchorDate);
    if (view === 'month') next.setMonth(next.getMonth() + step);
    if (view === 'week') next.setDate(next.getDate() + step * 7);
    if (view === 'day') next.setDate(next.getDate() + step);
    setAnchorDate(next);
  };

  const handleJoin = async (item) => {
    try {
      setJoining(item.id);
      const resp = await api.post(`/live-classes/${item.id}/join`);
      const zoomLink = resp.data?.data?.zoom_link || item.zoom_link;
      await fetchClasses();
      window.open(zoomLink, '_blank', 'noopener,noreferrer');
    } catch {
      setError('No se pudo registrar la asistencia para esta clase.');
    } finally {
      setJoining(null);
    }
  };

  const renderClassCard = (item, compact = false) => {
    const now = new Date();
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    const openWindow = now >= new Date(start.getTime() - 5 * 60000) && now <= end;
    const status = getClassStatus(item);
    const enrolled = Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids.length : 0;
    const attendance = Array.isArray(item.attendance_user_ids) ? item.attendance_user_ids.length : 0;

    return (
      <div key={item.id} className={`d28d-live-classes__class-card ${compact ? 'text-xs' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="d28d-live-classes__kicker text-[11px] uppercase tracking-[0.16em] font-semibold">
              {item.source_module === 'd28d' || item.is_global ? 'Programa D28D' : item.gym_id ? 'Tu gimnasio' : 'Clase'}
            </div>
            <h3 className={`d28d-live-classes__title ${compact ? 'text-sm' : 'text-xl'} font-semibold mt-1`}>{item.title}</h3>
            {!compact && <p className="d28d-live-classes__desc text-sm mt-2">{item.description || 'Clase en vivo de entrenamiento guiado.'}</p>}
          </div>
          <span className="d28d-live-classes__status rounded-full px-3 py-1 text-xs font-semibold">{status}</span>
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm d28d-live-classes__meta">
          <span>{compact ? `${formatTime(item.start_time)} - ${formatTime(item.end_time)}` : `${formatDateTime(item.start_time)} -> ${formatDateTime(item.end_time)}`}</span>
          <span>Coach: {item.coach || 'D28D'}</span>
          <span>Cupos: {enrolled}/{item.capacity || 40}</span>
          <span>Asistencia real: {attendance}</span>
        </div>
        {!compact && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm d28d-live-classes__meta break-all">Zoom: <span className="font-medium d28d-live-classes__title">{item.zoom_link}</span></div>
            <button
              type="button"
              onClick={() => handleJoin(item)}
              disabled={!openWindow || joining === item.id}
              className={`btn-primary ${!openWindow ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {openWindow ? (joining === item.id ? 'Registrando...' : 'Unirse y marcar asistencia') : 'Disponible 5 min antes'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    if (view === 'upcoming') {
      return upcoming.length ? upcoming.map((item) => renderClassCard(item)) : <EmptyState />;
    }
    if (view === 'day') {
      const dayItems = classesForDay(anchorDate);
      return (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-stone-900">{anchorDate.toLocaleDateString('es-CO', { dateStyle: 'full' })}</h3>
          {dayItems.length ? dayItems.map((item) => renderClassCard(item)) : <EmptyState />}
        </div>
      );
    }
    if (view === 'graphic') {
      return <LiveClassSchedule programId={programId} />;
    }
    const days = view === 'month' ? monthDays(anchorDate) : weekDays(anchorDate);
    return (
      <div className={`grid ${view === 'month' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-1 lg:grid-cols-7'} gap-3`}>
        {days.map((day) => {
          const dayItems = classesForDay(day);
          const outsideMonth = view === 'month' && day.getMonth() !== anchorDate.getMonth();
          return (
            <div key={day.toISOString()} className={`min-h-[150px] rounded-lg border border-slate-200 bg-white p-3 ${outsideMonth ? 'opacity-50' : ''}`}>
              <div className="text-sm font-semibold text-stone-900">{day.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}</div>
              <div className="mt-3 space-y-2">
                {dayItems.slice(0, view === 'month' ? 3 : 6).map((item) => renderClassCard(item, true))}
                {dayItems.length === 0 && <div className="text-xs text-stone-400">Sin clases</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="d28d-live-classes max-w-7xl mx-auto space-y-6">
      <div className="d28d-live-classes__panel rounded-lg p-5">
        <h2 className="d28d-live-classes__title text-3xl font-bold">Clases en vivo</h2>
        <p className="d28d-live-classes__desc mt-2">Agenda y reserva tus clases. La asistencia se confirma al entrar al Zoom.</p>
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                className={`d28d-live-classes__tab px-4 py-2 rounded-lg text-sm font-semibold border ${view === option.id ? 'd28d-live-classes__tab--active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => moveAnchor(-1)}>Anterior</button>
            <button type="button" className="btn-secondary" onClick={() => setAnchorDate(new Date())}>Hoy</button>
            <button type="button" className="btn-secondary" onClick={() => moveAnchor(1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {error && <div className="d28d-live-classes__error p-4 rounded-lg">{error}</div>}
      {loading ? (
        <div className="d28d-live-classes__panel text-center py-12 rounded-lg">Cargando clases...</div>
      ) : renderCalendar()}
    </div>
  );
}

function EmptyState() {
  return <div className="d28d-live-classes__empty p-8 rounded-lg text-center">No hay clases programadas para esta vista.</div>;
}
