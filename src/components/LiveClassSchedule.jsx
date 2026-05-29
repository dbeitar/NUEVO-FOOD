import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Calendar, User, ExternalLink, CheckCircle, Users, Info } from 'lucide-react';
import { useAuth } from '../context/useAuth';

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
  { label: '6:20-7:00 am', start: '06:20', end: '07:00', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  { label: '8:20-9:00 am', start: '08:20', end: '09:00', color: 'bg-lime-100 text-lime-900 border-lime-200' },
  { label: '9:00-9:40 am', start: '09:00', end: '09:40', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
  { label: '6:20-7:00 pm', start: '18:20', end: '19:00', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: '7:00-7:40 pm', start: '19:00', end: '19:40', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
];

const SLOT_COLORS = [
  'bg-purple-100 text-purple-900 border-purple-200',
  'bg-lime-100 text-lime-900 border-lime-200',
  'bg-cyan-100 text-cyan-900 border-cyan-200',
  'bg-indigo-100 text-indigo-900 border-indigo-200',
  'bg-emerald-100 text-emerald-900 border-emerald-200',
];

export default function LiveClassSchedule({ programId }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [enrolling, setEnrolling] = useState(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = programId ? { program_id: programId } : {};
      const res = await api.get('/live-classes', { params });
      setClasses((res.data.data || []).filter((c) => c.active !== false));
    } catch {
      setError('Error al cargar el horario');
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
        seen.set(key, { start, end, label: `${start}${end ? `-${end}` : ''}` });
      }
    });
    const dynamic = [...seen.values()].sort((a, b) => a.start.localeCompare(b.start));
    if (dynamic.length === 0) return DEFAULT_SLOTS;
    return dynamic.map((slot, i) => ({
      ...slot,
      label: slot.label.replace(/^(\d{2}:\d{2})/, (_, t) => t),
      color: SLOT_COLORS[i % SLOT_COLORS.length],
    }));
  }, [classes]);

  const getClassForSlot = (dayName, slot) => {
    const dayKey = normalizeDay(dayName);
    return classes.find((c) => {
      if (weekdayFromClass(c) !== dayKey) return false;
      const start = timeFromIso(c.start_time);
      if (!start) return false;
      return start === slot.start || start.slice(0, 2) === slot.start.slice(0, 2);
    });
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
    try {
      await api.post(`/live-classes/${classId}/join`);
      window.open(zoomLink, '_blank');
    } catch (err) {
      console.error('Error al registrar asistencia', err);
      window.open(zoomLink, '_blank');
    }
  };

  const getMaskedAvailable = (enrolledCount = 0) => {
    const total = 20;
    const available = total - enrolledCount;
    return `${available}/${total}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p>Horario semanal de clases en vivo. Los horarios se alinean con las sesiones programadas en el calendario.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Horario</th>
              {WEEKDAYS.map((day) => (
                <th key={day} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[140px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timeSlots.map((slot) => (
              <tr key={slot.label} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap bg-slate-50/30">
                  {slot.label}
                </td>
                {WEEKDAYS.map((day) => {
                  const classItem = getClassForSlot(day, slot);
                  if (!classItem) {
                    return <td key={day} className="px-2 py-2 text-center text-slate-300 text-xs">—</td>;
                  }
                  const enrolled = classItem.enrolled_user_ids?.length || 0;
                  const isEnrolled = user && classItem.enrolled_user_ids?.includes(user.id);
                  return (
                    <td key={day} className="px-2 py-2">
                      <div className={`p-2 rounded-lg border text-xs ${slot.color}`}>
                        <div className="font-bold truncate" title={classItem.title}>{classItem.title}</div>
                        <div className="flex items-center gap-1 mt-1 opacity-80">
                          <User className="w-3 h-3" />
                          <span className="truncate">{classItem.coach || 'Coach'}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 opacity-70">
                          <Users className="w-3 h-3" />
                          <span>{getMaskedAvailable(enrolled)}</span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                          {!isEnrolled ? (
                            <button
                              type="button"
                              className="text-[10px] font-bold uppercase bg-white/50 hover:bg-white px-2 py-1 rounded border border-current/20"
                              disabled={enrolling === classItem.id}
                              onClick={() => handleEnroll(classItem.id)}
                            >
                              {enrolling === classItem.id ? '…' : 'Reservar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-[10px] font-bold uppercase bg-white hover:bg-white px-2 py-1 rounded border border-current/30 flex items-center justify-center gap-1"
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

      {classes.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          No hay clases activas para este programa. El administrador puede programarlas en «Administrar clases».
        </p>
      )}
    </div>
  );
}
