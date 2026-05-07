import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Clock, User, ExternalLink } from 'lucide-react';

export default function LiveClassSchedule() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
  const timeSlots = [
    { label: '6:00-6:40 am', start: '06:00', end: '06:40' },
    { label: '6:00-6:40 pm', start: '18:00', end: '18:40' },
    { label: '7:00-8:00 pm', start: '19:00', end: '20:00' }
  ];

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/live-classes');
      setClasses(res.data.data || []);
    } catch (err) {
      setError('Error al cargar el horario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const getClassForSlot = (dayName, slotLabel) => {
    // Basic matching based on day of week and time
    // In a real scenario, we'd check the exact date or a repeating flag
    return classes.find(c => {
      const date = new Date(c.start_time);
      const day = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
      
      // Check if slot label matches (approximate)
      return day.toLowerCase().includes(dayName.toLowerCase().slice(0, 3)) && 
             slotLabel.includes(timeStr.split(':')[0]);
    });
  };

  if (loading) return <div className="p-8 text-center">Cargando horario...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#1a237e] text-white p-6 rounded-t-3xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Horarios de Clases</h2>
            <p className="text-indigo-200 font-medium">Programación semanal de entrenamientos en vivo</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-300">D28D VITAL</div>
          <div className="text-xl font-bold">PLATAFORMA MODULAR</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-b-3xl border-x border-b border-slate-200 bg-white shadow-2xl">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[#3f51b5] text-white">
              <th className="p-4 border-r border-white/20 w-40 text-sm font-black uppercase">Hora/Día</th>
              {days.map(d => (
                <th key={d} className="p-4 border-r border-white/20 text-sm font-black uppercase">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, sIdx) => (
              <tr key={sIdx} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-6 border-r border-slate-200 text-center">
                  <div className="text-lg font-black text-stone-800 leading-tight">
                    {slot.label.split(' ')[0]}
                  </div>
                  <div className="text-xs font-bold text-indigo-500 uppercase">
                    {slot.label.split(' ')[1]}
                  </div>
                </td>
                {days.map(day => {
                  const classItem = getClassForSlot(day, slot.label);
                  return (
                    <td key={day} className="p-4 border-r border-slate-200 relative group min-h-[120px]">
                      {classItem ? (
                        <div className="h-full flex flex-col justify-center items-center text-center p-2 rounded-xl bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 transition-all cursor-pointer">
                          <p className="font-bold text-indigo-900 text-sm leading-tight mb-1">{classItem.title}</p>
                          <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold uppercase">
                            <User className="w-3 h-3" />
                            {classItem.description || 'Instructor'}
                          </div>
                          <a 
                            href={classItem.zoom_link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-2 p-1.5 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className="h-full min-h-[60px]"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-stone-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex justify-between items-center">
        <span>* Los días festivos solo habrá clase en la mañana</span>
        <span className="text-lime-400">Hora Colombia</span>
      </div>
    </div>
  );
}
