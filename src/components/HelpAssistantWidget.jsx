import { useState } from 'react';
import api from '../services/api';
import { buildWaMeUrl } from '../utils/whatsappSupport';
import { MessageCircle, HelpCircle } from 'lucide-react';

export default function HelpAssistantWidget({ modulo = 'platform' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/help/ask', { modulo, query });
      setResult(res.data?.data);
    } finally {
      setLoading(false);
    }
  };

  const escalate = async () => {
    await api.post('/help/escalate', { modulo, query });
    window.open(buildWaMeUrl('573192635819', `Hola, necesito ayuda (${modulo}): ${query}`), '_blank');
  };

  if (!open) {
    return (
      <button type="button" className="fixed bottom-6 right-6 btn-primary rounded-full p-4 shadow-lg z-40" onClick={() => setOpen(true)} title="Ayuda">
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 max-w-[calc(100vw-2rem)] card shadow-xl z-50 space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-semibold">Asistente {modulo.toUpperCase()}</p>
        <button type="button" className="text-stone-500" onClick={() => setOpen(false)}>×</button>
      </div>
      <form onSubmit={ask} className="flex gap-2">
        <input className="input flex-1" placeholder="¿En qué te ayudo?" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={loading}>→</button>
      </form>
      {result?.matched && (
        <div className="bg-lime-50 rounded-xl p-3 text-sm">
          <p className="font-medium">{result.pregunta}</p>
          <p>{result.answer}</p>
        </div>
      )}
      {result && !result.matched && (
        <div className="text-sm text-stone-600">
          <p>No encontré una respuesta exacta.</p>
          <ul className="mt-2 space-y-1">
            {(result.suggestions || []).map((s) => <li key={s.id}>• {s.pregunta}</li>)}
          </ul>
          <button type="button" className="btn-secondary w-full mt-2 inline-flex justify-center gap-2" onClick={escalate}>
            <MessageCircle className="w-4 h-4" /> Contactar soporte WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
