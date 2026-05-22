import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Save, Bell, CheckCircle, XCircle, Send, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const LEVELS = [
  {
    value: 'RED',
    label: '🔴 Semáforo Rojo',
    desc: 'Notificación diaria — asesorados que no están cumpliendo su plan',
    color: 'border-red-200 bg-red-50',
    badge: 'bg-red-100 text-red-700',
    default_subject: '¡Te necesitamos de vuelta en tu plan! 🔴',
    default_msg: 'Hola {nombre},\n\nHe notado que tu semáforo está en rojo. Esto significa que necesitas retomar tu plan nutricional con urgencia.\n\nRecuerda registrar tus alimentos cada día para que pueda hacer un seguimiento adecuado.\n\n¡Tú puedes, {nombre}! 💪',
  },
  {
    value: 'YELLOW',
    label: '🟡 Semáforo Amarillo',
    desc: 'Notificación cada 3 días — asesorados con adherencia regular',
    color: 'border-yellow-200 bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-700',
    default_subject: 'Vas bien, ¡sigamos mejorando! 🟡',
    default_msg: 'Hola {nombre},\n\nTu semáforo está en amarillo, lo que significa que vas por buen camino pero podemos mejorar.\n\nNo olvides registrar todos tus alimentos y mantener la constancia.\n\nCualquier duda, ¡escríbeme! — {entrenador}',
  },
  {
    value: 'GREEN',
    label: '🟢 Semáforo Verde',
    desc: 'Notificación semanal — asesorados cumpliendo su plan',
    color: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    default_subject: '¡Excelente trabajo esta semana! 🟢',
    default_msg: 'Hola {nombre},\n\n¡Felicitaciones! Tu semáforo está en verde, lo que significa que estás cumpliendo tu plan nutricional de manera excelente.\n\nSigue así, ¡los resultados llegarán! 🎉\n\nOrgulloso de tu proceso — {entrenador}',
  },
]

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [forms, setForms] = useState<Record<string, any>>({})

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    try {
      const { data } = await api.get('/trainer/notification-templates')
      const map: Record<string, any> = {}
      data.forEach((t: any) => { map[t.level] = t })
      setTemplates(map)

      // Initialize forms
      const f: Record<string, any> = {}
      LEVELS.forEach(l => {
        const existing = map[l.value]
        f[l.value] = {
          subject:   existing?.subject   || l.default_subject,
          message:   existing?.message   || l.default_msg,
          sendEmail: existing?.sendEmail  ?? true,
          sendNote:  existing?.sendNote   ?? true,
          isActive:  existing?.isActive   ?? true,
        }
      })
      setForms(f)
    } catch { }
  }

  const saveTemplate = async (level: string) => {
    setSaving(level)
    try {
      await api.post('/trainer/notification-templates', {
        level,
        ...forms[level],
      })
      toast.success('Plantilla guardada')
      loadTemplates()
    } catch { toast.error('Error al guardar') }
    finally { setSaving(null) }
  }

  const triggerNow = async () => {
    setTriggering(true)
    try {
      const { data } = await api.post('/trainer/notification-templates/trigger')
      toast.success(data.message)
    } catch { toast.error('Error al enviar notificaciones') }
    finally { setTriggering(false) }
  }

  const updateForm = (level: string, field: string, value: any) => {
    setForms(f => ({ ...f, [level]: { ...f[level], [field]: value } }))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={22} className="text-primary-600" /> Notificaciones Automáticas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura mensajes automáticos según el semáforo de cada asesorado
          </p>
        </div>
        <button onClick={triggerNow} disabled={triggering}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
          <Send size={15} /> {triggering ? 'Enviando...' : 'Enviar ahora'}
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-medium">Variables disponibles en los mensajes:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {['{nombre}', '{entrenador}', '{semaforo}'].map(v => (
              <code key={v} className="bg-blue-100 px-2 py-0.5 rounded font-mono text-xs">{v}</code>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            🔴 Rojo → diario &nbsp;|&nbsp; 🟡 Amarillo → cada 3 días &nbsp;|&nbsp; 🟢 Verde → semanal
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {LEVELS.map(level => (
          <div key={level.value} className={`border-2 rounded-2xl p-5 ${level.color}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{level.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox"
                    checked={forms[level.value]?.isActive ?? true}
                    onChange={e => updateForm(level.value, 'isActive', e.target.checked)}
                    className="rounded" />
                  Activa
                </label>
                {templates[level.value] && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${level.badge}`}>
                    Configurada ✓
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-white rounded-xl p-4 border border-gray-100">
              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Asunto del correo</label>
                <input className="input w-full text-sm" placeholder="Asunto..."
                  value={forms[level.value]?.subject || ''}
                  onChange={e => updateForm(level.value, 'subject', e.target.value)} />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Mensaje</label>
                <textarea className="input w-full text-sm resize-none" rows={5}
                  placeholder="Escribe el mensaje..."
                  value={forms[level.value]?.message || ''}
                  onChange={e => updateForm(level.value, 'message', e.target.value)} />
              </div>

              {/* Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox"
                    checked={forms[level.value]?.sendEmail ?? true}
                    onChange={e => updateForm(level.value, 'sendEmail', e.target.checked)}
                    className="rounded" />
                  Enviar por correo
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox"
                    checked={forms[level.value]?.sendNote ?? true}
                    onChange={e => updateForm(level.value, 'sendNote', e.target.checked)}
                    className="rounded" />
                  Enviar nota interna
                </label>
              </div>
            </div>

            <button onClick={() => saveTemplate(level.value)}
              disabled={saving === level.value}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors">
              <Save size={14} /> {saving === level.value ? 'Guardando...' : 'Guardar plantilla'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
