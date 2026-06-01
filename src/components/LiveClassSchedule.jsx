import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Calendar, User, ExternalLink, Users, Info } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import './LiveClassSchedule.css';

const WEEKDAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const TZ = 'America/Mexico_City';

function normalizeDay(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .slice(0, 3);
}

function timeFromIso(iso) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TZ,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function weekdayFromClass(classItem) {
  if (classItem.day_label) return normalizeDay(classItem.day_label);
  try {
    const name = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: TZ }).format(new Date(classItem.start_time));
    return normalizeDay(name);
  } catch {
    return '';
  }
}

const DEFAULT_SLOTS = [
  { label: '6:20-7:00 A.M.', start: '06:20', end: '07:00', period: 'evening' },
  { label: '8:20-9:00 A.M.', start: '08:20', end: '09:00', period: 'morning' },
  { label: '9:00-9:40 A.M.', start: '09:00', end: '09:40', period: 'morning' },
  { label: '6:20-7:00 P.M.', start: '18:20', end: '19:00', period: 'evening' },
  { label: '7:00-7:40 P.M.', start: '19:00', end: '19:40', period: 'evening' },
];

function slotPeriod(start) {
  const h = parseInt(String(start).slice(0, 2), 10);
  if (Number.isNaN(h)) return 'morning';
  return h >= 12 ? 'evening' : 'morning';
}

function matchesSlot(classItem, slot) {
  const dayKey = weekdayFromClass(classItem);
  const start = timeFromIso(classItem.start_time);
  const end = timeFromIso(classItem.end_time);
  if (!start) return false;
  return start === slot.start && (end === slot.end || !slot.end);
}

export default function LiveClassSchedule({ programId }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [enrolling, setEnrolling] = useState(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setNotice('');
      const params = programId ? { program_id: programId } : {};
      const res = await api.get('/live-classes', { params });
      setClasses((res.data.data || []).filter((c) => c.active !== false));
    } catch {
      setNotice('Error al cargar el horario. Verifica que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const timeSlots = useMemo(() => {
    const seen = new Map();
    classes.forEach((c) => {
      const start = timeFromIso(c.start_time);
      const end = timeFromIso(c.end_time);
      if (!start) return;
      const key = `${start}-${end}`;
      if (!seen.has(key)) {
        const period = slotPeriod(start);
        const suffix = period === 'evening' ? ' P.M.' : ' A.M.';
        seen.set(key, {
          start,
          end,
          period,
          label: `${start}${end ? `-${end}` : ''}${suffix}`,
        });
      }
    });
    const dynamic = [...seen.values()].sort((a, b) => a.start.localeCompare(b.start));
    return dynamic.length ? dynamic : DEFAULT_SLOTS;
  }, [classes]);

  const getClassForSlot = (dayName, slot) => {
    const dayKey = normalizeDay(dayName);
    return classes.find((c) => weekdayFromClass(c) === dayKey && matchesSlot(c, slot));
  };

  const handleEnroll = async (classId) => {
    try {
      setEnrolling(classId);
      await api.post(`/live-classes/${classId}/enroll`);
      await fetchClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al inscribirse');
    } finally {
      setEnrolling(null);
    }
  };

  const handleJoin = async (classId, zoomLink) => {
    if (!zoomLink) {
      alert('Esta sesión aún no tiene enlace Zoom. Contacta al administrador D28D.');
      return;
    }
    try {
      await api.post(`/live-classes/${classId}/join`);
      window.open(zoomLink, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(zoomLink, '_blank', 'noopener,noreferrer');
    }
  };

  const spotsLabel = (classItem) => {
    const total = Number(classItem.capacity) || 40;
    const enrolled = classItem.enrolled_user_ids?.length || 0;
    const available = Math.max(0, total - enrolled);
    return `${available} DISPONIBLES`;
  };

  if (loading) {
    return (
      <div className="d28d-graphic-schedule flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500" />
      </div>
    );
  }

  return (
    <div className="d28d-graphic-schedule space-y-4">
      <div className="d28d-graphic-schedule__banner">
        <div className="d28d-graphic-schedule__banner-main">
          <div className="d28d-graphic-schedule__banner-icon" aria-hidden>
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2>Horario de clases</h2>
            <p>Semana I — Programación modular</p>
          </div>
        </div>
        <div className="d28d-graphic-schedule__brand">
          <div>D28D GLOBAL</div>
          <div>MÉTODO D28D</div>
        </div>
      </div>

      <div className="d28d-graphic-schedule__notice">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Calendario D28D para consumo de marcas blancas. La asistencia se marca al entrar al Zoom.
          {classes.length === 0 ? ' Aún no hay sesiones activas — el admin las programa en «Programar».' : ''}
        </p>
      </div>

      {notice ? <p className="text-sm text-red-600">{notice}</p> : null}

      <div className="d28d-graphic-schedule__table-wrap">
        <table className="d28d-graphic-schedule__table">
          <thead>
            <tr>
              <th>Hora / Día</th>
              {WEEKDAYS.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot.label}>
                <td className="d28d-graphic-schedule__time-cell">{slot.label}</td>
                {WEEKDAYS.map((day) => {
                  const classItem = getClassForSlot(day, slot);
                  if (!classItem) {
                    return <td key={day} className="d28d-graphic-schedule__empty-cell" />;
                  }
                  const isEnrolled = user && classItem.enrolled_user_ids?.includes(user.id);
                  const cardClass = slot.period === 'evening'
                    ? 'd28d-graphic-schedule__card d28d-graphic-schedule__card--evening'
                    : 'd28d-graphic-schedule__card d28d-graphic-schedule__card--morning';
                  return (
                    <td key={day} style={{ padding: '0.35rem', verticalAlign: 'top' }}>
                      <div className={cardClass}>
                        <div className="d28d-graphic-schedule__card-title" title={classItem.title}>
                          {classItem.title}
                        </div>
                        <div className="d28d-graphic-schedule__card-meta">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{classItem.coach || 'ENTRENADOR D28D'}</span>
                        </div>
                        <div className="d28d-graphic-schedule__card-meta">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>{spotsLabel(classItem)}</span>
                        </div>
                        <div className="d28d-graphic-schedule__card-actions">
                          {!isEnrolled ? (
                            <button
                              type="button"
                              className="d28d-graphic-schedule__btn-enroll"
                              disabled={enrolling === classItem.id}
                              onClick={() => handleEnroll(classItem.id)}
                            >
                              {enrolling === classItem.id ? '…' : 'Inscribirme'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="d28d-graphic-schedule__btn-zoom"
                              onClick={() => handleJoin(classItem.id, classItem.zoom_link)}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Zoom
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
