import { useState, useEffect } from 'react';
import api from '../services/api';
import { useI18n } from '../context/I18nContext';

export default function AISuggestions({ dayTotals, targetGoals, objetivo }) {
  const [suggestions, setSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const { t, lang } = useI18n();

  const translateFoodName = (name) => {
    if (lang !== 'en' || !name) return name;
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
  };

  const translatePortion = (portion) => {
    if (lang !== 'en' || !portion) return portion;
    const replaced = portion
      .replace(/rebanada/gi, 'slice')
      .replace(/unidad/gi, 'unit')
      .replace(/cucharada/gi, 'tablespoon')
      .replace(/porción/gi, 'serving');
    return replaced.replace(/(\d)([a-zA-Z])/g, '$1 $2');
  };

  const translateReason = (reason) => {
    if (lang !== 'en' || !reason) return reason;
    if (reason === 'Coincide con el nutriente más faltante') {
      return 'Matches the most lacking nutrient';
    }
    return reason;
  };

  // Detectar si la IA está habilitada en el backend
  useEffect(() => {
    const checkAI = async () => {
      try {
        const resp = await api.get('/ai/enabled');
        if (resp?.data && resp.data.enabled === false) {
          setUseAI(false);
        }
      } catch {
        // Si falla, dejamos el valor por defecto y el flujo caerá a modo rápido
      }
    };
    checkAI();
  }, []);

  // Cargar sugerencias cuando cambian los datos
  useEffect(() => {
    if (dayTotals && targetGoals) {
      loadSuggestions();
    }
  }, [dayTotals, targetGoals]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      // Primero hacer análisis
      const analysisResponse = await api.post('/ai/analyze-balance', {
        currentIntake: {
          calorias: dayTotals.totalCalorias || 0,
          proteina: dayTotals.totalProteina || 0,
          carbohidratos: dayTotals.totalCarbohidratos || 0,
          grasas: dayTotals.totalGrasas || 0,
        },
        targetGoals: {
          calorias: targetGoals.calorias || 2000,
          proteina: targetGoals.proteina || 150,
          carbohidratos: targetGoals.carbohidratos || 250,
          grasas: targetGoals.grasas || 65,
        },
        lang,
      });

      setAnalysis(analysisResponse.data.analisis);

      // Luego intentar con IA
      if (useAI) {
        try {
          const aiResponse = await api.post('/ai/suggestions', {
            currentIntake: {
              calorias: dayTotals.totalCalorias || 0,
              proteina: dayTotals.totalProteina || 0,
              carbohidratos: dayTotals.totalCarbohidratos || 0,
              grasas: dayTotals.totalGrasas || 0,
            },
            targetGoals: {
              calorias: targetGoals.calorias || 2000,
              proteina: targetGoals.proteina || 150,
              carbohidratos: targetGoals.carbohidratos || 250,
              grasas: targetGoals.grasas || 65,
            },
            objetivo: objetivo || 'Mantenimiento',
            preferencias: ['variado', 'nutritivo'],
            lang,
          });

          if (aiResponse.data.cumplioMetas) {
            setMensaje(t('ai.message_ok', '✅ ¡Excelente! Ya cumpliste tus metas del día'));
            setSuggestions([]);
          } else if (aiResponse.data.aiSuggestions?.sugerencias) {
            setSuggestions(aiResponse.data.aiSuggestions.sugerencias);
          }
        } catch (aiError) {
          console.warn('Error con IA, usando sugerencias rápidas:', aiError);
          // Fallback a sugerencias rápidas
          const quickResponse = await api.post('/ai/quick-suggestions', {
            currentIntake: {
              calorias: dayTotals.totalCalorias || 0,
              proteina: dayTotals.totalProteina || 0,
              carbohidratos: dayTotals.totalCarbohidratos || 0,
              grasas: dayTotals.totalGrasas || 0,
            },
            targetGoals: {
              calorias: targetGoals.calorias || 2000,
              proteina: targetGoals.proteina || 150,
              carbohidratos: targetGoals.carbohidratos || 250,
              grasas: targetGoals.grasas || 65,
            },
            objetivo: objetivo || 'Mantenimiento',
            lang,
          });
          setSuggestions(quickResponse.data.sugerencias || []);
          setMensaje(t('ai.message_quick', '🤖 Sugerencias basadas en análisis (modo rápido)'));
        }
      } else {
        // Si no usar IA, usar sugerencias rápidas
        const quickResponse = await api.post('/ai/quick-suggestions', {
          currentIntake: {
            calorias: dayTotals.totalCalorias || 0,
            proteina: dayTotals.totalProteina || 0,
            carbohidratos: dayTotals.totalCarbohidratos || 0,
            grasas: dayTotals.totalGrasas || 0,
          },
          targetGoals: {
            calorias: targetGoals.calorias || 2000,
            proteina: targetGoals.proteina || 150,
            carbohidratos: targetGoals.carbohidratos || 250,
            grasas: targetGoals.grasas || 65,
          },
          objetivo: objetivo || 'Mantenimiento',
          lang,
        });
        setSuggestions(quickResponse.data.sugerencias || []);
        setMensaje(t('ai.message_generic', '📋 Sugerencias personalizadas'));
      }
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
      setMensaje(t('ai.error_loading', '❌ Error al cargar sugerencias'));
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) return null;

  return (
    <div className="ai-suggestions-section">
      <div className="flex items-center justify-between mb-3">
        <h2>{t('ai.title', '🤖 Asistente Nutricional IA')}</h2>
        <button 
          onClick={() => setUseAI(!useAI)}
          className="btn-secondary"
          disabled={loading}
        >
          {useAI ? t('ai.toggle_on', '🔴 IA Activada') : t('ai.toggle_off', '⚪ Modo Rápido')}
        </button>
      </div>

      {mensaje && <div className="ai-mensaje">{mensaje}</div>}

      {/* Análisis de Balance */}
      <div>
        <h3>{t('ai.analysis_title', '📊 Análisis de tu día')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-box">
            <label>{t('ai.calories', 'Calorías')}</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(analysis.calorias.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.calorias.consumidas)} / {analysis.calorias.meta} kcal</span>
            {analysis.calorias.faltante > 0 && (
              <small>{t('ai.missing', 'Faltante:')} {Math.round(analysis.calorias.faltante)} kcal</small>
            )}
          </div>

          <div className="stat-box">
            <label>{t('ai.protein', 'Proteína')}</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(analysis.proteina.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.proteina.consumidas)} / {analysis.proteina.meta} g</span>
            {analysis.proteina.faltante > 0 && (
              <small>{t('ai.missing', 'Faltante:')} {Math.round(analysis.proteina.faltante)} g</small>
            )}
          </div>

          <div className="stat-box">
            <label>{t('ai.carbs', 'Carbohidratos')}</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(analysis.carbohidratos.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.carbohidratos.consumidas)} / {analysis.carbohidratos.meta} g</span>
            {analysis.carbohidratos.faltante > 0 && (
              <small>{t('ai.missing', 'Faltante:')} {Math.round(analysis.carbohidratos.faltante)} g</small>
            )}
          </div>

          <div className="stat-box">
            <label>{t('ai.fats', 'Grasas')}</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(analysis.grasas.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.grasas.consumidas)} / {analysis.grasas.meta} g</span>
            {analysis.grasas.faltante > 0 && (
              <small>{t('ai.missing', 'Faltante:')} {Math.round(analysis.grasas.faltante)} g</small>
            )}
          </div>
        </div>
      </div>

      {/* Sugerencias */}
      {loading ? (
        <div className="loading">{t('ai.loading', 'Generando sugerencias personalizadas...')}</div>
      ) : (
        suggestions && suggestions.length > 0 && (
          <div>
            <h3>{t('ai.recommendations', '💡 Recomendaciones para Completar tu Meta')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((sugerencia, idx) => (
                <div key={idx} className="stat-box">
                  <div className="flex items-center justify-between">
                    <h4>{translateFoodName(sugerencia.alimento || sugerencia.nombre)}</h4>
                  </div>
                  {sugerencia.razon && <p className="text-sm text-stone-600 mt-1">{translateReason(sugerencia.razon)}</p>}
                  {sugerencia.porcion && (
                    <p className="text-sm mt-1">📏 {t('ai.portion', 'Porción recomendada:')} {translatePortion(sugerencia.porcion)}</p>
                  )}
                  {(sugerencia.aporte || sugerencia.nutrientes) && (
                    <div className="flex items-center gap-4 text-sm text-stone-700 mt-2">
                      <span>🔥 {Math.round(sugerencia.aporte?.calorias || sugerencia.nutrientes?.calorias || 0)}</span>
                      <span>🥚 {(sugerencia.aporte?.proteina || sugerencia.nutrientes?.proteina || 0).toFixed(1)}g</span>
                      <span>🥣 {(sugerencia.aporte?.carbohidratos || sugerencia.nutrientes?.carbohidratos || 0).toFixed(1)}g</span>
                      <span>🧈 {(sugerencia.aporte?.grasas || sugerencia.nutrientes?.grasas || 0).toFixed(1)}g</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Botón para refrescar */}
      <div className="mt-4">
        <button onClick={loadSuggestions} disabled={loading} className="btn-primary">
        {t('ai.refresh', '🔄 Actualizar Sugerencias')}
        </button>
      </div>
    </div>
  );
}
