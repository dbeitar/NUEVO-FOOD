const axios = require('axios');
const FoodDatabase = require('../models/FoodDatabase');

// Configurar clientes IA – sanitizar claves para evitar falsos positivos
const INVALID_KEYS = ['disabled', 'none', 'off', 'false', 'null', 'undefined', ''];
const sanitizeKey = (raw) => {
  const val = (raw || '').trim();
  if (val.length < 10 || INVALID_KEYS.includes(val.toLowerCase())) return '';
  return val;
};
// IA gratuita/local (recomendado): Ollama en la máquina del usuario
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
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
  // Indicar si la IA (local) está habilitada
  isEnabled: (req, res) => {
    try {
      const enabled = Boolean(ollamaBaseUrl);
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error verificando estado de IA' });
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

      // Prompt Maestro adaptado
      const prompt = `
INSTRUCCIONES DE ACTUACIÓN PROFESIONAL
Actúa como un experto en Nutrición Deportiva y Clínica con enfoque en medicina basada en evidencia. Tu tarea es procesar los datos de la calculadora de la app FOOD PLAN para generar un protocolo nutricional y de entrenamiento de alta precisión.

DATOS DE ENTRADA (Calculados por el sistema):
Datos Biométricos: { "currentIntake": ${JSON.stringify(currentIntake)}, "targetGoals": ${JSON.stringify(targetGoals)} }
Restricciones Médicas/Patologías: ${req.body?.patologias || 'N/A'}
Nivel de Actividad: ${req.body?.nivelActividad || 'N/A'}
Objetivo Fisiológico: ${objetivo || 'N/A'}
Preferencias/Restricciones Alimentarias: ${Array.isArray(preferencias) ? preferencias.join(', ') : (req.body?.restricciones_text || 'N/A')}

REGLAS DE PROCESAMIENTO:
- Cálculo Metabólico: Utiliza Mifflin-St Jeor para determinar el gasto energético total. Si el % de grasa es conocido, prioriza Katch-McArdle.
- Seguridad Médica: Cruza las patologías con la dieta. (Ej: Si hay resistencia a la insulina, prioriza carbohidratos de carga glucémica baja y cita a la ADA - American Diabetes Association).
- Distribución de Macros: Sigue el consenso de la ISSN para la ingesta proteica según el objetivo (ej. 1.6g a 2.2g/kg para hipertrofia).
- Sistema de Sustitutos: Genera un menú ejemplo, pero añade siempre una sección de "Equivalentes por Grupo" para que el usuario pueda intercambiar alimentos manteniendo los macros.

ALIMENTOS DISPONIBLES:
${todosAlimentos.slice(0, 15).map((f) => `- ${f.nombre}: ${f.calorias}cal, ${f.proteina}g proteína, ${f.carbohidratos}g carbs, ${f.grasas}g grasas (porción: ${f.cantidad}${f.unidad})`).join('\n')}

SISTEMA DE SUSTITUTOS (JSON):
${JSON.stringify(EQUIVALENTES, null, 2)}

FORMATO DE SALIDA REQUERIDO:
- Análisis Biomecánico: breve explicación de por qué elegiste esas calorías.
- Plan Nutricional: desglose por comidas (Macros incluidos).
- Sustitutos Sugeridos: tabla de intercambios rápidos.
- Recomendación de Ejercicio: basada en las guías de la ACSM.
- Fuentes: cita al menos 2 estudios o consensos internacionales (PubMed/ISSN/WHO) que avalen este plan específico.

Devuelve SIEMPRE un JSON con esta estructura mínima:
{
  "sugerencias": [
    {"alimento": "string", "razon": "string", "porcion": "string", "aporte": {"calorias": 0, "proteina": 0, "carbohidratos": 0, "grasas": 0}}
  ],
  "resumen": "string",
  "consejo": "string",
  "equivalentes_por_grupo": ${JSON.stringify(EQUIVALENTES.categorias_equivalentes)}
}
`;

      let sugerencias = {};
      try {
        // Ollama local (gratis): requiere que el usuario tenga Ollama corriendo
        // Endpoint: POST {base}/api/chat
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
        try {
          const jsonMatch = String(text).match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            sugerencias = JSON.parse(jsonMatch[0]);
          } else {
            sugerencias = { sugerencias: [], resumen: text };
          }
        } catch (parseError) {
          console.error('Error parsing Ollama response:', parseError);
          sugerencias = { sugerencias: [], resumen: String(text) };
        }
      } catch (e) {
        console.warn('Ollama no disponible, usando sugerencias rápidas:', e.message);
        const resp = fallbackQuick();
        return res.json(resp);
      }

      // Localizar nombres/porciones si lang=en
      if (req.body?.lang === 'en' && sugerencias?.sugerencias?.length) {
        sugerencias.sugerencias = sugerencias.sugerencias.map((s) => ({
          ...s,
          alimento: aiController._translateName(s.alimento, 'en'),
          porcion: aiController._translatePortion(s.porcion, 'en'),
          razon: aiController._translateReason(s.razon, 'en'),
        }));
      }
      // Asegurar inclusión del sistema de sustitutos en respuesta con IA
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
      const { currentIntake, targetGoals } = req.body;

      if (!currentIntake || !targetGoals) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere currentIntake y targetGoals',
        });
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
      } = req.body;

      // Determinar qué nutriente falta más
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

  // Generar receta (IA o simulada por fallback)
  generateRecipe: async (req, res) => {
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
      // Por ahora la receta se mantiene en mock/fallback para evitar dependencias externas.
      return res.json(buildMock());
    } catch {
      return res.json(buildMock());
    }
  },
};

module.exports = aiController;
