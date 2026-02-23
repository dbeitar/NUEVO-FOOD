const axios = require('axios');
const FoodDatabase = require('../models/FoodDatabase');

// Configurar clientes IA
const openaiApiKey = process.env.OPENAI_API_KEY;
const googleApiKey = process.env.GOOGLE_API_KEY;

const aiController = {
  // Indicar si la IA (OpenAI o Google) está habilitada
  isEnabled: (req, res) => {
    try {
      const enabled = Boolean(
        (openaiApiKey && openaiApiKey.trim().length > 0) ||
        (googleApiKey && googleApiKey.trim().length > 0)
      );
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error verificando estado de IA' });
    }
  },
  // Generar sugerencias de alimentos basadas en ingesta actual
  getSuggestedFoods: async (req, res) => {
    try {
      const hasOpenAI = Boolean(openaiApiKey && openaiApiKey.trim().length > 0);
      const hasGoogle = Boolean(googleApiKey && googleApiKey.trim().length > 0);
      // Si no hay IA configurada, hacer fallback a sugerencias rápidas en lugar de error
      const fallbackQuick = () => {
        const { currentIntake, targetGoals, objetivo } = req.body || {};
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
              alimento: f.nombre,
              razon: 'Coincide con el nutriente más faltante',
              porcion: `${f.cantidad}${f.unidad}`,
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
      if (!hasOpenAI && !hasGoogle) {
        const resp = fallbackQuick();
        return res.json(resp);
      }

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

      // Prompt para OpenAI
      const prompt = `
Eres un nutricionista experto. Analiza los siguientes datos y sugiere los 3-5 MEJORES alimentos para completar la meta alimentaria de hoy, sin exceder.

CONSUMO ACTUAL DEL DÍA:
- Calorías: ${currentIntake.calorias} kcal
- Proteína: ${currentIntake.proteina}g
- Carbohidratos: ${currentIntake.carbohidratos}g
- Grasas: ${currentIntake.grasas}g

META DEL DÍA:
- Calorías: ${targetGoals.calorias} kcal (faltante: ${faltantes.calorias})
- Proteína: ${targetGoals.proteina}g (faltante: ${faltantes.proteina}g)
- Carbohidratos: ${targetGoals.carbohidratos}g (faltante: ${faltantes.carbohidratos}g)
- Grasas: ${targetGoals.grasas}g (faltante: ${faltantes.grasas}g)

OBJETIVO DEL USUARIO: ${objetivo}
PREFERENCIAS: ${preferencias?.join(', ') || 'Sin preferencias específicas'}

ALIMENTOS DISPONIBLES:
${todosAlimentos
  .slice(0, 15)
  .map(
    (f) =>
      `- ${f.nombre}: ${f.calorias}cal, ${f.proteina}g proteína, ${f.carbohidratos}g carbs, ${f.grasas}g grasas (porción: ${f.cantidad}${f.unidad})`
  )
  .join('\n')}

Por favor, recomienda los mejores alimentos que:
1. Ayuden a completar los faltantes sin excedernismos
2. Sean apropiados para el objetivo "${objetivo}"
3. Prioricen los nutrientes más deficientes
4. Sean variados y prácticos

Responde en JSON con esta estructura:
{
  "sugerencias": [
    {
      "alimento": "nombre del alimento",
      "razon": "por qué lo recomiendo",
      "porcion": "cantidad sugerida",
      "aporte": {"calorias": X, "proteina": X, "carbohidratos": X, "grasas": X}
    }
  ],
  "resumen": "análisis breve de qué falta y estrategia",
  "consejo": "consejo personalizado"
}
      `;

      let sugerencias = {};
      if (hasOpenAI) {
        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 1000,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiApiKey}`,
              },
            }
          );
          const aiContent = response.data.choices[0].message.content;
          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              sugerencias = JSON.parse(jsonMatch[0]);
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            sugerencias = { sugerencias: [], resumen: aiContent };
          }
        } catch (e) {
          console.warn('OpenAI falló, usando sugerencias rápidas:', e.message);
          const resp = fallbackQuick();
          return res.json(resp);
        }
      } else if (hasGoogle) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`;
          const response = await axios.post(
            url,
            {
              contents: [
                {
                  role: 'user',
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          // Parsear respuesta de Gemini
          let text = '';
          try {
            text =
              response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
              response.data?.candidates?.[0]?.output || '';
          } catch {
            text = '';
          }
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              sugerencias = JSON.parse(jsonMatch[0]);
            } else {
              sugerencias = { sugerencias: [], resumen: text };
            }
          } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            sugerencias = { sugerencias: [], resumen: text };
          }
        } catch (e) {
          console.warn('Gemini falló, usando sugerencias rápidas:', e.message);
          const resp = fallbackQuick();
          return res.json(resp);
        }
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

  // Obtener recomendación rápida sin OpenAI (alternativa)
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
};

module.exports = aiController;
