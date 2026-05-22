import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import {
  Users, Copy, CheckCircle, Dumbbell, Link, Unlink,
  Eye, Bell, Video, Trash2, Upload, XCircle, ClipboardList,
  Save, RotateCcw, Ruler, ChevronDown, ChevronUp, FileText,
  Download, TrendingUp, Zap, Flame, Activity, Star, Sparkles,
  AlertCircle, MessageSquare, Calendar, Clock, BarChart2, History,
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type Tab = 'students' | 'gym' | 'cv' | 'code'

export default function TrainerDashboard() {
  const [tab, setTab] = useState<Tab>('students')
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [trafficFilter, setTrafficFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Code tab
  const [codeData, setCodeData] = useState<{ trainerCode: string; studentsCount: number } | null>(null)
  const [copied, setCopied] = useState(false)

  // Gym tab
  const [myGym, setMyGym] = useState<any>(null)
  const [gymCode, setGymCode] = useState('')
  const [gymMsg, setGymMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // CV tab
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUrl, setCvUrl] = useState('')
  const [cvMsg, setCvMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Plan modal
  const [planModal, setPlanModal] = useState<any>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [reportTab, setReportTab] = useState<'plan' | 'reports' | 'foods'>('plan')
  const [foodLogs, setFoodLogs] = useState<any[]>([])
  const [foodLogDate, setFoodLogDate] = useState<string | null>(null)
  const [foodLogLoading, setFoodLogLoading] = useState(false)
  const [foodDays, setFoodDays] = useState<any[]>([])
  const [foodDaysLoading, setFoodDaysLoading] = useState(false)
  const [foodDateFrom, setFoodDateFrom] = useState('')
  const [foodDateTo, setFoodDateTo] = useState('')
  const [planForm, setPlanForm] = useState({ dailyCalories: '', dailyProteinG: '', dailyCarbsG: '', dailyFatG: '', dailyWaterGlasses: '', dailySteps: '' })
  const [planSaving, setPlanSaving] = useState(false)

  // Measurements modal
  const [measModal, setMeasModal] = useState<any>(null)
  const [measHistory, setMeasHistory] = useState<any[]>([])
  const [measExpanded, setMeasExpanded] = useState<string | null>(null)
  const [measChartKey, setMeasChartKey] = useState<string>('weight')
  const [showMeasChart, setShowMeasChart] = useState(false)

  // Note modal
  const [noteModal, setNoteModal] = useState<any>(null)
  const [noteText, setNoteText] = useState('')
  const [noteSending, setNoteSending] = useState(false)

  // Activity modal
  const [activityModal, setActivityModal] = useState<any>(null)
  const [activityData, setActivityData] = useState<any>(null)

  // Note history modal
  const [noteHistoryModal, setNoteHistoryModal] = useState<any>(null)
  const [noteHistory, setNoteHistory] = useState<any[]>([])
  const [noteHistoryLoading, setNoteHistoryLoading] = useState(false)

  // Weight progress modal
  const [weightModal, setWeightModal] = useState<any>(null)
  const [weightData, setWeightData] = useState<any[]>([])
  const [weightLoading, setWeightLoading] = useState(false)

  // Daily report modal
  const [reportModal, setReportModal] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [exportingReport, setExportingReport] = useState(false)

  useEffect(() => { loadStudents() }, [])
  useEffect(() => { if (tab === 'code') loadCode() }, [tab])
  useEffect(() => { if (tab === 'gym') loadGym() }, [tab])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (search) params.search = search
      if (trafficFilter) params.trafficLight = trafficFilter
      const r = await api.get('/trainer/students', { params })
      setStudents(r.data)
    } catch { } finally { setLoading(false) }
  }

  const loadCode = async () => {
    try { const r = await api.get('/trainer/my-code'); setCodeData(r.data) } catch { }
  }

  const loadGym = async () => {
    try { const r = await api.get('/trainer/my-gym'); setMyGym(r.data.gym) } catch { }
  }

  const copyCode = () => {
    if (codeData?.trainerCode) {
      navigator.clipboard.writeText(codeData.trainerCode)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const joinGym = async () => {
    if (!gymCode.trim()) return
    try {
      const r = await api.post('/trainer/join-gym-by-code', { gymCode: gymCode.trim().toUpperCase() })
      setGymMsg({ ok: true, text: r.data.message })
      setGymCode(''); loadGym()
    } catch (e: any) {
      setGymMsg({ ok: false, text: e.response?.data?.message || 'Código no válido' })
    }
  }

  const leaveGym = async () => {
    if (!confirm('¿Deseas desvincularte del gimnasio?')) return
    try {
      await api.post('/trainer/leave-gym')
      setMyGym(null); setGymMsg({ ok: true, text: 'Te has desvinculado del gimnasio' })
    } catch { setGymMsg({ ok: false, text: 'Error al desvincular' }) }
  }

  const uploadCv = async () => {
    if (!cvFile) return
    const form = new FormData(); form.append('file', cvFile)
    try {
      const r = await api.post('/trainer/cv/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCvUrl(r.data.cvUrl); setCvMsg({ ok: true, text: 'Hoja de vida subida exitosamente' }); setCvFile(null)
    } catch { setCvMsg({ ok: false, text: 'Error al subir el archivo' }) }
  }

  const removeStudent = async (id: string) => {
    if (!confirm('¿Desvincular este asesorado?')) return
    try { await api.delete(`/trainer/students/${id}`); loadStudents() } catch { }
  }

  const sendReminder = async (id: string) => {
    const message = prompt('Mensaje del recordatorio:')
    if (!message) return
    try {
      await api.post(`/trainer/students/${id}/reminder`, { message })
      setMsg({ ok: true, text: 'Recordatorio enviado' }); setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ ok: false, text: 'Error al enviar recordatorio' }) }
  }

  const sendMeet = async (id: string) => {
    try {
      const r = await api.post(`/trainer/students/${id}/meet`)
      setMsg({ ok: true, text: `Meet enviado: ${r.data.meetUrl}` }); setTimeout(() => setMsg(null), 5000)
    } catch { setMsg({ ok: false, text: 'Error al enviar invitación' }) }
  }

  const loadStudentPlan = async (student: any) => {
    setPlanModal(student); setPlanData(null)
    try {
      const r = await api.get(`/nutrition-plan/student/${student.id}`)
      setPlanData(r.data.profile)
      if (r.data.profile) {
        setPlanForm({
          dailyCalories: r.data.profile.dailyCalories || '',
          dailyProteinG: r.data.profile.dailyProteinG || '',
          dailyCarbsG:   r.data.profile.dailyCarbsG   || '',
          dailyFatG:     r.data.profile.dailyFatG     || '',
        })
      } else {
        setPlanForm({ dailyCalories: '', dailyProteinG: '', dailyCarbsG: '', dailyFatG: '' })
      }
    } catch { setPlanData(null) }
  }

  const savePlanOverride = async () => {
    const targetStudent = planModal || reportModal
    if (!targetStudent) return
    const cal  = parseFloat(planForm.dailyCalories)
    const prot = parseFloat(planForm.dailyProteinG)
    const carb = parseFloat(planForm.dailyCarbsG)
    const fat  = parseFloat(planForm.dailyFatG)
    if (!cal || !prot || !carb || !fat) {
      setMsg({ ok: false, text: 'Completa Calorias, Proteinas, Carbos y Grasas antes de guardar' })
      return
    }
    setPlanSaving(true)
    try {
      await api.put(`/nutrition-plan/student/${targetStudent.id}/override`, {
        dailyCalories:     cal,
        dailyProteinG:     prot,
        dailyCarbsG:       carb,
        dailyFatG:         fat,
        dailyWaterGlasses: parseInt(planForm.dailyWaterGlasses) || 8,
        dailySteps:        parseInt(planForm.dailySteps) || 8000,
      })
      setMsg({ ok: true, text: 'Plan nutricional actualizado' }); setTimeout(() => setMsg(null), 3000)
      setPlanModal(null)
    } catch { setMsg({ ok: false, text: 'Error al guardar el plan' }) }
    finally { setPlanSaving(false) }
  }

  const resetPlan = async () => {
    const targetStudent = planModal || reportModal
    if (!targetStudent || !confirm('¿Restaurar el plan calculado automáticamente?')) return
    try {
      await api.put(`/nutrition-plan/student/${targetStudent.id}/reset`)
      setMsg({ ok: true, text: 'Plan restaurado al cálculo automático' }); setPlanModal(null)
    } catch { setMsg({ ok: false, text: 'Error al restaurar' }) }
  }

  const loadStudentMeasurements = async (student: any) => {
    setMeasModal(student); setMeasHistory([]); setMeasExpanded(null)
    try {
      const r = await api.get(`/measurements/student/${student.id}`)
      setMeasHistory(r.data)
    } catch { setMeasHistory([]) }
  }

  const sendNote = async () => {
    if (!noteModal || !noteText.trim()) return
    setNoteSending(true)
    try {
      await api.post(`/trainer/students/${noteModal.id}/notes`, { message: noteText })
      setMsg({ ok: true, text: `Nota enviada a ${noteModal.firstName}` })
      setTimeout(() => setMsg(null), 3000)
      setNoteModal(null); setNoteText('')
    } catch { setMsg({ ok: false, text: 'Error al enviar la nota' }) }
    finally { setNoteSending(false) }
  }

  const loadStudentReports = async (student: any) => {
    setReportModal(student); setReports([]); setReportFrom(''); setReportTo(''); setReportLoading(true); setReportTab('plan'); setFoodLogs([]); setFoodLogDate(new Date().toISOString().split('T')[0])
    // Also load plan data
    setPlanModal(null)
    try {
      const r = await api.get(`/nutrition-plan/student/${student.id}`)
      setPlanData(r.data.profile)
      setPlanForm({
        dailyCalories:     r.data.profile?.dailyCalories     || '',
        dailyProteinG:     r.data.profile?.dailyProteinG     || '',
        dailyCarbsG:       r.data.profile?.dailyCarbsG       || '',
        dailyFatG:         r.data.profile?.dailyFatG         || '',
        dailyWaterGlasses: r.data.profile?.dailyWaterGlasses || '',
        dailySteps:        r.data.profile?.dailySteps        || '',
      })
    } catch { setPlanData(null) }
    try {
      const r = await api.get(`/daily-reports/student/${student.id}`)
      setReports(r.data)
    } catch { setReports([]) }
    finally { setReportLoading(false) }
  }

  const filterReports = async () => {
    if (!reportModal) return
    setReportLoading(true)
    try {
      const params: any = {}
      if (reportFrom) params.from = reportFrom
      if (reportTo) params.to = reportTo
      const r = await api.get(`/daily-reports/student/${reportModal.id}`, { params })
      setReports(r.data)
    } catch { } finally { setReportLoading(false) }
  }

  const loadFoodDays = async (from?: string, to?: string) => {
    if (!reportModal) return
    setFoodDaysLoading(true)
    setFoodLogDate(null)
    setFoodLogs([])
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await api.get(`/nutrition/student/${reportModal.id}/log-days`, { params })
      setFoodDays(data || [])
    } catch { setFoodDays([]) }
    finally { setFoodDaysLoading(false) }
  }

  const loadFoodLogs = async (date: string) => {
    if (!reportModal) return
    setFoodLogDate(date)
    setFoodLogLoading(true)
    try {
      const { data } = await api.get(`/nutrition/student/${reportModal.id}/logs`, { params: { date } })
      setFoodLogs(data || [])
    } catch { setFoodLogs([]) }
    finally { setFoodLogLoading(false) }
  }

  const exportReports = async () => {
    if (!reportModal) return
    setExportingReport(true)
    try {
      const params: any = {}
      if (reportFrom) params.from = reportFrom
      if (reportTo) params.to = reportTo
      const r = await api.get(`/daily-reports/student/${reportModal.id}/export`, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `reportes_${reportModal.firstName}_${reportModal.lastName}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { setMsg({ ok: false, text: 'Error al exportar' }) }
    finally { setExportingReport(false) }
  }

  // ── New feature functions ──
  const loadStudentActivity = async (student: any) => {
    setActivityModal(student)
    setActivityData(null)
    try {
      const r = await api.get(`/trainer/students/${student.id}/activity`)
      setActivityData(r.data)
    } catch { setActivityData({ error: true }) }
  }

  const loadNoteHistory = async (student: any) => {
    setNoteHistoryModal(student)
    setNoteHistory([])
    setNoteHistoryLoading(true)
    try {
      const r = await api.get(`/trainer/students/${student.id}/note-history`)
      setNoteHistory(r.data)
    } catch { setNoteHistory([]) }
    finally { setNoteHistoryLoading(false) }
  }

  const loadWeightProgress = async (student: any) => {
    setWeightModal(student)
    setWeightData([])
    setWeightLoading(true)
    try {
      const r = await api.get(`/trainer/students/${student.id}/weight-progress`)
      setWeightData(r.data)
    } catch { setWeightData([]) }
    finally { setWeightLoading(false) }
  }

  // ── Stats ──
  const stats = {
    total:  students.length,
    green:  students.filter(s => s.trafficLight === 'GREEN').length,
    yellow: students.filter(s => s.trafficLight === 'YELLOW').length,
    red:    students.filter(s => s.trafficLight === 'RED').length,
  }

  const SCALE_LABELS: Record<string, { label: string; color: string }> = {
    MUY_MALO:    { label: 'Muy malo',    color: '#ef4444' },
    MALO:        { label: 'Malo',         color: '#f97316' },
    NORMAL:      { label: 'Normal',       color: '#eab308' },
    BUENO:       { label: 'Bueno',        color: '#84cc16' },
    MUY_BUENO:   { label: 'Muy bueno',   color: '#22c55e' },
    BAJA:        { label: 'Baja',         color: '#ef4444' },
    ALTA:        { label: 'Alta',         color: '#22c55e' },
    AUSENTE:     { label: 'Ausente',      color: '#22c55e' },
    SOPORTABLE:  { label: 'Soportable',   color: '#84cc16' },
    FUERTE:      { label: 'Fuerte',       color: '#f97316' },
    INSOPORTABLE:{ label: 'Insoportable', color: '#ef4444' },
    NADA:        { label: 'Nada',         color: '#22c55e' },
    POCO:        { label: 'Poco',         color: '#84cc16' },
    MUCHO:       { label: 'Mucho',        color: '#f97316' },
    MUCHISIMO:   { label: 'Muchísimo',   color: '#ef4444' },
    BAJO:        { label: 'Bajo',         color: '#84cc16' },
    ALTO:        { label: 'Alto',         color: '#f97316' },
    MUY_ALTO:    { label: 'Muy alto',    color: '#ef4444' },
    MUY_BAJA:    { label: 'Muy baja',    color: '#ef4444' },
    MUY_ALTA:    { label: 'Muy alta',    color: '#22c55e' },
    SI:          { label: 'Sí',          color: '#ec4899' },
    NO:          { label: 'No',          color: '#6b7280' },
    RETRASO:     { label: 'Retraso',     color: '#f97316' },
    OVULACION:   { label: 'Ovulación',  color: '#8b5cf6' },
  }

  const Chip = ({ value }: { value?: string }) => {
    if (!value) return <span className="text-gray-300 text-xs">—</span>
    const meta = SCALE_LABELS[value]
    if (!meta) return <span className="text-xs text-gray-600">{value}</span>
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: meta.color }}>
        {meta.label}
      </span>
    )
  }

  const tlColor = (tl: string) => {
    if (tl === 'GREEN')  return 'bg-green-500'
    if (tl === 'YELLOW') return 'bg-yellow-400'
    if (tl === 'RED')    return 'bg-red-500'
    return 'bg-gray-300'
  }

  const tlEmoji = (tl: string) => {
    if (tl === 'GREEN')  return '🟢'
    if (tl === 'YELLOW') return '🟡'
    if (tl === 'RED')    return '🔴'
    return '⚪'
  }

  const deleteMeasurement = async (measurementId: string) => {
    if (!confirm('¿Eliminar este registro de medidas y sus fotos?')) return
    try {
      await api.delete(`/measurements/student/measurement/${measurementId}`)
      toast.success('Medición eliminada')
      // Reload measurements
      if (measModal) {
        const r = await api.get(`/measurements/student/${measModal.id}`)
        setMeasHistory(r.data)
      }
    } catch { toast.error('Error al eliminar') }
  }

  const sHas = (s: any, feature: string) => {
    const f: string[] = s.features || []
    return f.length === 0 || f.includes(feature) // if no features assigned, show all
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'students', label: 'Mis Asesorados', icon: Users },
    { id: 'code',     label: 'Mi Código',      icon: Link },
    { id: 'gym',      label: 'Mi Gimnasio',    icon: Dumbbell },
    { id: 'cv',       label: 'Hoja de Vida',   icon: Upload },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel del Entrenador</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {msg.text}
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div>
          {/* Stats */}
          {students.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total',     value: stats.total,  color: 'bg-gray-50 border-gray-200 text-gray-700' },
                { label: '🟢 Verde',  value: stats.green,  color: 'bg-green-50 border-green-200 text-green-700' },
                { label: '🟡 Amarillo',value: stats.yellow, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                { label: '🔴 Rojo',   value: stats.red,    color: 'bg-red-50 border-red-200 text-red-700' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium opacity-70">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Buscar por nombre, correo o cédula..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadStudents()} />
            <select className="input w-40" value={trafficFilter} onChange={e => setTrafficFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="GREEN">🟢 Verde</option>
              <option value="YELLOW">🟡 Amarillo</option>
              <option value="RED">🔴 Rojo</option>
            </select>
            <button onClick={loadStudents} className="btn-primary">Buscar</button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Cargando...</p>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>No tienes asesorados aún</p>
              <p className="text-sm mt-1">Comparte tu código para que los usuarios se vinculen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <div key={s.id} className="card">
                  {/* Student info row */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      s.trafficLight === 'GREEN' ? 'bg-green-500' : s.trafficLight === 'YELLOW' ? 'bg-yellow-400' : s.trafficLight === 'RED' ? 'bg-red-500' : 'bg-gray-300'
                    }`}>
                      {s.firstName?.[0]}{s.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800">{s.firstName} {s.lastName}</p>
                        <span className="text-sm">{tlEmoji(s.trafficLight)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{s.email} {s.idNumber && `· CC ${s.idNumber}`}</p>
                      {/* Action buttons - below info on all screens */}
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        <button onClick={() => sendReminder(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors">
                          <Bell size={13} /> Recordatorio
                        </button>
                        {sHas(s, 'trainer_notes') && (
                          <button onClick={() => { setNoteModal(s); setNoteText('') }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-amber-600 hover:bg-amber-50 border border-gray-200 rounded-lg transition-colors">
                            <MessageSquare size={13} /> Enviar nota
                          </button>
                        )}
                        {sHas(s, 'video_sessions') && (
                          <button onClick={() => sendMeet(s.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 border border-gray-200 rounded-lg transition-colors">
                            <Video size={13} /> Video
                          </button>
                        )}
                        {sHas(s, 'trainer_tracking') && (
                          <button onClick={() => loadStudentMeasurements(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg transition-colors">
                            <Ruler size={13} /> Medidas
                          </button>
                        )}
                        {sHas(s, 'trainer_tracking') && (
                          <button onClick={() => loadStudentReports(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50 border border-gray-200 rounded-lg transition-colors">
                            <ClipboardList size={13} /> Reportes
                          </button>
                        )}
                        {sHas(s, 'trainer_tracking') && (
                          <button onClick={() => loadStudentActivity(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 border border-gray-200 rounded-lg transition-colors">
                            <BarChart2 size={13} /> Actividad
                          </button>
                        )}
                        {sHas(s, 'trainer_notes') && (
                          <button onClick={() => loadNoteHistory(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-lg transition-colors">
                            <History size={13} /> Notas
                          </button>
                        )}
                        {sHas(s, 'trainer_tracking') && (
                          <button onClick={() => loadWeightProgress(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-pink-600 hover:bg-pink-50 border border-gray-200 rounded-lg transition-colors">
                            <TrendingUp size={13} /> Peso
                          </button>
                        )}

                        <button onClick={() => removeStudent(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors">
                          <Trash2 size={13} /> Desvincular
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CODE TAB ── */}
      {tab === 'code' && (
        <div className="card max-w-md">
          <h2 className="font-bold text-gray-800 mb-2">Mi Código de Entrenador</h2>
          <p className="text-sm text-gray-500 mb-4">Comparte este código con tus clientes para que puedan vincularse a ti.</p>
          {codeData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-primary-300">
                <span className="text-2xl font-mono font-bold text-primary-700 tracking-widest flex-1">{codeData.trainerCode}</span>
                <button onClick={copyCode}
                  className={`p-2 rounded-lg transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}>
                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-sm text-gray-500"><span className="font-medium text-gray-700">{codeData.studentsCount}</span> asesorado(s) vinculados</p>
            </div>
          ) : <p className="text-gray-400">Cargando código...</p>}
        </div>
      )}

      {/* ── GYM TAB ── */}
      {tab === 'gym' && (
        <div className="card max-w-md">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Dumbbell size={18} /> Mi Gimnasio</h2>
          {myGym ? (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="font-bold text-gray-800">{myGym.name}</p>
                <p className="text-sm text-gray-500">{myGym.address}</p>
                {myGym.city && <p className="text-sm text-gray-500">{myGym.city}</p>}
              </div>
              <button onClick={leaveGym} className="btn-secondary flex items-center gap-2 text-sm">
                <Unlink size={16} /> Desvincularme del gimnasio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Ingresa el código del gimnasio para asociarte:</p>
              <div className="flex gap-2">
                <input className="input flex-1 uppercase font-mono tracking-widest" placeholder="GYM-XXXXX"
                  value={gymCode} onChange={e => setGymCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && joinGym()} />
                <button onClick={joinGym} className="btn-primary">Asociarme</button>
              </div>
            </div>
          )}
          {gymMsg && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${gymMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {gymMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {gymMsg.text}
            </div>
          )}
        </div>
      )}

      {/* ── CV TAB ── */}
      {tab === 'cv' && (
        <div className="card max-w-md">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Upload size={18} /> Hoja de Vida</h2>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-3">Solo PDF, máximo 5MB</p>
              <input type="file" accept=".pdf" onChange={e => setCvFile(e.target.files?.[0] || null)} className="text-sm text-gray-600" />
            </div>
            {cvFile && <p className="text-sm text-gray-600">Archivo: <span className="font-medium">{cvFile.name}</span></p>}
            <button onClick={uploadCv} disabled={!cvFile} className="btn-primary w-full">Subir Hoja de Vida</button>
            {cvUrl && (
              <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                <Eye size={16} /> Ver CV actual
              </a>
            )}
            {cvMsg && (
              <div className={`flex items-center gap-2 text-sm ${cvMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {cvMsg.ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {cvMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEASUREMENTS MODAL ── */}
      {measModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Medidas — {measModal.firstName} {measModal.lastName}</h3>
              <button onClick={() => setMeasModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {measHistory.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setShowMeasChart(!showMeasChart)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    📈 {showMeasChart ? 'Ocultar gráfica' : 'Ver gráfica de evolución'}
                  </button>
                  {showMeasChart && (
                    <select className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                      value={measChartKey} onChange={e => setMeasChartKey(e.target.value)}>
                      <option value="weight">Peso (kg)</option>
                      <option value="chest">Pecho (cm)</option>
                      <option value="shoulders">Hombros (cm)</option>
                      <option value="rightBicep">Bícep D (cm)</option>
                      <option value="leftBicep">Bícep I (cm)</option>
                      <option value="abdomenAbove">Abd. ↑ ombligo (cm)</option>
                      <option value="abdomenNavel">Abd. ombligo (cm)</option>
                      <option value="abdomenBelow">Abd. ↓ ombligo (cm)</option>
                      <option value="glute">Glúteo (cm)</option>
                      <option value="rightThigh">Muslo D (cm)</option>
                      <option value="leftThigh">Muslo I (cm)</option>
                    </select>
                  )}
                </div>
                {showMeasChart && (() => {
                  const chartData = [...measHistory].reverse().map(h => ({
                    date: new Date(h.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
                    value: h[measChartKey] ? Number(h[measChartKey]) : undefined,
                  })).filter(d => d.value !== undefined)
                  const first = chartData[0]?.value
                  const last  = chartData[chartData.length - 1]?.value
                  const diff  = last && first ? (last - first).toFixed(1) : null
                  const isGood = measChartKey === 'weight'
                    ? (diff !== null && Number(diff) <= 0)
                    : (diff !== null && Number(diff) <= 0)
                  return (
                    <div className="bg-gray-50 rounded-xl p-3">
                      {diff !== null && (
                        <div className="flex gap-4 mb-2 text-xs text-center">
                          <div className="flex-1 bg-white rounded-lg p-2">
                            <p className="text-gray-400">Inicio</p>
                            <p className="font-bold text-gray-700">{first} {measChartKey === 'weight' ? 'kg' : 'cm'}</p>
                          </div>
                          <div className="flex-1 bg-white rounded-lg p-2">
                            <p className="text-gray-400">Actual</p>
                            <p className="font-bold text-gray-700">{last} {measChartKey === 'weight' ? 'kg' : 'cm'}</p>
                          </div>
                          <div className={`flex-1 rounded-lg p-2 ${isGood ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-gray-400">Cambio</p>
                            <p className={`font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>{Number(diff) > 0 ? '+' : ''}{diff} {measChartKey === 'weight' ? 'kg' : 'cm'}</p>
                          </div>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="measGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#64ba30" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#64ba30" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                          <Tooltip formatter={(v: any) => [`${v} ${measChartKey === 'weight' ? 'kg' : 'cm'}`]} />
                          <Area type="monotone" dataKey="value" stroke="#64ba30" strokeWidth={2}
                            fill="url(#measGrad)" dot={{ r: 3, fill: '#64ba30' }} connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </div>
            )}
            {measHistory.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Este asesorado no tiene medidas registradas aún.</p>
            ) : (
              <div className="space-y-3">
                {measHistory.map((h: any) => (
                  <div key={h.id} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                        onClick={() => setMeasExpanded(measExpanded === h.id ? null : h.id)}>
                        {new Date(h.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteMeasurement(h.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar medición">
                          <Trash2 size={14} />
                        </button>
                        <div className="cursor-pointer" onClick={() => setMeasExpanded(measExpanded === h.id ? null : h.id)}>
                          {measExpanded === h.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>
                    {measExpanded === h.id && (
                      <div className="p-3 grid grid-cols-2 gap-2 text-sm">
                        {[['chest','Pecho'],['shoulders','Hombros'],['rightBicep','Bícep D'],['leftBicep','Bícep I'],
                          ['abdomenAbove','Abd. ↑ ombligo'],['abdomenNavel','Abd. ombligo'],['abdomenBelow','Abd. ↓ ombligo'],
                          ['glute','Glúteo'],['rightThigh','Muslo D'],['leftThigh','Muslo I'],['weight','Peso']
                        ].filter(([k]) => h[k]).map(([k, label]) => (
                          <div key={k} className="flex justify-between bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{h[k]} {k === 'weight' ? 'kg' : 'cm'}</span>
                          </div>
                        ))}
                        {[h.photoUrl, h.photoUrl2, h.photoUrl3, h.photoUrl4].filter(Boolean).length > 0 && (
                          <div className="col-span-2 mt-1">
                            <p className="text-xs text-gray-400 mb-1">📷 Fotos</p>
                            <div className="flex gap-2 flex-wrap">
                              {[h.photoUrl, h.photoUrl2, h.photoUrl3, h.photoUrl4].filter(Boolean).map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PLAN MODAL ── */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Plan — {planModal.firstName} {planModal.lastName}</h3>
              <button onClick={() => setPlanModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {planData ? (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 grid grid-cols-2 gap-2">
                {planData.weightKg    && <span>Peso: {planData.weightKg}kg</span>}
                {planData.heightCm    && <span>Altura: {planData.heightCm}cm</span>}
                {planData.goalType    && <span>Objetivo: {planData.goalType}</span>}
                {planData.activityLevel && <span>Actividad: {planData.activityLevel}</span>}
                {planData.trainerOverride && <span className="col-span-2 text-blue-600 font-medium">⚠️ Plan personalizado por entrenador</span>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">El asesorado no tiene perfil registrado aún.</p>
            )}
            <div className="space-y-3">
              {[
                { key: 'dailyCalories',     label: 'Calorías',        unit: 'kcal' },
                { key: 'dailyProteinG',     label: 'Proteínas',       unit: 'g/día' },
                { key: 'dailyCarbsG',       label: 'Carbohidratos',   unit: 'g/día' },
                { key: 'dailyFatG',         label: 'Grasas',          unit: 'g/día' },
                { key: 'dailyWaterGlasses', label: '💧 Agua',         unit: 'vasos' },
                { key: 'dailySteps',        label: '🚶 Pasos diarios', unit: 'pasos' },
              ].map(({ key, label, unit }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</label>
                  <input type="number" className="input flex-1" placeholder="0"
                    value={(planForm as any)[key]}
                    onChange={e => setPlanForm(f => ({ ...f, [key]: e.target.value }))} />
                  <span className="text-xs text-gray-400 w-12">{unit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              {planData && (
                <button onClick={resetPlan} className="btn-secondary flex items-center gap-2 text-sm">
                  <RotateCcw size={14} /> Restaurar
                </button>
              )}
              <button onClick={savePlanOverride} disabled={planSaving}
                className="btn-primary flex items-center gap-2 flex-1 justify-center">
                <Save size={16} /> {planSaving ? 'Guardando...' : 'Guardar plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE MODAL ── */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-amber-500" />
                Nota para {noteModal.firstName} {noteModal.lastName}
              </h3>
              <button onClick={() => setNoteModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">El usuario verá esta nota al iniciar sesión.</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Escribe tu nota o recomendación..." rows={4}
              className="input w-full resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setNoteModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={sendNote} disabled={noteSending || !noteText.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={16} /> {noteSending ? 'Enviando...' : 'Enviar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY MODAL ── */}
      {activityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-cyan-500" />
                Actividad — {activityModal.firstName} {activityModal.lastName}
              </h3>
              <button onClick={() => setActivityModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {!activityData ? (
              <p className="text-gray-400 text-center py-8">Cargando...</p>
            ) : activityData.error ? (
              <p className="text-red-400 text-center py-8">Error al cargar datos</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-xl p-3 text-center ${activityData.daysInactive === 0 ? 'bg-green-50 border border-green-200' : activityData.daysInactive <= 2 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-2xl font-bold ${activityData.daysInactive === 0 ? 'text-green-600' : activityData.daysInactive <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {activityData.daysInactive}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">días sin registro</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{activityData.adherence}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">adherencia 30d</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-700">
                      {activityData.lastLog
                        ? new Date(activityData.lastLog + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">último registro</p>
                  </div>
                </div>

                {activityData.daysInactive > 2 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                      <AlertCircle size={14} /> ¡Este asesorado lleva {activityData.daysInactive} días sin registrar!
                    </p>
                    <button onClick={() => { sendReminder(activityModal.id); setActivityModal(null) }}
                      className="mt-2 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                      Enviar recordatorio ahora
                    </button>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Adherencia últimos 30 días</span>
                    <span className="text-xs font-bold text-gray-700">{activityData.adherence}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${activityData.adherence}%`,
                      backgroundColor: activityData.adherence >= 70 ? '#22c55e' : activityData.adherence >= 40 ? '#eab308' : '#ef4444'
                    }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {activityData.adherence >= 70 ? '🟢 Excelente adherencia' : activityData.adherence >= 40 ? '🟡 Adherencia regular' : '🔴 Adherencia baja — requiere atención'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOTE HISTORY MODAL ── */}
      {noteHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <History size={18} className="text-orange-500" />
                Notas enviadas — {noteHistoryModal.firstName}
              </h3>
              <button onClick={() => setNoteHistoryModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {noteHistoryLoading ? (
                <p className="text-gray-400 text-center py-8">Cargando...</p>
              ) : noteHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <History size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No has enviado notas a este asesorado aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {noteHistory.map((n: any) => (
                    <div key={n.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="text-sm text-gray-700">{n.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {n.isRead
                          ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11} /> Leída</span>
                          : <span className="text-xs text-gray-400">Sin leer</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 pt-3 border-t border-gray-100 mt-3">
              <button onClick={() => { setNoteHistoryModal(null); setNoteModal(noteHistoryModal); setNoteText('') }}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <MessageSquare size={15} /> Enviar nueva nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WEIGHT PROGRESS MODAL ── */}
      {weightModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-pink-500" />
                Progreso de peso — {weightModal.firstName} {weightModal.lastName}
              </h3>
              <button onClick={() => setWeightModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {weightLoading ? (
              <p className="text-gray-400 text-center py-12">Cargando...</p>
            ) : weightData.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Este asesorado no ha registrado su peso en los reportes diarios aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Inicio', value: `${weightData[0]?.weight} kg`, color: 'bg-gray-50' },
                    { label: 'Actual', value: `${weightData[weightData.length-1]?.weight} kg`, color: 'bg-blue-50' },
                    { label: 'Cambio', value: `${(weightData[weightData.length-1]?.weight - weightData[0]?.weight).toFixed(1)} kg`,
                      color: (weightData[weightData.length-1]?.weight - weightData[0]?.weight) <= 0 ? 'bg-green-50' : 'bg-red-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border border-gray-100`}>
                      <p className="text-lg font-bold text-gray-800">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }}
                        tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} />
                      <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip
                        labelFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                        formatter={(v: any) => [`${v} kg`, 'Peso']} />
                      <Line type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 text-center">{weightData.length} registros de peso</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DAILY REPORTS MODAL ── */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{reportModal.firstName} {reportModal.lastName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Panel de seguimiento</p>
              </div>
              <button onClick={() => setReportModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={22} /></button>
            </div>
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl flex-shrink-0">
              <button onClick={() => setReportTab('plan')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${reportTab === 'plan' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Plan Nutricional</button>
              <button onClick={() => setReportTab('reports')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${reportTab === 'reports' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Reportes Diarios</button>
              <button onClick={() => { setReportTab('foods'); loadFoodDays() }} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${reportTab === 'foods' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Comidas</button>
            </div>
            {reportTab === 'plan' && (
              <div className="overflow-y-auto flex-1">
                <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-purple-700">Plan Nutricional {planData?.trainerOverride ? '(Personalizado)' : ''}</p>
                    {planData && <button onClick={resetPlan} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><RotateCcw size={11} /> Restaurar</button>}
                  </div>
                  {planData ? (
                    <div className="grid grid-cols-4 gap-2 mb-4 bg-white rounded-lg p-3">
                      <div className="text-center"><p className="text-xs text-gray-400">Calorias</p><p className="text-sm font-bold text-gray-700">{planData.dailyCalories ? Math.round(planData.dailyCalories) : '-'} kcal</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Proteina</p><p className="text-sm font-bold text-gray-700">{planData.dailyProteinG ? Math.round(planData.dailyProteinG) : '-'} g</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Carbos</p><p className="text-sm font-bold text-gray-700">{planData.dailyCarbsG ? Math.round(planData.dailyCarbsG) : '-'} g</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Grasas</p><p className="text-sm font-bold text-gray-700">{planData.dailyFatG ? Math.round(planData.dailyFatG) : '-'} g</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Agua</p><p className="text-sm font-bold text-gray-700">{planData.dailyWaterGlasses || '-'} vasos</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Pasos</p><p className="text-sm font-bold text-gray-700">{planData.dailySteps || '-'}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Objetivo</p><p className="text-sm font-bold text-gray-700">{planData.goalType === 'LOSE' ? 'Perder' : planData.goalType === 'GAIN' ? 'Ganar' : 'Mantener'}</p></div>
                      <div className="text-center"><p className="text-xs text-gray-400">Actividad</p><p className="text-sm font-bold text-gray-700">{planData.activityLevel || '-'}</p></div>
                    </div>
                  ) : <p className="text-xs text-gray-400 mb-4">Sin perfil registrado aun.</p>}
                  <p className="text-xs font-semibold text-purple-600 mb-2">Ajustar valores:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'dailyCalories', label: 'Calorias', unit: 'kcal' },
                      { key: 'dailyProteinG', label: 'Proteinas', unit: 'g' },
                      { key: 'dailyCarbsG', label: 'Carbos', unit: 'g' },
                      { key: 'dailyFatG', label: 'Grasas', unit: 'g' },
                      { key: 'dailyWaterGlasses', label: 'Agua', unit: 'vasos' },
                      { key: 'dailySteps', label: 'Pasos', unit: 'pasos' },
                    ].map(({ key, label, unit }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                        <div className="flex items-center gap-1">
                          <input type="number" className="input text-xs py-1 px-2 flex-1" value={(planForm as any)[key]} onChange={e => setPlanForm(f => ({ ...f, [key]: e.target.value }))} />
                          <span className="text-xs text-gray-400">{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={savePlanOverride} disabled={planSaving} className="mt-3 w-full text-xs py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-1 disabled:opacity-50">
                    <Save size={12} /> {planSaving ? 'Guardando...' : 'Guardar plan'}
                  </button>
                </div>
              </div>
            )}
            {reportTab === 'reports' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-gray-500"><Calendar size={14} /> Desde:</div>
                  <input type="date" className="input text-sm py-1.5 px-2" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                  <div className="flex items-center gap-1 text-sm text-gray-500">Hasta:</div>
                  <input type="date" className="input text-sm py-1.5 px-2" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                  <button onClick={filterReports} className="btn-primary text-sm py-1.5 px-3">Filtrar</button>
                  <button onClick={exportReports} disabled={exportingReport || reports.length === 0} className="flex items-center gap-1.5 text-sm py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-40">
                    <Download size={14} /> {exportingReport ? 'Exportando...' : 'Exportar Excel'}
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {reportLoading ? (
                    <p className="text-gray-400 text-center py-12">Cargando reportes...</p>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin reportes diarios aun.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((r: any) => (
                        <div key={r.id} className="border border-gray-100 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <p className="font-medium text-gray-800 text-sm">
                              {new Date(r.reportDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            {r.weightKg && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{r.weightKg} kg</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {r.performance   && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Rendimiento: </span><span className="font-medium text-gray-700">{r.performance}</span></div>}
                            {r.motivation    && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Motivacion: </span><span className="font-medium text-gray-700">{r.motivation}</span></div>}
                            {r.hunger        && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Hambre: </span><span className="font-medium text-gray-700">{r.hunger}</span></div>}
                            {r.fatigue       && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Fatiga: </span><span className="font-medium text-gray-700">{r.fatigue}</span></div>}
                            {r.stress        && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Estres: </span><span className="font-medium text-gray-700">{r.stress}</span></div>}
                            {r.sleepHours    && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Sueno: </span><span className="font-medium text-gray-700">{r.sleepHours}h</span></div>}
                            {r.sleepQuality  && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Calidad sueno: </span><span className="font-medium text-gray-700">{r.sleepQuality}</span></div>}
                            {r.mood          && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Estado animo: </span><span className="font-medium text-gray-700">{r.mood}</span></div>}

                            {r.period        && <div className="bg-gray-50 rounded-lg px-2 py-1"><span className="text-gray-400">Periodo: </span><span className="font-medium text-gray-700">{r.period}</span></div>}
                            {r.symptoms?.length > 0 && <div className="bg-gray-50 rounded-lg col-span-2 px-2 py-1"><span className="text-gray-400">Sintomas: </span><span className="font-medium text-gray-700">{r.symptoms.join(', ')}</span></div>}
                          </div>
                          {r.otherNotes && <p className="mt-2 text-xs text-gray-500 italic border-t pt-2">{r.otherNotes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {reportTab === 'foods' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Filter bar */}
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <input type="date" className="input text-xs py-1.5 px-2" value={foodDateFrom} onChange={e => setFoodDateFrom(e.target.value)} placeholder="Desde" />
                  <span className="text-xs text-gray-400">-</span>
                  <input type="date" className="input text-xs py-1.5 px-2" value={foodDateTo} onChange={e => setFoodDateTo(e.target.value)} placeholder="Hasta" />
                  <button onClick={() => loadFoodDays(foodDateFrom, foodDateTo)} className="btn-primary text-xs py-1.5 px-3">Filtrar</button>
                  {foodLogDate && (
                    <button onClick={() => { setFoodLogDate(null); setFoodLogs([]) }} className="text-xs text-gray-400 hover:text-gray-600 underline">
                      Ver todos
                    </button>
                  )}
                </div>

                {!foodLogDate ? (
                  /* Days list */
                  <div className="overflow-y-auto flex-1">
                    {foodDaysLoading ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
                    ) : foodDays.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-sm">Sin registros de comidas</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {foodDays.map((day: any) => (
                          <button key={day.date} onClick={() => loadFoodLogs(day.date)}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 rounded-xl transition-all text-left">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <p className="text-xs text-gray-400">{day.count} alimentos registrados</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary-600">{Math.round(day.totalCalories)} kcal</p>
                              <p className="text-xs text-gray-400">P:{Math.round(day.totalProtein)}g C:{Math.round(day.totalCarbs)}g G:{Math.round(day.totalFat)}g</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Day detail */
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-700 flex-1">
                        {new Date(foodLogDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    {foodLogs.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3 bg-gray-50 rounded-xl p-3 flex-shrink-0">
                        <div className="text-center"><p className="text-xs text-gray-400">Calorias</p><p className="text-sm font-bold text-gray-700">{Math.round(foodLogs.reduce((a: number, l: any) => a + Number(l.calories || 0), 0))} kcal</p></div>
                        <div className="text-center"><p className="text-xs text-gray-400">Proteina</p><p className="text-sm font-bold text-gray-700">{Math.round(foodLogs.reduce((a: number, l: any) => a + Number(l.protein || 0), 0))} g</p></div>
                        <div className="text-center"><p className="text-xs text-gray-400">Carbos</p><p className="text-sm font-bold text-gray-700">{Math.round(foodLogs.reduce((a: number, l: any) => a + Number(l.carbs || 0), 0))} g</p></div>
                        <div className="text-center"><p className="text-xs text-gray-400">Grasas</p><p className="text-sm font-bold text-gray-700">{Math.round(foodLogs.reduce((a: number, l: any) => a + Number(l.fat || 0), 0))} g</p></div>
                      </div>
                    )}
                    <div className="overflow-y-auto flex-1">
                      {foodLogLoading ? (
                        <p className="text-center text-gray-400 py-8 text-sm">Cargando...</p>
                      ) : (
                        <div className="space-y-3">
                          {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as string[]).map((mealType: string) => {
                            const logs = foodLogs.filter((l: any) => l.mealType === mealType)
                            if (!logs.length) return null
                            const mealLabel = mealType === 'BREAKFAST' ? 'Desayuno' : mealType === 'LUNCH' ? 'Almuerzo' : mealType === 'DINNER' ? 'Cena' : 'Snack'
                            const totalCal = logs.reduce((a: number, l: any) => a + Number(l.calories || 0), 0)
                            return (
                              <div key={mealType} className="bg-gray-50 rounded-xl p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-semibold text-gray-700">{mealLabel}</p>
                                  <span className="text-xs font-bold text-primary-600">{Math.round(totalCal)} kcal</span>
                                </div>
                                <div className="space-y-1">
                                  {logs.map((l: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                                      <span>{l.foodItem?.name || l.foodName || l.customMealName || l.recipeName}</span>
                                      <span className="text-gray-400">{l.quantityGrams}g - {Math.round(l.calories || 0)} kcal</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

            {/* ── PLAN MODAL ── */}
      {planModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Plan — {planModal.firstName} {planModal.lastName}</h3>
              <button onClick={() => setPlanModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {planData ? (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 grid grid-cols-2 gap-2">
                {planData.weightKg    && <span>Peso: {planData.weightKg}kg</span>}
                {planData.heightCm    && <span>Altura: {planData.heightCm}cm</span>}
                {planData.goalType    && <span>Objetivo: {planData.goalType}</span>}
                {planData.activityLevel && <span>Actividad: {planData.activityLevel}</span>}
                {planData.trainerOverride && <span className="col-span-2 text-blue-600 font-medium">⚠️ Plan personalizado por entrenador</span>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">El asesorado no tiene perfil registrado aún.</p>
            )}
            <div className="space-y-3">
              {[
                { key: 'dailyCalories',     label: 'Calorías',        unit: 'kcal' },
                { key: 'dailyProteinG',     label: 'Proteínas',       unit: 'g/día' },
                { key: 'dailyCarbsG',       label: 'Carbohidratos',   unit: 'g/día' },
                { key: 'dailyFatG',         label: 'Grasas',          unit: 'g/día' },
                { key: 'dailyWaterGlasses', label: '💧 Agua',         unit: 'vasos' },
                { key: 'dailySteps',        label: '🚶 Pasos diarios', unit: 'pasos' },
              ].map(({ key, label, unit }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</label>
                  <input type="number" className="input flex-1" placeholder="0"
                    value={(planForm as any)[key]}
                    onChange={e => setPlanForm(f => ({ ...f, [key]: e.target.value }))} />
                  <span className="text-xs text-gray-400 w-12">{unit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              {planData && (
                <button onClick={resetPlan} className="btn-secondary flex items-center gap-2 text-sm">
                  <RotateCcw size={14} /> Restaurar
                </button>
              )}
              <button onClick={savePlanOverride} disabled={planSaving}
                className="btn-primary flex items-center gap-2 flex-1 justify-center">
                <Save size={16} /> {planSaving ? 'Guardando...' : 'Guardar plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTE MODAL ── */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-amber-500" />
                Nota para {noteModal.firstName} {noteModal.lastName}
              </h3>
              <button onClick={() => setNoteModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">El usuario verá esta nota al iniciar sesión.</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Escribe tu nota o recomendación..." rows={4}
              className="input w-full resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setNoteModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={sendNote} disabled={noteSending || !noteText.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={16} /> {noteSending ? 'Enviando...' : 'Enviar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY MODAL ── */}
      {activityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-cyan-500" />
                Actividad — {activityModal.firstName} {activityModal.lastName}
              </h3>
              <button onClick={() => setActivityModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {!activityData ? (
              <p className="text-gray-400 text-center py-8">Cargando...</p>
            ) : activityData.error ? (
              <p className="text-red-400 text-center py-8">Error al cargar datos</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-xl p-3 text-center ${activityData.daysInactive === 0 ? 'bg-green-50 border border-green-200' : activityData.daysInactive <= 2 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-2xl font-bold ${activityData.daysInactive === 0 ? 'text-green-600' : activityData.daysInactive <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {activityData.daysInactive}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">días sin registro</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{activityData.adherence}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">adherencia 30d</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-700">
                      {activityData.lastLog
                        ? new Date(activityData.lastLog + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">último registro</p>
                  </div>
                </div>

                {activityData.daysInactive > 2 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                      <AlertCircle size={14} /> ¡Este asesorado lleva {activityData.daysInactive} días sin registrar!
                    </p>
                    <button onClick={() => { sendReminder(activityModal.id); setActivityModal(null) }}
                      className="mt-2 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                      Enviar recordatorio ahora
                    </button>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Adherencia últimos 30 días</span>
                    <span className="text-xs font-bold text-gray-700">{activityData.adherence}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${activityData.adherence}%`,
                      backgroundColor: activityData.adherence >= 70 ? '#22c55e' : activityData.adherence >= 40 ? '#eab308' : '#ef4444'
                    }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {activityData.adherence >= 70 ? '🟢 Excelente adherencia' : activityData.adherence >= 40 ? '🟡 Adherencia regular' : '🔴 Adherencia baja — requiere atención'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOTE HISTORY MODAL ── */}
      {noteHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <History size={18} className="text-orange-500" />
                Notas enviadas — {noteHistoryModal.firstName}
              </h3>
              <button onClick={() => setNoteHistoryModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {noteHistoryLoading ? (
                <p className="text-gray-400 text-center py-8">Cargando...</p>
              ) : noteHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <History size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No has enviado notas a este asesorado aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {noteHistory.map((n: any) => (
                    <div key={n.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="text-sm text-gray-700">{n.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {new Date(n.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {n.isRead
                          ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11} /> Leída</span>
                          : <span className="text-xs text-gray-400">Sin leer</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 pt-3 border-t border-gray-100 mt-3">
              <button onClick={() => { setNoteHistoryModal(null); setNoteModal(noteHistoryModal); setNoteText('') }}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <MessageSquare size={15} /> Enviar nueva nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WEIGHT PROGRESS MODAL ── */}
      {weightModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-pink-500" />
                Progreso de peso — {weightModal.firstName} {weightModal.lastName}
              </h3>
              <button onClick={() => setWeightModal(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            {weightLoading ? (
              <p className="text-gray-400 text-center py-12">Cargando...</p>
            ) : weightData.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Este asesorado no ha registrado su peso en los reportes diarios aún.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Inicio', value: `${weightData[0]?.weight} kg`, color: 'bg-gray-50' },
                    { label: 'Actual', value: `${weightData[weightData.length-1]?.weight} kg`, color: 'bg-blue-50' },
                    { label: 'Cambio', value: `${(weightData[weightData.length-1]?.weight - weightData[0]?.weight).toFixed(1)} kg`,
                      color: (weightData[weightData.length-1]?.weight - weightData[0]?.weight) <= 0 ? 'bg-green-50' : 'bg-red-50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border border-gray-100`}>
                      <p className="text-lg font-bold text-gray-800">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }}
                        tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} />
                      <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip
                        labelFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                        formatter={(v: any) => [`${v} kg`, 'Peso']} />
                      <Line type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4, fill: '#ec4899' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-400 text-center">{weightData.length} registros de peso</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
