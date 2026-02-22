import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Calculator() {
  const { user } = useAuth();
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
  const saveTimeoutRef = useRef(null);

  const isUsuarioFinalSinGymNiEntrenador = user?.rol === 'usuario_final' && !user?.gym_id && !user?.trainer_id && !user?.gymId;
  const canEditNivelYObjetivo = isUsuarioFinalSinGymNiEntrenador || user?.rol === 'super_admin' || user?.rol === 'admin_gimnasio';

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
    if (user) {
      const edad = calcularEdad(user.fecha_nacimiento);
      setFormData(prev => ({
        ...prev,
        edad: edad || '',
        peso: user.peso ?? prev.peso,
        altura: user.altura ?? prev.altura,
        nivelActividad: user.nivel_actividad || prev.nivelActividad,
        objetivo: user.objetivo === 'pérdida_de_grasa' ? 'perdida_grasa' :
                  user.objetivo === 'ganancia_muscular' ? 'ganancia_muscular' :
                  (user.objetivo || 'mantenimiento'),
      }));
    }
  }, [user]);

  const loadConcepts = async () => {
    try {
      const response = await api.get('/calculator/concepts');
      setConcepts(response.data);
    } catch (err) {
      console.error('Error cargando conceptos');
    }
  };

  const saveProfileNivelYObjetivo = async (objetivo, nivelActividad) => {
    try {
      await api.put('/auth/profile', {
        objetivo: objetivo,
        nivel_actividad: nivelActividad,
      });
      // No llamar refreshProfile() para no actualizar el contexto y no sacar al usuario del formulario
    } catch (err) {
      console.error('Error guardando nivel/objetivo', err);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (isUsuarioFinalSinGymNiEntrenador && (name === 'nivelActividad' || name === 'objetivo')) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          saveProfileNivelYObjetivo(next.objetivo, next.nivelActividad);
        }, 400);
      }
      return next;
    });
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

      setResultado({
        tmb: tmb.toFixed(0),
        tdee: tdee.toFixed(0),
        calorias: caloriasAjustadas.toFixed(0),
        proteina: proteinaGramos.toFixed(1),
        carbohidratos: carbsGramos.toFixed(1),
        grasas: grasasGramos.toFixed(1),
        objetivo: objetivo,
      });
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
        <h2>Calculadora Nutricional</h2>
        <p className="subtitle">Calcula tu plan personalizado</p>

        <form onSubmit={handleCalculate} className="calculator-form">
          <div className="form-row">
            <div className="form-group">
              <label>Edad (años)</label>
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
              <label>Peso (kg)</label>
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
              <label>Altura (cm)</label>
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
              <label>Género</label>
              <select name="genero" value={formData.genero} onChange={handleChange}>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nivel de Actividad</label>
              <select
                name="nivelActividad"
                value={formData.nivelActividad}
                onChange={handleChange}
                disabled={!canEditNivelYObjetivo}
                title={!canEditNivelYObjetivo ? 'Solo editable por usuario sin gimnasio/entrenador o por Admin' : undefined}
              >
                {nivelActividades.map(n => (
                  <option key={n.id} value={n.valor}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Objetivo</label>
              <select
                name="objetivo"
                value={formData.objetivo}
                onChange={handleChange}
                disabled={!canEditNivelYObjetivo}
                title={!canEditNivelYObjetivo ? 'Solo editable por usuario sin gimnasio/entrenador o por Admin' : undefined}
              >
                <option value="mantenimiento">Mantenimiento</option>
                <option value="perdida_grasa">Pérdida de Grasa</option>
                <option value="ganancia_muscular">Ganancia Muscular</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-calculate">
            {loading ? 'Calculando...' : 'Calcular Plan'}
          </button>
        </form>

        {resultado && (
          <div className="resultado">
            <h3>Tu Plan Personalizado</h3>
            <p className="objetivo-badge">Objetivo: {resultado.objetivo}</p>

            <div className="macros-grid">
              <div className="macro-box calorias">
                <label>Calorías Diarias</label>
                <p className="macro-value">{resultado.calorias}</p>
                <p className="macro-unit">kcal</p>
              </div>

              <div className="macro-box proteina">
                <label>Proteína</label>
                <p className="macro-value">{resultado.proteina}</p>
                <p className="macro-unit">g/día</p>
              </div>

              <div className="macro-box carbs">
                <label>Carbohidratos</label>
                <p className="macro-value">{resultado.carbohidratos}</p>
                <p className="macro-unit">g/día</p>
              </div>

              <div className="macro-box grasas">
                <label>Grasas</label>
                <p className="macro-value">{resultado.grasas}</p>
                <p className="macro-unit">g/día</p>
              </div>
            </div>

            <div className="info-box">
              <p><strong>TMB:</strong> {resultado.tmb} kcal (metabolismo basal)</p>
              <p><strong>TDEE:</strong> {resultado.tdee} kcal (gasto diario)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
