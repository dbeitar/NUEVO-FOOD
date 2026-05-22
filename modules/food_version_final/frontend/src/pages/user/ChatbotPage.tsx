import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../services/api'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'

interface Message { role: 'user' | 'assistant'; content: string; ts: Date }

const SUGGESTION_CATEGORIES = [
  {
    label: '🍗 Alimentos',
    questions: [
      '¿Qué puedo comer si no tengo pollo?',
      '¿Con qué reemplazo el arroz?',
      '¿Qué alimentos tienen más proteína?',
      '¿Qué snacks saludables puedo comer?',
      '¿Qué frutas son mejores para bajar de peso?',
      '¿Qué verduras tienen más fibra?',
      '¿Puedo comer pan integral a dieta?',
      '¿Qué legumbres me recomiendas?',
      '¿El aguacate engorda?',
      '¿Qué alimentos evitar en la noche?',
      '¿Qué alimentos aceleran el metabolismo?',
      '¿El huevo completo o solo la clara?',
      '¿Qué leche es más saludable?',
      '¿Cómo reemplazo el azúcar en mis comidas?',
      '¿Qué proteínas vegetales puedo comer?',
      '¿El atún en lata es buena opción?',
      '¿Qué comer cuando tengo antojo de dulce?',
    ],
  },
  {
    label: '⚖️ Peso y metas',
    questions: [
      '¿Cuántas calorías necesito para perder peso?',
      '¿Cómo puedo ganar masa muscular?',
      '¿Qué es un déficit calórico?',
      '¿Cuánta proteína debo consumir al día?',
      '¿Cómo calculo mis macros?',
      '¿Cuánto peso puedo perder por semana de forma saludable?',
      '¿Por qué no bajo de peso si como poco?',
      '¿Qué es el efecto rebote y cómo evitarlo?',
      '¿Cuántas calorías necesito para mantener mi peso?',
      '¿El peso en la báscula puede engañar?',
      '¿Qué es la retención de líquidos?',
      '¿Por qué me estanqué en mi proceso de pérdida de peso?',
      '¿Cómo aumentar el metabolismo?',
      '¿Qué es el peso ideal según mi estatura?',
      '¿Cuánto tiempo tarda en verse resultados?',
    ],
  },
  {
    label: '🥗 Nutrición',
    questions: [
      '¿Cómo puedo cumplir mis macros?',
      '¿Qué son los macronutrientes?',
      '¿Debo comer carbohidratos en la noche?',
      '¿Cuánta agua debo tomar al día?',
      '¿Qué es el ayuno intermitente?',
      '¿Cada cuántas horas debo comer?',
      '¿Qué son las calorías vacías?',
      '¿Las grasas saludables engordan?',
      '¿Qué es el índice glucémico?',
      '¿Cómo leer las etiquetas nutricionales?',
      '¿El sodio es malo para la dieta?',
      '¿Qué es la fibra dietética y para qué sirve?',
      '¿Qué es el colesterol bueno y malo?',
      '¿Puedo tomar café a dieta?',
      '¿Las bebidas light son saludables?',
      '¿Qué es la dieta mediterránea?',
    ],
  },
  {
    label: '🏋️ Entrenamiento',
    questions: [
      '¿Qué debo comer antes de entrenar?',
      '¿Qué debo comer después de entrenar?',
      '¿Es mejor hacer cardio en ayunas?',
      '¿Qué suplementos me recomiendas?',
      '¿La creatina sirve para perder peso?',
      '¿Qué es la ventana anabólica?',
      '¿Cuántas comidas al día son ideales si entreno?',
      '¿Debo tomar proteína en polvo?',
      '¿El cardio quema músculo?',
      '¿Qué comer si entreno en las mañanas?',
      '¿Qué comer si entreno en las noches?',
      '¿La cafeína mejora el rendimiento?',
      '¿Qué es el BCAA y para qué sirve?',
      '¿Cuánto tiempo antes de entrenar debo comer?',
      '¿Cómo evitar el cansancio extremo después de entrenar?',
      '¿Es malo entrenar con el estómago vacío?',
    ],
  },
]

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente nutricional. Puedes preguntarme sobre alimentos, macronutrientes, reemplazos y cómo alcanzar tus metas. ¿En qué puedo ayudarte?', ts: new Date() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)
  const { user } = useSelector((s: RootState) => s.auth)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Load user profile for personalized responses
  useEffect(() => {
    api.get('/nutrition-plan/my-profile').then(r => {
      if (r.data) setUserProfile(r.data)
    }).catch(() => {})
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setShowSuggestions(false)

    const userMsg: Message = { role: 'user', content: text, ts: new Date() }
    const currentMessages = [...messages, userMsg]
    setMessages(currentMessages)
    setInput('')
    setLoading(true)

    const history = currentMessages
      .slice(1)
      .slice(-11, -1)
      .map(m => ({ role: m.role, content: m.content }))

    // Build context from user profile
    const context = userProfile ? {
      name:          user?.firstName,
      gender:        userProfile.gender,
      age:           userProfile.birthDate
                       ? Math.floor((Date.now() - new Date(userProfile.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                       : null,
      weightKg:      userProfile.weightKg,
      heightCm:      userProfile.heightCm,
      goalType:      userProfile.goalType,
      activityLevel: userProfile.activityLevel,
      dailyCalories: userProfile.dailyCalories,
      dailyProteinG: userProfile.dailyProteinG,
      dailyCarbsG:   userProfile.dailyCarbsG,
      dailyFatG:     userProfile.dailyFatG,
      hasDietaryRestrictions:   userProfile.hasDietaryRestrictions,
      dietaryRestrictionsDetail: userProfile.dietaryRestrictionsDetail,
    } : { name: user?.firstName }

    try {
      const { data } = await api.post('/nutrition/chatbot', { message: text, history, context })
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.response || data.message || 'Sin respuesta',
        ts: new Date(),
      }])
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu consulta. Por favor intenta de nuevo.',
        ts: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-700 rounded-xl flex items-center justify-center">
          <Bot size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Asistente Nutricional</h1>
          <p className="text-sm text-gray-500">Pregúntame sobre nutrición, macros y alimentos</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-3 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'assistant' ? 'bg-primary-700' : 'bg-gray-200'}`}>
              {m.role === 'assistant' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-gray-600" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              m.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800' : 'bg-primary-700 text-white'
            }`}>
              {m.role === 'assistant' ? (
                <div className="space-y-1.5">
                  {m.content.split('\n').filter(l => l.trim()).map((line, i) => {
                    const isBullet = /^[-•*]\s/.test(line.trim()) || /^\d+[.)\s]/.test(line.trim())
                    const cleaned = line.replace(/^[-•*\d.)]\s*/, '').trim()
                    if (isBullet) return (
                      <div key={i} className="flex gap-2">
                        <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">•</span>
                        <span>{cleaned}</span>
                      </div>
                    )
                    return <p key={i}>{line}</p>
                  })}
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions panel — collapsible */}
      <div className="mb-2 border border-gray-200 rounded-2xl overflow-hidden bg-white">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <span className="font-medium flex items-center gap-2">
            💡 Preguntas sugeridas
          </span>
          {showSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showSuggestions && (
          <div className="border-t border-gray-100">
            {/* Category tabs */}
            <div className="flex gap-1 px-3 pt-2 overflow-x-auto">
              {SUGGESTION_CATEGORIES.map((cat, i) => (
                <button key={cat.label} onClick={() => setActiveCategory(i)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all flex-shrink-0 ${
                    activeCategory === i
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Questions */}
            <div className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-hide">
              {SUGGESTION_CATEGORIES[activeCategory].questions.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-3 py-1.5 hover:bg-primary-100 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          className="input-field flex-1" placeholder="Escribe tu consulta nutricional..." disabled={loading} />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="btn-primary px-4">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
