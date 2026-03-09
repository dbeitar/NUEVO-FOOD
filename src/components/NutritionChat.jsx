import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { calcularEdad, computeNutritionPlan, findSubstitute, detectConstraint, detectFoodKeyword, pickEquivalentForConstraint, buildMealSuggestion, buildWeeklyPlan, buildShoppingList, buildDailyPlanDetailed } from '../utils/nutrition';
import api from '../services/api';
import jsPDF from 'jspdf';

export default function NutritionChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const [equivalentes, setEquivalentes] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState({ region: false, prote: true, carbo: false, grasas: false, veg: false });
  const [prefs, setPrefs] = useState(() => {
    const base = { region: 'CO', preferProteina: [], avoidProteina: [], preferCarbo: [], avoidCarbo: [], preferGrasas: [], avoidGrasas: [], preferVeg: [], avoidVeg: [] };
    try {
      const raw = localStorage.getItem('fp_user_prefs');
      if (!raw) return base;
      const p = JSON.parse(raw);
      return { ...base, ...p, region: p.region || 'CO' };
    } catch {
      return base;
    }
  });
  const recentKey = 'fp_bot_recent';
  const recentMs = 20 * 60 * 60 * 1000;
  const feedbackKey = 'fp_bot_feedback';
  const loadRecent = () => {
    try {
      const raw = localStorage.getItem(recentKey);
      const now = Date.now();
      const arr = raw ? JSON.parse(raw) : [];
      return arr.filter(x => now - x.ts < recentMs);
    } catch {
      return [];
    }
  };
  const saveRecent = (names) => {
    try {
      const now = Date.now();
      const prev = loadRecent();
      const map = new Map(prev.map(x => [x.k, x.ts]));
      for (const n of names) map.set(n, now);
      const arr = Array.from(map.entries()).map(([k, ts]) => ({ k, ts }));
      localStorage.setItem(recentKey, JSON.stringify(arr));
    } catch {
      void 0;
    }
  };
  const isRecent = (name) => loadRecent().some(x => x.k === name);
  const loadFeedback = () => {
    try {
      const raw = localStorage.getItem(feedbackKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const saveFeedback = (idx, v) => {
    try {
      const data = loadFeedback();
      data[idx] = v;
      localStorage.setItem(feedbackKey, JSON.stringify(data));
    } catch {
      void 0;
    }
  };

  const edad = useMemo(() => calcularEdad(user?.fecha_nacimiento), [user?.fecha_nacimiento]);
  const plan = useMemo(() => {
    return computeNutritionPlan({
      pesoKg: Number(user?.peso) || 70,
      alturaCm: Number(user?.altura) || 170,
      edad: edad || 30,
      genero: user?.genero === 'femenino' ? 'femenino' : 'masculino',
      factorActividad: 1.55,
      objetivo: user?.objetivo || 'mantenimiento',
    });
  }, [user?.peso, user?.altura, edad, user?.genero, user?.objetivo]);

  const bienvenida = useMemo(() => {
    const restr = user?.restricciones_detalles || (user?.tiene_restricciones ? 'restricciones registradas' : 'sin restricciones registradas');
    return `¡Hola! Soy tu asistente de bienestar en Food Plan. He analizado tu perfil y tus restricciones de ${restr}. Mi objetivo es ayudarte a alcanzar tus metas con platos balanceados y sustitutos deliciosos. ¿En qué puedo ayudarte hoy?`;
  }, [user?.restricciones_detalles, user?.tiene_restricciones]);

  useEffect(() => {
    setMessages([
      { role: 'bot', text: bienvenida },
      {
        role: 'bot',
        text: `Objetivo: ${user?.objetivo || 'mantenimiento'}. Calorías objetivo: ${plan.calorias} kcal · Proteína ${plan.macros.proteina}g · Carbohidratos ${plan.macros.carbohidratos}g · Grasas ${plan.macros.grasas}g`,
      },
    ]);
  }, [bienvenida, plan.calorias, plan.macros.proteina, plan.macros.carbohidratos, plan.macros.grasas, user?.objetivo]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get('/ai/equivalentes');
        setEquivalentes(resp.data?.data || null);
      } catch {
        setEquivalentes(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const savePrefs = () => {
    try {
      localStorage.setItem('fp_user_prefs', JSON.stringify(prefs));
    } catch (e) { void e; }
    setShowPrefs(false);
    setMessages((m) => [...m, { role: 'bot', text: 'Preferencias guardadas. ¿Generamos tu plan semanal y la lista de compras en PDF?' }]);
  };

  const exportWeeklyPDF = (semana) => {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(14);
    doc.text('Plan semanal de comidas', 10, y);
    y += 8;
    doc.setFontSize(10);
    semana.forEach((d, i) => {
      const fmt = (x) => x.items.map(it => `${it.nombre} ${it.cantidad}g`).join(' + ');
      const line = `Dia ${i + 1}: Des: ${fmt(d.desayuno)} | Alm: ${fmt(d.almuerzo)} | Cena: ${fmt(d.cena)} | Snack: ${fmt(d.snack)}`;
      const split = doc.splitTextToSize(line, 190);
      if (y + split.length * 6 > 280) { doc.addPage(); y = 10; }
      doc.text(split, 10, y);
      y += split.length * 6;
    });
    const lista = buildShoppingList(semana);
    if (y > 220) { doc.addPage(); y = 10; }
    doc.setFontSize(12);
    doc.text('Lista de compras', 10, y);
    y += 8;
    doc.setFontSize(10);
    lista.forEach((it) => {
      if (y > 280) { doc.addPage(); y = 10; }
      doc.text(`- ${it.nombre}: ${it.totalGramos} g`, 12, y);
      y += 6;
    });
    doc.save('plan-semanal-foodplan.pdf');
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');

    const low = text.toLowerCase();
    if (low.includes('preferencia')) {
      setShowPrefs(true);
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'bot', text: 'Indica tus preferencias y guarda para incluirlas en tu plan.' }]);
      }, 120);
      return;
    }
    if (low.includes('pdf diario') || low.includes('plan diario') || low.includes('receta') || low.includes('cocci') || low.includes('paso')) {
      const detalle = buildDailyPlanDetailed({ macrosObjetivo: plan.macros, restricciones: user?.restricciones_detalles || '', prefs, dayIndex: 0 });
      const doc = new jsPDF();
      let y = 10;
      doc.setFontSize(14);
      doc.text('Plan diario con recetas', 10, y);
      y += 8;
      doc.setFontSize(10);
      const sections = ['desayuno','almuerzo','cena','snack'];
      sections.forEach((sec) => {
        if (y > 260) { doc.addPage(); y = 10; }
        doc.setFontSize(12);
        doc.text(sec.toUpperCase(), 10, y);
        y += 6;
        doc.setFontSize(10);
        const ing = detalle[sec]?.items?.map(i => `- ${i.nombre}: ${i.cantidad} g`) || [];
        const pasos = detalle[sec]?.pasos || [];
        const t = detalle[sec]?.tiempoTotal || 0;
        const lines = ['Ingredientes:', ...ing, `Tiempo estimado: ${t} min`, 'Pasos:', ...pasos];
        const split = doc.splitTextToSize(lines.join('\n'), 190);
        for (const line of split) {
          if (y > 280) { doc.addPage(); y = 10; }
          doc.text(line, 10, y);
          y += 6;
        }
        y += 2;
      });
      doc.save('plan-diario-recetas.pdf');
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'bot', text: 'PDF diario con recetas y tiempos generado: plan-diario-recetas.pdf' }]);
      }, 120);
      return;
    }
    if (low.includes('semana') || low.includes('7')) {
      const semana = buildWeeklyPlan({ macrosObjetivo: plan.macros, restricciones: user?.restricciones_detalles || '', prefs });
      const lines = semana.map((d, idx) => {
        const fmt = (x) => x.items.map(i => `${i.nombre} ${i.cantidad}g`).join(' + ');
        return `Día ${idx + 1} — Des: ${fmt(d.desayuno)} | Alm: ${fmt(d.almuerzo)} | Cena: ${fmt(d.cena)} | Snack: ${fmt(d.snack)}`;
      });
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'bot', text: `Plan semanal generado:\n${lines.join('\n')}` }]);
      }, 150);
      const lista = buildShoppingList(semana);
      const txt = lista.map(x => `• ${x.nombre}: ${x.totalGramos} g`).join('\n');
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'bot', text: `Lista de compras:\n${txt}` }]);
      }, 250);
      setTimeout(() => exportWeeklyPDF(semana), 300);
      return;
    }

    const restr = (user?.restricciones_detalles || '').toLowerCase();
    const sub = findSubstitute(text, restr);
    const constraint = detectConstraint(restr);
    const keywordConstraint = detectFoodKeyword(text);
    let equiv = null;
    if (!sub && keywordConstraint) {
      equiv = pickEquivalentForConstraint(equivalentes, keywordConstraint);
    } else if (!sub && constraint.gluten) {
      equiv = pickEquivalentForConstraint(equivalentes, 'gluten');
    } else if (!sub && constraint.frutosSecos) {
      equiv = pickEquivalentForConstraint(equivalentes, 'frutosSecos');
    }
    const extraProtein = Math.min(25, Math.max(15, Math.round(plan.macros.proteina * 0.1)));
    const generoTxt = user?.genero === 'femenino' ? 'mujer' : 'hombre';
    const baseTemplates = [
      `Con tu nivel de actividad como ${generoTxt} de ${Number(user?.peso || 70)}kg, suma ${extraProtein}g de proteína en tu próxima comida.`,
      `Para tu perfil como ${generoTxt} de ${Number(user?.peso || 70)}kg, te conviene agregar ~${extraProtein}g de proteína hoy.`,
      `Para equilibrar macros, añade ${extraProtein}g de proteína en la siguiente comida.`,
    ];
    const consejoBase = baseTemplates[Math.floor(Math.random() * baseTemplates.length)];
    const sustitutoTxt = sub ? `Como indicas ${text}, por tus restricciones sugiero: ${sub}.` : '';
    const equivTxt = equiv ? `También puedes usar un equivalente de ${equiv.grupo}: ${equiv.nombre} (${equiv.cantidad}).` : '';
    const lower = text.toLowerCase();
    let mealTxt = '';
    const recentNames = [];
    const filtItems = (items) => {
      const a = items.filter(i => !isRecent(i.nombre));
      return a.length > 0 ? a : items;
    };
    if (lower.includes('desayuno')) {
      const sug = buildMealSuggestion({ meal: 'desayuno', macrosObjetivo: plan.macros, restricciones: restr });
      const items = filtItems(sug.items);
      items.forEach(i => recentNames.push(i.nombre));
      mealTxt = `Desayuno sugerido: ${items.map(i => `${i.nombre} ${i.cantidad}g`).join(' + ')}.`;
    } else if (lower.includes('almuerzo')) {
      const sug = buildMealSuggestion({ meal: 'almuerzo', macrosObjetivo: plan.macros, restricciones: restr });
      const items = filtItems(sug.items);
      items.forEach(i => recentNames.push(i.nombre));
      mealTxt = `Almuerzo sugerido: ${items.map(i => `${i.nombre} ${i.cantidad}g`).join(' + ')}.`;
    } else if (lower.includes('cena')) {
      const sug = buildMealSuggestion({ meal: 'cena', macrosObjetivo: plan.macros, restricciones: restr });
      const items = filtItems(sug.items);
      items.forEach(i => recentNames.push(i.nombre));
      mealTxt = `Cena sugerida: ${items.map(i => `${i.nombre} ${i.cantidad}g`).join(' + ')}.`;
    }
    const grupos = {
      proteinas: prefs.preferProteina?.length ? prefs.preferProteina : ['Pechuga de pollo','Atún','Huevo','Tofu'],
      carbos: prefs.preferCarbo?.length ? prefs.preferCarbo : ['Arroz integral','Quinoa','Avena','Papa'],
      grasas: prefs.preferGrasas?.length ? prefs.preferGrasas : ['Aguacate','Aceite de oliva','Frutos secos'],
    };
    const pick = (arr, n) => {
      const pool = arr.filter(x => !isRecent(x));
      const base = pool.length >= n ? pool : arr;
      const r = [];
      for (let i = 0; i < base.length && r.length < n; i++) {
        const idx = Math.floor(Math.random() * base.length);
        const v = base.splice(idx, 1)[0];
        if (!r.includes(v)) r.push(v);
      }
      return r;
    };
    const gProte = pick(grupos.proteinas.slice(), 3);
    const gCarbo = pick(grupos.carbos.slice(), 3);
    const gGrasas = pick(grupos.grasas.slice(), 2);
    gProte.forEach(n => recentNames.push(n));
    gCarbo.forEach(n => recentNames.push(n));
    gGrasas.forEach(n => recentNames.push(n));
    const gruposTxt = `Opciones por grupo — Proteínas: ${gProte.join(', ')} · Carbos: ${gCarbo.join(', ')} · Grasas: ${gGrasas.join(', ')}`;
    const respuesta = [consejoBase, sustitutoTxt, equivTxt, gruposTxt, mealTxt].filter(Boolean).join(' ');
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'bot', text: respuesta || consejoBase }]);
      if (recentNames.length) saveRecent(recentNames);
    }, 200);
  };

  if (!open) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 rounded-full bg-lime-500 text-black shadow-lg px-4 py-3"
        onClick={() => setOpen(true)}
        aria-label="Abrir Health-Bot"
      >
        Health‑Bot
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm md:max-w-md">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col h-[70vh] md:h-[60vh]">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-semibold text-stone-900">Health‑Bot</div>
            <div className="text-xs text-stone-600">Plan diario: {plan.calorias} kcal · P {plan.macros.proteina}g · C {plan.macros.carbohidratos}g · G {plan.macros.grasas}g</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setShowPrefs((v) => !v)}>{showPrefs ? 'Ocultar prefs' : 'Preferencias'}</button>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
        {showPrefs && (
          <div className="px-4 py-3 border-b border-slate-200 space-y-2">
            <button className="btn-secondary text-xs" onClick={() => setPrefsOpen(o => ({ ...o, region: !o.region }))}>{prefsOpen.region ? 'Ocultar' : 'País/Región'}</button>
            {prefsOpen.region && (
              <div>
                <select
                  className="input"
                  value={prefs.region || ''}
                  onChange={(e) => setPrefs((p) => ({ ...p, region: e.target.value }))}
                >
                  <option value="">Global</option>
                  <option value="MX">México</option>
                  <option value="CO">Colombia</option>
                  <option value="ES">España</option>
                  <option value="AR">Argentina</option>
                  <option value="PE">Perú</option>
                  <option value="CL">Chile</option>
                  <option value="BR">Brasil</option>
                  <option value="IT">Italia</option>
                  <option value="IN">India</option>
                </select>
              </div>
            )}
            <button className="btn-secondary text-xs" onClick={() => setPrefsOpen(o => ({ ...o, prote: !o.prote }))}>{prefsOpen.prote ? 'Ocultar' : 'Proteínas preferidas'}</button>
            {prefsOpen.prote && (
              <div className="flex flex-wrap gap-2">
                {['Pechuga de pollo','Pavo','Atún','Salmón','Huevo','Tofu'].map((opt) => (
                  <label key={opt} className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={prefs.preferProteina?.includes(opt)}
                      onChange={(e) => setPrefs((p) => {
                        const arr = new Set(p.preferProteina || []);
                        if (e.target.checked) arr.add(opt); else arr.delete(opt);
                        return { ...p, preferProteina: Array.from(arr) };
                      })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            <button className="btn-secondary text-xs" onClick={() => setPrefsOpen(o => ({ ...o, carbo: !o.carbo }))}>{prefsOpen.carbo ? 'Ocultar' : 'Carbohidratos preferidos'}</button>
            {prefsOpen.carbo && (
              <div className="flex flex-wrap gap-2">
                {['Arroz integral','Quinoa','Papa','Camote/Batata','Avena'].map((opt) => (
                  <label key={opt} className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={prefs.preferCarbo?.includes(opt)}
                      onChange={(e) => setPrefs((p) => {
                        const arr = new Set(p.preferCarbo || []);
                        if (e.target.checked) arr.add(opt); else arr.delete(opt);
                        return { ...p, preferCarbo: Array.from(arr) };
                      })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            <button className="btn-secondary text-xs" onClick={() => setPrefsOpen(o => ({ ...o, grasas: !o.grasas }))}>{prefsOpen.grasas ? 'Ocultar' : 'Grasas saludables preferidas'}</button>
            {prefsOpen.grasas && (
              <div className="flex flex-wrap gap-2">
                {['Aguacate','Aceite de oliva'].map((opt) => (
                  <label key={opt} className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={prefs.preferGrasas?.includes(opt)}
                      onChange={(e) => setPrefs((p) => {
                        const arr = new Set(p.preferGrasas || []);
                        if (e.target.checked) arr.add(opt); else arr.delete(opt);
                        return { ...p, preferGrasas: Array.from(arr) };
                      })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            <button className="btn-secondary text-xs" onClick={() => setPrefsOpen(o => ({ ...o, veg: !o.veg }))}>{prefsOpen.veg ? 'Ocultar' : 'Vegetales preferidos'}</button>
            {prefsOpen.veg && (
              <div className="flex flex-wrap gap-2">
                {['Brócoli','Espinaca','Zanahoria','Pimentón'].map((opt) => (
                  <label key={opt} className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={prefs.preferVeg?.includes(opt)}
                      onChange={(e) => setPrefs((p) => {
                        const arr = new Set(p.preferVeg || []);
                        if (e.target.checked) arr.add(opt); else arr.delete(opt);
                        return { ...p, preferVeg: Array.from(arr) };
                      })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={savePrefs} className="btn-primary">Guardar preferencias</button>
            </div>
          </div>
        )}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`max-w-[85%] ${m.role === 'bot' ? 'bg-stone-100 text-stone-800 self-start' : 'bg-lime-500 text-black self-end'} px-3 py-2 rounded-2xl`}>
              <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              {m.role === 'bot' && (
                <div className="flex gap-2 mt-1">
                  <button className="text-xs px-2 py-1 rounded bg-white border" onClick={() => saveFeedback(idx, 'up')}>👍</button>
                  <button className="text-xs px-2 py-1 rounded bg-white border" onClick={() => saveFeedback(idx, 'down')}>👎</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 flex gap-2">
          <input
            className="flex-1 input"
            placeholder="Escribe tu consulta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            aria-label="Mensaje al asistente"
          />
          <button className="btn-primary" onClick={handleSend}>Enviar</button>
        </div>
      </div>
    </div>
  );
}
