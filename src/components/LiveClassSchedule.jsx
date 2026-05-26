import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, User, ExternalLink, CheckCircle, Users, Info } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export default function LiveClassSchedule({ programId }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [enrolling, setEnrolling] = useState(null);

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  
  // Horarios específicos según la imagen
  const timeSlots = [
    { label: '6:20-7:00 am', start: '06:20', end: '07:00', color: 'bg-purple-100 text-purple-900 border-purple-200' },
    { label: '8:20-9:00 am', start: '08:20', end: '09:00', color: 'bg-lime-100 text-lime-900 border-lime-200' },
    { label: '9:00-9:40 am', start: '09:00', end: '09:40', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    { label: '6:20-7:00 pm', start: '18:20', end: '19:00', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    { label: '7:00-7:40 pm', start: '19:00', end: '19:40', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' }
  ];

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = programId ? { program_id: programId } : {};
      const res = await api.get('/live-classes', { params });
      setClasses(res.data.data || []);
    } catch {
      setError('Error al cargar el horario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // fetchClasses se redefine en cada render; el efecto reacciona solo al programId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

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
      // Registrar asistencia antes de abrir zoom
      await api.post(`/live-classes/${classId}/join`);
      window.open(zoomLink, '_blank');
    } catch (err) {
      console.error('Error al registrar asistencia', err);
      window.open(zoomLink, '_blank');
    }
  };

  const getClassForSlot = (dayName, slot) => {
    return classes.find(c => {
      const date = new Date(c.start_time);
      const day = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // Coincidencia por día y hora de inicio aproximada
      return day.toLowerCase().includes(dayName.toLowerCase().slice(0, 3)) && 
             timeStr.startsWith(slot.start.slice(0, 2));
    });
  };

  const getMaskedAvailable = (enrolledCount = 0) => {
    const total = 20;
    const available = total - enrolledCount;
    // Lógica: Empezar en 20 disponibles. Si hay 19 o más inscritos, quedarse en 1 disponible.
    if (enrolledCount >= 19) return 1;
    return available;
  };

  if (loading) return <div className="p-8 text-center">Cargando horario...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#1a237e] text-white p-6 rounded-t-3xl flex items-center justify-between shadow-xl border-b-4 border-lime-400">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <Calendar className="w-8 h-8 text-lime-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase leading-none">Horario de clases</h2>
            <p className="text-indigo-200 font-bold mt-1 text-xs uppercase tracking-widest italic">Programación semanal</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-b-3xl border-x border-b border-slate-200 bg-white shadow-2xl">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#283593] text-white">
              <th className="p-4 border-r border-white/10 w-32 text-xs font-black uppercase italic tracking-tighter">Hora / Día</th>
              {days.map(d => (
                <th key={d} className="p-4 border-r border-white/10 text-xs font-black uppercase tracking-widest">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, sIdx) => (
              <tr key={sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-6 border-r border-slate-200 text-center bg-stone-50">
                  <div className="text-sm font-black text-stone-800 leading-tight">
                    {slot.label.split(' ')[0]}
                  </div>
                  <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">
                    {slot.label.split(' ')[1]}
                  </div>
                </td>
                {days.map(day => {
                  const classItem = getClassForSlot(day, slot);
                  const isEnrolled = classItem?.enrolled_user_ids?.includes(user?.id);
                  
                  return (
                    <td key={day} className="p-3 border-r border-slate-100 relative group min-h-[140px]">
                      {classItem ? (
                        <div className={`h-full flex flex-col justify-between p-3 rounded-2xl border transition-all shadow-sm ${slot.color} ${isEnrolled ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-black text-xs leading-tight uppercase">{classItem.title}</p>
                              {isEnrolled && <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-bold opacity-70 uppercase mb-2">
                              <User className="w-2.5 h-2.5" />
                              {classItem.coach || 'Coach D28D'}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{getMaskedAvailable(classItem.enrolled_user_ids?.length)} Disponibles</span>
                              </div>
                            </div>

                            {isEnrolled ? (
                              <button 
                                onClick={() => handleJoin(classItem.id, classItem.zoom_link)}
                                className="w-full py-2 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                              >
                                Entrar a Zoom <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleEnroll(classItem.id)}
                                disabled={enrolling === classItem.id}
                                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50"
                              >
                                {enrolling === classItem.id ? 'Inscribiendo...' : 'Inscribirme'}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[80px] border-2 border-dashed border-slate-100 rounded-2xl"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-5 bg-stone-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] flex flex-col sm:flex-row justify-between items-center gap-4 border-l-8 border-lime-400">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-lime-400" />
          <span>* Los días festivos solo habrá clase en la mañana (6:20 am / 8:20 am)</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
          <span className="text-lime-400">Hora Colombia - En Vivo</span>
        </div>
      </div>
    </div>
  );
}
