import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { useI18n } from '../context/useI18n';

export default function Calculator() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [concepts, setConcepts] = useState([]);
  const [formData, setFormData] = useState({
    edad: '',
    peso: '',
    altura: '',
    genero: 'masculino',
    nivelActividad: '1.55',
    objetivo: 'mantenimiento',
  });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const canAdjustAssignedNutrition = [
    'super_admin',
    'admin_marca',
    'admin_gimnasio',
    'entrenador',
    'nutricionista',
  ].includes(user?.rol);
  const canAdjustOwnNutrition = user?.rol === 'usuario_final';


  // Función para calcular edad desde fecha de nacimiento
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  useEffect(() => {
    loadConcepts();
    try {
      const savedForm = localStorage.getItem('calcForm');
      const savedRes = localStorage.getItem('calcResult');
      if (savedForm) setFormData(JSON.parse(savedForm));
      if (savedRes) setResultado(JSON.parse(savedRes));
    } catch (e) { void e; }
    // Auto-rellenar datos del usuario si existen
    if (user) {
      const edad = calcularEdad(user.fecha_nacimiento);
      setFormData(prev => ({
        ...prev,
        edad: edad || '',
        peso: user.peso || '',
        altura: user.altura || '',
        genero: user.genero === 'femenino' ? 'femenino' : 'masculino',
        objetivo: user.objetivo === 'pérdida_de_grasa' ? 'perdida_grasa' : 
                  user.objetivo === 'ganancia_muscular' ? 'ganancia_muscular' : 
                  'mantenimiento',
      }));
    }
  }, [user]);

  const loadConcepts = async () => {
    try {
      const response = await api.get('/calculator/concepts');
      setConcepts(response.data);
    } catch {
      console.error('Error cargando conceptos');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const calcularTMB = (peso, altura, edad, genero) => {
    // Fórmula de Mifflin-St Jeor
    if (genero === 'masculino') {
      return 10 * peso + 6.25 * altura - 5 * edad + 5;
    } else {
      return 10 * peso + 6.25 * altura - 5 * edad - 161;
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { edad, peso, altura, genero, nivelActividad, objetivo } = formData;

      // Validar datos
      if (!edad || !peso || !altura) {
        alert('Por favor completa todos los campos requeridos');
        setLoading(false);
        return;
      }

      // Calcular TMB (Tasa Metabólica Basal)
      const tmb = calcularTMB(parseFloat(peso), parseFloat(altura), parseFloat(edad), genero);

      // Calcular TDEE (Total Daily Energy Expenditure)
      const actividad = parseFloat(nivelActividad);
      const tdee = tmb * actividad;

      // Ajustar calorías según objetivo
      let caloriasAjustadas = tdee;
      if (objetivo === 'perdida_grasa') {
        caloriasAjustadas = tdee - 500; // Déficit de 500 kcal
      } else if (objetivo === 'ganancia_muscular') {
        caloriasAjustadas = tdee + 300; // Superávit de 300 kcal
      }

      // Calcular distribución de macronutrientes
      const proteinaConcept = concepts.find(c => 
        c.tipo === 'distribucion_macro' && 
        (objetivo === 'perdida_grasa' ? c.nombre.includes('Pérdida') :
         objetivo === 'ganancia_muscular' ? c.nombre.includes('Ganancia') :
         c.nombre.includes('Mantenimiento'))
      );

      const proteinaGramos = parseFloat(peso) * (proteinaConcept?.valor || 1.6);
      const proteinaCalorías = proteinaGramos * 4;

      const grasasGramos = (caloriasAjustadas * 0.3) / 9;
      const grasasCalorías = grasasGramos * 9;

      const carbsCalorías = caloriasAjustadas - proteinaCalorías - grasasCalorías;
      const carbsGramos = carbsCalorías / 4;

      const result = {
        tmb: tmb.toFixed(0),
        tdee: tdee.toFixed(0),
        calorias: caloriasAjustadas.toFixed(0),
        proteina: proteinaGramos.toFixed(1),
        carbohidratos: carbsGramos.toFixed(1),
        grasas: grasasGramos.toFixed(1),
        objetivo: objetivo,
      };
      setResultado(result);
      try {
        localStorage.setItem('calcForm', JSON.stringify(formData));
        localStorage.setItem('calcResult', JSON.stringify(result));
      } catch (e) { void e; }
    } catch (error) {
      console.error('Error en cálculo:', error);
      alert('Error en el cálculo. Verifica los datos.');
    }

    setLoading(false);
  };

  // Obtener opciones de nivel actividad desde conceptos
  const nivelActividades = concepts.filter(c => c.tipo === 'factor_actividad');

  return (
    <div className="calculator-container">
      <div className="calculator-box">
        <h2>{t('calculator.title', 'Calculadora Nutricional')}</h2>
        <p className="subtitle">{t('calculator.subtitle', 'Calcula tu plan personalizado')}</p>

        <form onSubmit={handleCalculate} className="calculator-form">
          <div className="form-row">
            <div className="form-group">
              <label>{t('calculator.age', 'Edad (años)')}</label>
              <input
                type="number"
                name="edad"
                value={formData.edad}
                onChange={handleChange}
                placeholder="25"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('calculator.weight', 'Peso (kg)')}</label>
              <input
                type="number"
                name="peso"
                step="0.1"
                value={formData.peso}
                onChange={handleChange}
                placeholder="75"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('calculator.height', 'Altura (cm)')}</label>
              <input
                type="number"
                name="altura"
                step="0.1"
                value={formData.altura}
                onChange={handleChange}
                placeholder="180"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('calculator.gender', 'Género')}</label>
              <select name="genero" value={formData.genero} onChange={handleChange}>
                <option value="masculino">{t('calculator.male', 'Masculino')}</option>
                <option value="femenino">{t('calculator.female', 'Femenino')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('calculator.activity', 'Nivel de Actividad')}</label>
              <select 
                name="nivelActividad" 
                value={formData.nivelActividad} 
                onChange={handleChange}
                disabled={!(canAdjustAssignedNutrition || canAdjustOwnNutrition)}
                title={!(canAdjustAssignedNutrition || canAdjustOwnNutrition) ? 'Editable por usuario final o entrenador asignado' : undefined}
              >
                {nivelActividades.map(n => (
                  <option key={n.id} value={n.valor}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('calculator.goal', 'Objetivo')}</label>
              <select 
                name="objetivo" 
                value={formData.objetivo} 
                onChange={handleChange}
                disabled={!(canAdjustAssignedNutrition || canAdjustOwnNutrition)}
                title={!(canAdjustAssignedNutrition || canAdjustOwnNutrition) ? 'Editable por usuario final o entrenador asignado' : undefined}
              >
                <option value="mantenimiento">{t('calculator.maintenance', 'Mantenimiento')}</option>
                <option value="perdida_grasa">{t('calculator.fatloss', 'Pérdida de Grasa')}</option>
                <option value="ganancia_muscular">{t('calculator.muscle', 'Ganancia Muscular')}</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-calculate">
            {loading ? t('calculator.calculating', 'Calculando...') : t('calculator.calculate', 'Calcular Plan')}
          </button>
        </form>

        {resultado && (
          <div className="resultado">
            <h3>{t('calculator.result_title', 'Tu Plan Personalizado')}</h3>
            <p className="objetivo-badge">{t('calculator.goal', 'Objetivo')}: {resultado.objetivo}</p>

            <div className="macros-grid">
              <div className="macro-box calorias">
                <label>{t('calculator.daily_calories', 'Calorías Diarias')}</label>
                <p className="macro-value">{resultado.calorias}</p>
                <p className="macro-unit">kcal</p>
              </div>

              <div className="macro-box proteina">
                <label>{t('calculator.protein', 'Proteína')}</label>
                <p className="macro-value">{resultado.proteina}</p>
                <p className="macro-unit">g/día</p>
              </div>

              <div className="macro-box carbs">
                <label>{t('calculator.carbs', 'Carbohidratos')}</label>
                <p className="macro-value">{resultado.carbohidratos}</p>
                <p className="macro-unit">g/día</p>
              </div>

              <div className="macro-box grasas">
                <label>{t('calculator.fats', 'Grasas')}</label>
                <p className="macro-value">{resultado.grasas}</p>
                <p className="macro-unit">g/día</p>
              </div>
            </div>

            <div className="info-box">
              <p><strong>{t('calculator.tmb', 'TMB')}:</strong> {resultado.tmb} kcal</p>
              <p><strong>{t('calculator.tdee', 'TDEE')}:</strong> {resultado.tdee} kcal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
