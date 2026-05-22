import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Save, Ruler, Send, Info, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const FREQUENCY_OPTIONS = [
  { value: 1,  label: 'Diario' },
  { value: 3,  label: 'Cada 3 días' },
  { value: 7,  label: 'Semanal' },
  { value: 14, label: 'Cada 2 semanas' },
  { value: 30, label: 'Mensual' },
]

export default function MeasurementReminderConfig() {
  const [form, setForm] = useState({
    frequencyDays: 7,
    sendEmail: true,
    sendNote: true,
    isActive: true,
    message: 'Hola {nombre}, es momento de registrar tus medidas corporales. ¡Hagamos seguimiento a tu progreso!',
  })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/measurements/reminder/config')
      if (data) setForm({
        frequencyDays: data.frequencyDays || 7,
        sendEmail:     data.sendEmail ?? true,
        sendNote:      data.sendNote  ?? true,
        isActive:      data.isActive  ?? true,
        message:       data.message   || form.message,
      })
    } catch {}
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/measurements/reminder/config', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Configuración guardada')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  const sendNow = async () => {
    setSending(true)
    try {
      const { data } = await api.post('/measurements/reminder/send-to-students')
      toast.success(data.message)
    } catch { toast.error('Error al enviar') }
    finally { setSending(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Ruler size={22} className="text-indigo-500" /> Recordatorio de Medidas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura cuándo recordar a tus asesorados que registren sus medidas
          </p>
        </div>
        <button onClick={sendNow} disabled={sending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          <Send size={15} /> {sending ? 'Enviando...' : 'Enviar ahora'}
        </button>
      </div>

      <div className="card space-y-5">
        {/* Active toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-800">Recordatorios activos</p>
            <p className="text-xs text-gray-500">Los recordatorios se enviarán automáticamente</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {/* Frequency */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Frecuencia de recordatorio</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {FREQUENCY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setForm(f => ({ ...f, frequencyDays: opt.value }))}
                className={`py-2 px-3 rounded-xl text-xs font-medium border-2 transition-all text-center ${
                  form.frequencyDays === opt.value
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Send options */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Enviar por</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded"
                checked={form.sendEmail}
                onChange={e => setForm(f => ({ ...f, sendEmail: e.target.checked }))} />
              Correo electrónico
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded"
                checked={form.sendNote}
                onChange={e => setForm(f => ({ ...f, sendNote: e.target.checked }))} />
              Nota interna
            </label>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Mensaje del recordatorio</label>
          <div className="flex items-center gap-2 mb-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
            <Info size={13} />
            Variables: <code className="bg-blue-100 px-1 rounded">{'{nombre}'}</code>
            <code className="bg-blue-100 px-1 rounded">{'{entrenador}'}</code>
          </div>
          <textarea className="input w-full resize-none" rows={4}
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
