import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { Bell, Send, MessageSquare, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

export default function TrainerNotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [threads, setThreads] = useState<Record<string, any[]>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/trainer/notes/my')
      // Only show root notes (no parent)
      const rootNotes = data.filter((n: any) => !n.parentId)
      setNotes(rootNotes)
      // Mark as read
      await api.post('/trainer/notes/read').catch(() => {})
    } catch { setNotes([]) }
    finally { setLoading(false) }
  }

  const loadThread = async (noteId: string) => {
    if (expanded === noteId) { setExpanded(null); return }
    setExpanded(noteId)
    try {
      const { data } = await api.get(`/trainer/notes/${noteId}/thread`)
      setThreads(t => ({ ...t, [noteId]: data }))
    } catch { }
  }

  const sendReply = async (noteId: string) => {
    const text = replyText[noteId]?.trim()
    if (!text) return
    setSending(noteId)
    try {
      await api.post(`/trainer/notes/${noteId}/reply`, { message: text })
      setReplyText(r => ({ ...r, [noteId]: '' }))
      // Reload thread
      const { data } = await api.get(`/trainer/notes/${noteId}/thread`)
      setThreads(t => ({ ...t, [noteId]: data }))
    } catch { }
    finally { setSending(null) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Cargando notas...</div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
          <Bell size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Notas de tu Entrenador</h1>
          <p className="text-sm text-gray-500">{notes.length} mensaje(s) recibido(s)</p>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No tienes notas de tu entrenador aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Note header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-700">
                        {note.trainer?.firstName?.[0]}{note.trainer?.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {note.trainer?.firstName} {note.trainer?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                    </div>
                  </div>
                  {note.isRead && (
                    <span className="text-xs text-green-600 flex items-center gap-1 flex-shrink-0">
                      <CheckCircle size={12} /> Leída
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.message}</p>
              </div>

              {/* Thread toggle */}
              <button
                onClick={() => loadThread(note.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                <span className="flex items-center gap-2">
                  <MessageSquare size={14} />
                  {threads[note.id]?.length > 1
                    ? `${threads[note.id].length - 1} respuesta(s)`
                    : 'Responder'}
                </span>
                {expanded === note.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {/* Thread */}
              {expanded === note.id && (
                <div className="border-t border-gray-100">
                  {/* Replies */}
                  {threads[note.id]?.filter((m: any) => m.id !== note.id).map((msg: any) => (
                    <div key={msg.id} className={`p-3 border-b border-gray-50 ${
                      msg.author === 'USER' ? 'bg-primary-50' : 'bg-amber-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          msg.author === 'USER' ? 'text-primary-700' : 'text-amber-700'
                        }`}>
                          {msg.author === 'USER' ? '👤 Tú' : `🏋️ ${msg.trainer?.firstName || 'Entrenador'}`}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}

                  {/* Reply input */}
                  <div className="p-3 flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="Escribe tu respuesta..."
                      value={replyText[note.id] || ''}
                      onChange={e => setReplyText(r => ({ ...r, [note.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && sendReply(note.id)}
                    />
                    <button
                      onClick={() => sendReply(note.id)}
                      disabled={sending === note.id || !replyText[note.id]?.trim()}
                      className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-40 transition-colors">
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
