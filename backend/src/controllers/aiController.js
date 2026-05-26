const axios = require('axios');
const FoodDatabase = require('../models/FoodDatabase');

// IA local opcional (Ollama en la máquina del usuario o servidor self-hosted).
// Si no está disponible, todo cae a sugerencias determinísticas.
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || '').replace(/\/+$/, '');
const ollamaModel = (process.env.OLLAMA_MODEL || 'llama3.1:8b').trim();

// Sistema de Sustitutos (categorías equivalentes)
const EQUIVALENTES = {
  categorias_equivalentes: {
    proteina_magra: {
      base: '100g de pechuga de pollo (cocida)',
      sustitutos: [
        { nombre: 'Pescado blanco', cantidad: '120g', nota: 'Aporta Omega-3' },
        { nombre: 'Claras de huevo', cantidad: '5 unidades', nota: 'Bajo en grasa' },
        { nombre: 'Tofu firme', cantidad: '150g', nota: 'Opción vegana' },
      ],
    },
    carbohidrato_complejo: {
      base: '100g de arroz integral (cocido)',
      sustitutos: [
        { nombre: 'Papa cocida', cantidad: '150g', nota: 'Mayor saciedad' },
        { nombre: 'Quinoa', cantidad: '90g', nota: 'Mayor aporte proteico' },
        { nombre: 'Camote/Batata', cantidad: '120g', nota: 'Índice glucémico medio' },
      ],
    },
    grasas_saludables: {
      base: '1 cucharada de aceite de oliva',
      sustitutos: [
        { nombre: 'Aguacate', cantidad: '50g', nota: 'Grasas monoinsaturadas' },
        { nombre: 'Nueces', cantidad: '20g', nota: 'Omega-3 vegetal' },
        { nombre: 'Mantequilla de maní', cantidad: '1 cucharada', nota: 'Úsalo con moderación' },
      ],
    },
    lacteos_bajos_grasa: {
      base: 'Yogur griego descremado 150g',
      sustitutos: [
        { nombre: 'Leche descremada', cantidad: '200ml', nota: 'Fuente de calcio' },
        { nombre: 'Queso cottage', cantidad: '100g', nota: 'Proteína alta' },
        { nombre: 'Kéfir', cantidad: '200ml', nota: 'Probióticos' },
      ],
    },
    frutas: {
      base: 'Manzana 150g',
      sustitutos: [
        { nombre: 'Banano', cantidad: '120g', nota: 'Potasio' },
        { nombre: 'Fresas', cantidad: '150g', nota: 'Bajo en calorías' },
        { nombre: 'Naranja', cantidad: '180g', nota: 'Vitamina C' },
      ],
    },
    vegetales: {
      base: 'Brócoli 150g',
      sustitutos: [
        { nombre: 'Espinaca', cantidad: '100g', nota: 'Hierro y folatos' },
        { nombre: 'Zanahoria', cantidad: '120g', nota: 'Beta-carotenos' },
        { nombre: 'Pimentón', cantidad: '120g', nota: 'Antioxidantes' },
      ],
    },
    fibra_integral: {
      base: 'Pan integral 1 rebanada',
      sustitutos: [
        { nombre: 'Avena', cantidad: '40g', nota: 'Beta-glucanos' },
        { nombre: 'Cebada', cantidad: '50g', nota: 'Fibra soluble' },
        { nombre: 'Tortilla integral', cantidad: '1 unidad', nota: 'Alternativa práctica' },
      ],
    },
  },
};

