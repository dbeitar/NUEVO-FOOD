import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Generator State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiForm, setAiForm] = useState({
    mealType: 'Almuerzo',
    ingredients: '',
    preferences: ''
  });

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const res = await api.get('/recipes');
      setRecipes(res.data.data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/recipes/search?query=${searchTerm}`);
      setRecipes(res.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAiRecipe = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/ai/generate-recipe', {
        mealType: aiForm.mealType,
        ingredients: aiForm.ingredients.split(',').map(i => i.trim()),
        preferences: aiForm.preferences
      });
      if (res.data.success) {
        setAiResult(res.data.recipe);
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Error al generar la receta. Intenta de nuevo.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="recipes-container">
      <div className="recipes-header">
        <h2>📚 Biblioteca de Recetas</h2>
        <button className="btn-ai-chef" onClick={() => setShowAiModal(true)}>
          🤖 Chef IA
        </button>
      </div>

      <div className="search-bar">
        <form onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Buscar recetas (ej. Pollo, Keto...)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {loading ? (
        <div className="loading">Cargando recetas...</div>
      ) : (
        <div className="recipes-grid">
          {recipes.length > 0 ? recipes.map(recipe => (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-image" style={{backgroundImage: `url(${recipe.imagen || 'https://via.placeholder.com/300x200'})`}}>
                <span className="recipe-time">⏱ {recipe.tiempo_preparacion}</span>
              </div>
              <div className="recipe-content">
                <h3>{recipe.nombre}</h3>
                <p className="recipe-desc">{recipe.descripcion}</p>
                <div className="recipe-macros">
                  <span>🔥 {recipe.macros?.calorias} kcal</span>
                  <span>🥩 {recipe.macros?.proteina}g P</span>
                </div>
                <div className="recipe-tags">
                  {recipe.tags?.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
                </div>
                <button className="btn-view-recipe">Ver Detalles</button>
              </div>
            </div>
          )) : (
            <p>No se encontraron recetas.</p>
          )}
        </div>
      )}

      {/* Modal IA */}
      {showAiModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setShowAiModal(false)}>×</button>
            <h3>👨‍🍳 Chef Inteligente</h3>
            
            {!aiResult ? (
              <form onSubmit={generateAiRecipe}>
                <div className="form-group">
                  <label>Tipo de Comida</label>
                  <select 
                    value={aiForm.mealType}
                    onChange={e => setAiForm({...aiForm, mealType: e.target.value})}
                  >
                    <option>Desayuno</option>
                    <option>Almuerzo</option>
                    <option>Cena</option>
                    <option>Snack</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ingredientes disponibles (separados por coma)</label>
                  <input 
                    placeholder="Ej: Pollo, arroz, tomate"
                    value={aiForm.ingredients}
                    onChange={e => setAiForm({...aiForm, ingredients: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Preferencias / Restricciones</label>
                  <input 
                    placeholder="Ej: Sin gluten, Keto, Picante..."
                    value={aiForm.preferences}
                    onChange={e => setAiForm({...aiForm, preferences: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={aiLoading}>
                  {aiLoading ? '🍳 Cocinando idea...' : '✨ Generar Receta'}
                </button>
              </form>
            ) : (
              <div className="ai-result">
                <h4>{aiResult.nombre}</h4>
                <p><em>{aiResult.descripcion}</em></p>
                <div className="ai-details">
                  <p><strong>Tiempo:</strong> {aiResult.tiempo_preparacion}</p>
                  <p><strong>Dificultad:</strong> {aiResult.dificultad}</p>
                </div>
                
                <h5>Ingredientes:</h5>
                <ul>
                  {aiResult.ingredientes.map((ing, i) => (
                    <li key={i}>{ing.cantidad} {ing.nombre}</li>
                  ))}
                </ul>

                <h5>Instrucciones:</h5>
                <ol>
                  {aiResult.instrucciones.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>

                <div className="macros-box">
                  <p>Calorías: {aiResult.macros.calorias}</p>
                  <p>Proteína: {aiResult.macros.proteina}g</p>
                  <p>Carbs: {aiResult.macros.carbohidratos}g</p>
                  <p>Grasas: {aiResult.macros.grasas}g</p>
                </div>

                <button className="btn-secondary" onClick={() => setAiResult(null)}>Generar Otra</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
