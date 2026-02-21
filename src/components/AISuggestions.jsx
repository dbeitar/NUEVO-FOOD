import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AISuggestions.css';

export default function AISuggestions({ dayTotals, targetGoals, objetivo }) {
  const [suggestions, setSuggestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [mensaje, setMensaje] = useState('');

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
          });

          if (aiResponse.data.cumplioMetas) {
            setMensaje('✅ ¡Excelente! Ya cumpliste tus metas del día');
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
          });
          setSuggestions(quickResponse.data.sugerencias || []);
          setMensaje('🤖 Sugerencias basadas en análisis (modo rápido)');
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
        });
        setSuggestions(quickResponse.data.sugerencias || []);
        setMensaje('📋 Sugerencias personalizadas');
      }
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
      setMensaje('❌ Error al cargar sugerencias');
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) return null;

  return (
    <div className="ai-suggestions-container">
      <div className="suggestions-header">
        <h2>🤖 Asistente Nutricional IA</h2>
        <button 
          onClick={() => setUseAI(!useAI)}
          className={`toggle-ai ${useAI ? 'active' : ''}`}
          disabled={loading}
        >
          {useAI ? '🔴 IA Activada' : '⚪ Modo Rápido'}
        </button>
      </div>

      {mensaje && <div className="ai-mensaje">{mensaje}</div>}

      {/* Análisis de Balance */}
      <div className="balance-analysis">
        <h3>📊 Análisis de tu día</h3>
        <div className="analysis-grid">
          <div className={`analysis-item ${analysis.calorias.porcentaje >= 100 ? 'cumplido' : 'faltante'}`}>
            <label>Calorías</label>
            <div className="progress">
              <div 
                className="progress-bar"
                style={{ width: `${Math.min(analysis.calorias.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.calorias.consumidas)} / {analysis.calorias.meta} kcal</span>
            {analysis.calorias.faltante > 0 && (
              <small>Faltante: {Math.round(analysis.calorias.faltante)} kcal</small>
            )}
          </div>

          <div className={`analysis-item ${analysis.proteina.porcentaje >= 100 ? 'cumplido' : 'faltante'}`}>
            <label>Proteína</label>
            <div className="progress">
              <div 
                className="progress-bar"
                style={{ width: `${Math.min(analysis.proteina.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.proteina.consumidas)} / {analysis.proteina.meta} g</span>
            {analysis.proteina.faltante > 0 && (
              <small>Faltante: {Math.round(analysis.proteina.faltante)} g</small>
            )}
          </div>

          <div className={`analysis-item ${analysis.carbohidratos.porcentaje >= 100 ? 'cumplido' : 'faltante'}`}>
            <label>Carbohidratos</label>
            <div className="progress">
              <div 
                className="progress-bar"
                style={{ width: `${Math.min(analysis.carbohidratos.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.carbohidratos.consumidas)} / {analysis.carbohidratos.meta} g</span>
            {analysis.carbohidratos.faltante > 0 && (
              <small>Faltante: {Math.round(analysis.carbohidratos.faltante)} g</small>
            )}
          </div>

          <div className={`analysis-item ${analysis.grasas.porcentaje >= 100 ? 'cumplido' : 'faltante'}`}>
            <label>Grasas</label>
            <div className="progress">
              <div 
                className="progress-bar"
                style={{ width: `${Math.min(analysis.grasas.porcentaje, 100)}%` }}
              />
            </div>
            <span>{Math.round(analysis.grasas.consumidas)} / {analysis.grasas.meta} g</span>
            {analysis.grasas.faltante > 0 && (
              <small>Faltante: {Math.round(analysis.grasas.faltante)} g</small>
            )}
          </div>
        </div>
      </div>

      {/* Sugerencias */}
      {loading ? (
        <div className="loading">Generando sugerencias personalizadas...</div>
      ) : (
        suggestions && suggestions.length > 0 && (
          <div className="suggestions-list">
            <h3>💡 Recomendaciones para Completar tu Meta</h3>
            {suggestions.map((sugerencia, idx) => (
              <div key={idx} className="suggestion-item">
                <div className="sugerencia-header">
                  <h4>{sugerencia.alimento || sugerencia.nombre}</h4>
                  {sugerencia.razon && <p className="razon">{sugerencia.razon}</p>}
                </div>
                {sugerencia.porcion && (
                  <p className="porcion">📏 Porción recomendada: {sugerencia.porcion}</p>
                )}
                {(sugerencia.aporte || sugerencia.nutrientes) && (
                  <div className="macros-sugerencia">
                    <span>🔥 {Math.round(sugerencia.aporte?.calorias || sugerencia.nutrientes?.calorias || 0)}</span>
                    <span>🥚 {(sugerencia.aporte?.proteina || sugerencia.nutrientes?.proteina || 0).toFixed(1)}g</span>
                    <span>🥣 {(sugerencia.aporte?.carbohidratos || sugerencia.nutrientes?.carbohidratos || 0).toFixed(1)}g</span>
                    <span>🧈 {(sugerencia.aporte?.grasas || sugerencia.nutrientes?.grasas || 0).toFixed(1)}g</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Botón para refrescar */}
      <button onClick={loadSuggestions} disabled={loading} className="btn-refresh">
        🔄 Actualizar Sugerencias
      </button>
    </div>
  );
}