const aiController = {
  // Endpoint: obtener equivalentes por grupo
  getEquivalentes: (req, res) => {
    try {
      return res.json({ success: true, data: EQUIVALENTES });
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Error obteniendo equivalentes' });
    }
  },
  _translateName(name, lang) {
    if (!name || lang !== 'en') return name;
    const map = {
      'Arroz blanco cocido': 'Cooked White Rice',
      'Arroz cocido': 'Cooked Rice',
      'Pan Integral': 'Whole Wheat Bread',
      'Aguacate': 'Avocado',
      'Aceite de Oliva': 'Olive Oil',
      'Plátano': 'Banana',
      'Pechuga de Pollo (cocida)': 'Chicken Breast (cooked)',
      'Huevo completo': 'Whole Egg',
      'Atún en agua (enlatado)': 'Tuna in Water (canned)',
      'Salmón (cocido)': 'Salmon (cooked)',
      'Carne Magra (res)': 'Lean Beef',
    };
    return map[name] || name;
  },
  _translatePortion(porcion, lang) {
    if (!porcion || lang !== 'en') return porcion;
    return porcion
      .replace(/rebanada/gi, 'slice')
      .replace(/unidad/gi, 'unit')
      .replace(/cucharada/gi, 'tablespoon')
      .replace(/porción/gi, 'serving')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2');
  },
  _translateReason(razon, lang) {
    if (!razon || lang !== 'en') return razon;
    if (razon === 'Coincide con el nutriente más faltante') {
      return 'Matches the most lacking nutrient';
    }
    return razon;
  },
  // Indicar si la IA local está disponible (responde Ollama).
  // Si OLLAMA_BASE_URL no está configurada, IA está deshabilitada y todo
  // sigue funcionando con cálculos determinísticos.
  isEnabled: async (_req, res) => {
    if (!ollamaBaseUrl) return res.json({ success: true, enabled: false });
    try {
      await axios.get(`${ollamaBaseUrl}/api/tags`, { timeout: 1500 });
      res.json({ success: true, enabled: true });
    } catch {
      res.json({ success: true, enabled: false });
    }
  },
  // Generar sugerencias de alimentos basadas en ingesta actual
  getSuggestedFoods: async (req, res) => {
    try {
      // Si no hay IA local disponible, hacer fallback a sugerencias rápidas en lugar de error
      const fallbackQuick = () => {
        const { currentIntake, targetGoals, objetivo, lang } = req.body || {};
        const alimentos = FoodDatabase.getAll();
        const faltantes = {
          calorias: targetGoals.calorias - currentIntake.calorias,
          proteina: targetGoals.proteina - currentIntake.proteina,
          carbohidratos: targetGoals.carbohidratos - currentIntake.carbohidratos,
          grasas: targetGoals.grasas - currentIntake.grasas,
        };
        const sugerencias = [];
        if (objetivo === 'Ganancia Muscular' && faltantes.proteina > 5) {
          sugerencias.push(...alimentos.filter((f) => f.categoria === 'Proteínas').slice(0, 2));
        }
        if (faltantes.carbohidratos > 20) {
          sugerencias.push(...alimentos.filter((f) => f.categoria === 'Carbohidratos').slice(0, 2));
        }
        if (faltantes.grasas > 5) {
          sugerencias.push(...alimentos.filter((f) => f.categoria === 'Grasas').slice(0, 1));
        }
        return {
          success: true,
          cumplioMetas: false,
          faltantes: {
            calorias: Math.max(0, faltantes.calorias),
            proteina: Math.max(0, faltantes.proteina),
            carbohidratos: Math.max(0, faltantes.carbohidratos),
            grasas: Math.max(0, faltantes.grasas),
          },
          aiSuggestions: {
            sugerencias: sugerencias.slice(0, 5).map((f) => ({
              alimento: aiController._translateName(f.nombre, lang),
              razon: aiController._translateReason('Coincide con el nutriente más faltante', lang),
              porcion: aiController._translatePortion(`${f.cantidad}${f.unidad}`, lang),
              aporte: {
                calorias: f.calorias,
                proteina: f.proteina,
                carbohidratos: f.carbohidratos,
                grasas: f.grasas,
              },
            })),
            resumen: 'Sugerencias rápidas basadas en faltantes',
            consejo: 'Prioriza el nutriente más bajo con porciones moderadas',
          },
        };
      };

      const {
        currentIntake, // {calorias, proteina, carbohidratos, grasas}
        targetGoals,   // {calorias, proteina, carbohidratos, grasas}
        objetivo,      // "Ganancia Muscular", "Pérdida Grasa", "Mantenimiento"
        preferencias   // Array de categorías o alimentos preferidos
      } = req.body;

      if (!currentIntake || !targetGoals) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere currentIntake y targetGoals',
        });
      }

      // Calcular faltantes
      const faltantes = {
        calorias: Math.max(0, targetGoals.calorias - currentIntake.calorias),
        proteina: Math.max(0, targetGoals.proteina - currentIntake.proteina),
        carbohidratos: Math.max(0, targetGoals.carbohidratos - currentIntake.carbohidratos),
        grasas: Math.max(0, targetGoals.grasas - currentIntake.grasas),
      };

      // Si el usuario ya cumplió todas sus metas
      if (
        faltantes.calorias === 0 &&
        faltantes.proteina === 0 &&
        faltantes.carbohidratos === 0 &&
        faltantes.grasas === 0
      ) {
        return res.json({
          success: true,
          message: '✅ ¡Excelente! Ya cumpliste tus metas del día',
          cumplioMetas: true,
          sugerencias: [],
        });
      }

      // Obtener alimentos disponibles
      const todosAlimentos = FoodDatabase.getAll();

      // Prompt simple, práctico y humano. Sin claims clínicos, sin "biomecánica",
      // sin citas a estudios. La IA sugiere; no diagnostica ni prescribe.
      const prompt = `
Eres un asistente nutricional sencillo. A partir de lo que el usuario consumió hoy
y de su meta diaria, sugiere alimentos concretos del catálogo para cerrar lo que falte.
No diagnostiques, no des consejo médico, no inventes fuentes.

Contexto del usuario:
- Consumido hoy: ${JSON.stringify(currentIntake)}
- Meta del día: ${JSON.stringify(targetGoals)}
- Falta para la meta: ${JSON.stringify(faltantes)}
- Objetivo: ${objetivo || 'No especificado'}
- Preferencias: ${Array.isArray(preferencias) ? preferencias.join(', ') : (req.body?.restricciones_text || 'Ninguna especificada')}

Catálogo (solo puedes recomendar de aquí):
${todosAlimentos.slice(0, 15).map((f) => `- ${f.nombre}: ${f.calorias}cal, ${f.proteina}g prot, ${f.carbohidratos}g carbs, ${f.grasas}g grasas (porción: ${f.cantidad}${f.unidad})`).join('\n')}

Devuelve SOLO un JSON válido con esta estructura:
{
  "sugerencias": [
    {"alimento": "string", "razon": "string corto y claro", "porcion": "string",
     "aporte": {"calorias": 0, "proteina": 0, "carbohidratos": 0, "grasas": 0}}
  ],
  "resumen": "1-2 frases simples",
  "consejo": "1 frase práctica"
}
`;

      // Si no hay Ollama configurado, fallback inmediato.
      if (!ollamaBaseUrl) {
        return res.json(fallbackQuick());
      }

      let sugerencias = {};
      try {
        const response = await axios.post(
          `${ollamaBaseUrl}/api/chat`,
          {
            model: ollamaModel,
            stream: false,
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.7 },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
        );
        const text = response.data?.message?.content || '';
        const jsonMatch = String(text).match(/\{[\s\S]*\}/);
        sugerencias = jsonMatch ? JSON.parse(jsonMatch[0]) : { sugerencias: [], resumen: text };
      } catch (e) {
        console.warn('IA local no disponible, usando sugerencias rápidas:', e.message);
        return res.json(fallbackQuick());
      }

      if (req.body?.lang === 'en' && sugerencias?.sugerencias?.length) {
        sugerencias.sugerencias = sugerencias.sugerencias.map((s) => ({
          ...s,
          alimento: aiController._translateName(s.alimento, 'en'),
          porcion: aiController._translatePortion(s.porcion, 'en'),
          razon: aiController._translateReason(s.razon, 'en'),
        }));
      }
      if (sugerencias && !sugerencias.equivalentes_por_grupo) {
        sugerencias.equivalentes_por_grupo = EQUIVALENTES.categorias_equivalentes;
      }

      res.json({
        success: true,
        cumplioMetas: false,
        faltantes,
        aiSuggestions: sugerencias,
      });
    } catch (error) {
      console.error('Error en AI suggestions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al generar sugerencias',
      });
    }
  },

  // Análisis de balance nutricional del día
  analyzeDayBalance: async (req, res) => {
    try {
      const { currentIntake, targetGoals } = req.body || {};

      if (!currentIntake || typeof currentIntake !== 'object'
          || !targetGoals || typeof targetGoals !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere currentIntake y targetGoals (objetos)',
        });
      }
      const requiredKeys = ['calorias', 'proteina', 'carbohidratos', 'grasas'];
      for (const k of requiredKeys) {
        if (typeof currentIntake[k] !== 'number' || typeof targetGoals[k] !== 'number') {
          return res.status(400).json({
            success: false,
            error: `currentIntake.${k} y targetGoals.${k} deben ser numéricos`,
          });
        }
        if (targetGoals[k] <= 0) {
          return res.status(400).json({
            success: false,
            error: `targetGoals.${k} debe ser mayor a 0`,
          });
        }
      }

      // Calcular porcentajes
      const analisis = {
        calorias: {
          consumidas: currentIntake.calorias,
          meta: targetGoals.calorias,
          porcentaje: Math.round((currentIntake.calorias / targetGoals.calorias) * 100),
          faltante: Math.max(0, targetGoals.calorias - currentIntake.calorias),
          exceso: Math.max(0, currentIntake.calorias - targetGoals.calorias),
        },
        proteina: {
          consumidas: currentIntake.proteina,
          meta: targetGoals.proteina,
          porcentaje: Math.round((currentIntake.proteina / targetGoals.proteina) * 100),
          faltante: Math.max(0, targetGoals.proteina - currentIntake.proteina),
          exceso: Math.max(0, currentIntake.proteina - targetGoals.proteina),
        },
        carbohidratos: {
          consumidas: currentIntake.carbohidratos,
          meta: targetGoals.carbohidratos,
          porcentaje: Math.round((currentIntake.carbohidratos / targetGoals.carbohidratos) * 100),
          faltante: Math.max(0, targetGoals.carbohidratos - currentIntake.carbohidratos),
          exceso: Math.max(0, currentIntake.carbohidratos - targetGoals.carbohidratos),
        },
        grasas: {
          consumidas: currentIntake.grasas,
          meta: targetGoals.grasas,
          porcentaje: Math.round((currentIntake.grasas / targetGoals.grasas) * 100),
          faltante: Math.max(0, targetGoals.grasas - currentIntake.grasas),
          exceso: Math.max(0, currentIntake.grasas - targetGoals.grasas),
        },
      };

      // Generar resumen
      const cumplidas = Object.entries(analisis).filter(([_, v]) => v.porcentaje >= 100);
      const faltantes = Object.entries(analisis).filter(
        ([_, v]) => v.porcentaje < 100 && v.faltante > 0
      );

      res.json({
        success: true,
        analisis,
        cumplidas: cumplidas.map(([k, _]) => k),
        faltantes: faltantes.map(([k, _]) => k),
        saludGeneral: cumplidas.length >= 2 ? '✅ Buen progreso' : '⚠️ Necesitas mejorar',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al analizar balance',
      });
    }
  },

  // Obtener recomendación rápida (fallback determinístico)
  getQuickSuggestions: (req, res) => {
    try {
      const {
        currentIntake,
        targetGoals,
        objetivo
      } = req.body || {};

      if (!currentIntake || typeof currentIntake !== 'object'
          || !targetGoals || typeof targetGoals !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere currentIntake y targetGoals (objetos)',
        });
      }
      const requiredKeys = ['calorias', 'proteina', 'carbohidratos', 'grasas'];
      for (const k of requiredKeys) {
        if (typeof currentIntake[k] !== 'number' || typeof targetGoals[k] !== 'number') {
          return res.status(400).json({
            success: false,
            error: `currentIntake.${k} y targetGoals.${k} deben ser numéricos`,
          });
        }
      }

      const faltantes = {
        calorias: targetGoals.calorias - currentIntake.calorias,
        proteina: targetGoals.proteina - currentIntake.proteina,
        carbohidratos: targetGoals.carbohidratos - currentIntake.carbohidratos,
        grasas: targetGoals.grasas - currentIntake.grasas,
      };

      const alimentos = FoodDatabase.getAll();
      const sugerencias = [];

      // Estrategia según objetivo
      if (objetivo === 'Ganancia Muscular' && faltantes.proteina > 5) {
        const proteinas = alimentos.filter((f) => f.categoria === 'Proteínas');
        sugerencias.push(...proteinas.slice(0, 2));
      }

      if (faltantes.carbohidratos > 20) {
        const carbos = alimentos.filter((f) => f.categoria === 'Carbohidratos');
        sugerencias.push(...carbos.slice(0, 2));
      }

      if (faltantes.grasas > 5) {
        const grasas = alimentos.filter((f) => f.categoria === 'Grasas');
        sugerencias.push(...grasas.slice(0, 1));
      }

      res.json({
        success: true,
        sugerencias: sugerencias.slice(0, 5),
        message: 'Sugerencias rápidas basadas en faltantes',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al generar sugerencias rápidas',
      });
    }
  },

  // Generar receta (mock).
  // Deshabilitado por defecto: el módulo de recetas usa el catálogo curado.
  // Para reactivar en pruebas internas, exportar ENABLE_RECIPE_MOCK=true.
  generateRecipe: async (req, res) => {
    if (String(process.env.ENABLE_RECIPE_MOCK || '').toLowerCase() !== 'true') {
      return res.status(404).json({
        success: false,
        error: 'Endpoint no disponible. Usa el catálogo de recetas.',
      });
    }
    const { mealType = 'Almuerzo', ingredients = [], preferences = '' } = req.body || {};
    const buildMock = () => ({
      success: true,
      recipe: {
        nombre: `${mealType} saludable con ${Array.isArray(ingredients) ? (ingredients[0] || 'ingredientes básicos') : 'ingredientes básicos'}`,
        descripcion: `Receta simulada basada en ${preferences || 'preferencias generales'}.`,
        tiempo_preparacion: '25 min',
        dificultad: 'Fácil',
        ingredientes: (Array.isArray(ingredients) && ingredients.length > 0 ? ingredients : ['Pollo', 'Arroz', 'Verduras']).map((n) => ({
          nombre: n,
          cantidad: '1 porción',
        })),
        instrucciones: [
          'Preparar los ingredientes.',
          'Cocinar proteína y base de carbohidratos.',
          'Mezclar con verduras y sazonar al gusto.',
        ],
        macros: { calorias: 520, proteina: 35, carbohidratos: 55, grasas: 16 },
        tags: ['Equilibrada', 'Rápida', mealType],
      },
    });
    try {
      return res.json(buildMock());
    } catch {
      return res.json(buildMock());
    }
  },
};

module.exports = aiController;
