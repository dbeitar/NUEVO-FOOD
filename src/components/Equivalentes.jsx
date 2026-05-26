import { useEffect, useState } from 'react';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

export default function Equivalentes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t, lang } = useI18n();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await api.get('/ai/equivalentes');
        setData(resp.data?.data || null);
      } catch {
        setError('No fue posible cargar equivalentes. Intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="card"><p>{t('loading', 'Cargando...')}</p></div>;
  }
  if (error) {
    return <div className="card error"><p>{error}</p></div>;
  }

  const categorias = data?.categorias_equivalentes || {};
  const keys = Object.keys(categorias);

  return (
    <div className="equivalentes-container">
      <h2 className="mb-2">{t('equivalentes.title', 'Equivalentes por Grupo')}</h2>
      <p className="subtitle mb-4">{t('equivalentes.subtitle', 'Intercambia alimentos manteniendo macros aproximados.')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((key) => {
          const cat = categorias[key];
          return (
            <div className="card" key={key}>
              <h3 className="mb-1">{categoryLabel(key, lang)}</h3>
              <p className="text-sm mb-2"><strong>{t('equivalentes.base', 'Base')}:</strong> {translateBase(key, cat.base, lang)}</p>
              <div className="space-y-2">
                {Array.isArray(cat.sustitutos) && cat.sustitutos.map((s, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-slate-200 flex items-start justify-between">
                    <div>
                      <div className="font-medium">{translateName(s.nombre, lang)}</div>
                      <div className="text-xs text-stone-600">{translateNote(s.nota, lang)}</div>
                    </div>
                    <div className="text-sm font-mono">{translateCantidad(s.cantidad, lang)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function categoryLabel(key, lang) {
  if (lang !== 'en') return pretty(key);
  const map = {
    proteina_magra: 'Lean Protein',
    carbohidrato_complejo: 'Complex Carbohydrate',
    grasas_saludables: 'Healthy Fats',
    lacteos_bajos_grasa: 'Low-fat Dairy',
    frutas: 'Fruits',
    vegetales: 'Vegetables',
    fibra_integral: 'Whole Grains / Fiber',
  };
  return map[key] || pretty(key);
}

function pretty(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function translateBase(key, base, lang) {
  if (lang !== 'en') return base;
  const map = {
    proteina_magra: '100g cooked chicken breast',
    carbohidrato_complejo: '100g cooked brown rice',
    grasas_saludables: '1 tablespoon olive oil',
    lacteos_bajos_grasa: '150g skim Greek yogurt',
    frutas: '150g apple',
    vegetales: '150g broccoli',
    fibra_integral: '1 slice whole wheat bread',
  };
  return map[key] || base;
}

function translateName(nombre, lang) {
  if (lang !== 'en') return nombre;
  const map = {
    'Pescado blanco': 'White fish',
    'Claras de huevo': 'Egg whites',
    'Tofu firme': 'Firm tofu',
    'Papa cocida': 'Boiled potato',
    'Quinoa': 'Quinoa',
    'Camote/Batata': 'Sweet potato',
    'Aguacate': 'Avocado',
    'Nueces': 'Nuts',
    'Mantequilla de maní': 'Peanut butter',
    'Yogur griego descremado': 'Skim Greek yogurt',
    'Leche descremada': 'Skim milk',
    'Queso cottage': 'Cottage cheese',
    'Kéfir': 'Kefir',
    'Manzana': 'Apple',
    'Banano': 'Banana',
    'Fresas': 'Strawberries',
    'Naranja': 'Orange',
    'Brócoli': 'Broccoli',
    'Espinaca': 'Spinach',
    'Zanahoria': 'Carrot',
    'Pimentón': 'Bell pepper',
    'Pan integral': 'Whole wheat bread',
    'Avena': 'Oats',
    'Cebada': 'Barley',
    'Tortilla integral': 'Whole wheat tortilla',
  };
  return map[nombre] || nombre;
}

function translateNote(nota, lang) {
  if (lang !== 'en') return nota;
  const map = {
    'Aporta Omega-3': 'Provides Omega-3',
    'Bajo en grasa': 'Low fat',
    'Opción vegana': 'Vegan option',
    'Mayor saciedad': 'More satiety',
    'Mayor aporte proteico': 'Higher protein content',
    'Índice glucémico medio': 'Medium glycemic index',
    'Grasas monoinsaturadas': 'Monounsaturated fats',
    'Omega-3 vegetal': 'Plant-based Omega-3',
    'Úsalo con moderación': 'Use in moderation',
    'Fuente de calcio': 'Source of calcium',
    'Proteína alta': 'High protein',
    'Probióticos': 'Probiotics',
    'Potasio': 'Potassium',
    'Bajo en calorías': 'Low in calories',
    'Vitamina C': 'Vitamin C',
    'Hierro y folatos': 'Iron and folates',
    'Beta-carotenos': 'Beta-carotenes',
    'Antioxidantes': 'Antioxidants',
    'Beta-glucanos': 'Beta-glucans',
    'Fibra soluble': 'Soluble fiber',
    'Alternativa práctica': 'Practical alternative',
  };
  return map[nota] || nota;
}

function translateCantidad(cantidad, lang) {
  if (lang !== 'en') return cantidad;
  return cantidad
    .replace(/\bunidades\b/gi, 'units')
    .replace(/\bunidad\b/gi, 'unit')
    .replace(/\bcucharada\b/gi, 'tablespoon')
    .replace(/\bcucharadas\b/gi, 'tablespoons')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2');
}
