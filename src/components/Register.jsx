import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';
import AuthLayout from './AuthLayout';
import { useNavigate } from 'react-router-dom';

export default function Register({ onSwitchToLogin }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    teléfono: '',
    fecha_nacimiento: '',
    peso: '',
    altura: '',
    genero: '',
    objetivo: '',
    gym_id: '',
    trainer_id: '',
    metodoPago: 'tarjeta_credito',
    tiene_restricciones: false,
    restricciones_detalles: '',
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [plansRes, gymsRes, trainersRes] = await Promise.all([
          api.get('/accounts/plans').catch(() => ({ data: [] })),
          api.get('/gyms').catch(() => ({ data: [] })),
          api.get('/trainers').catch(() => ({ data: [] })),
        ]);
        setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
        setGyms(Array.isArray(gymsRes.data) ? gymsRes.data : []);
        setTrainers(Array.isArray(trainersRes.data) ? trainersRes.data : []);
      } catch (e) {
        console.warn('fetchOptions failed', e);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    if (!acceptPrivacy || !acceptTerms) {
      setError('Debes aceptar la Política de Privacidad y los Términos de Servicio');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!formData.genero) {
      setError('Por favor selecciona tu género');
      return;
    }
    setStep(2);
  };

  const handleStep2Confirm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        teléfono: formData.teléfono,
        fecha_nacimiento: formData.fecha_nacimiento,
        peso: formData.peso,
        altura: formData.altura,
         genero: formData.genero,
        objetivo: formData.objetivo,
        tiene_restricciones: formData.tiene_restricciones,
        restricciones_detalles: formData.restricciones_detalles,
      });
      await login(formData.email, formData.password);
      if (selectedPlan) {
        await api.post('/accounts', {
          plan: selectedPlan.nombre,
          gym_id: formData.gym_id ? parseInt(formData.gym_id, 10) : null,
          trainer_id: formData.trainer_id ? parseInt(formData.trainer_id, 10) : null,
          metodoPago: formData.metodoPago,
        });
      }
      if (rememberEmail && formData.email) {
        try {
          localStorage.setItem('prefillEmail', formData.email);
        } catch (err) {
          console.warn('Failed to persist prefillEmail', err);
        }
      }
      setSuccess('¡Registro completado! Entrando a tu cuenta...');
      try {
        localStorage.setItem('afterRegisterHome', '1');
      } catch (err) {
        console.warn('Failed to set afterRegisterHome flag', err);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title={step === 1 ? 'Crear Cuenta' : 'Elige tu plan'}
        subtitle={step === 1 ? 'Únete a Food Plan' : 'Selecciona un plan y completa tu registro'}
      >
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="nombre" className="label">Nombre Completo</label>
                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Tu nombre" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="label">Email</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="tu@email.com" className="input" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="password" className="label">Contraseña</label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword" className="label">Confirmar Contraseña</label>
                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Repite tu contraseña" className="input" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="teléfono" className="label">Teléfono</label>
                <input type="tel" id="teléfono" name="teléfono" value={formData.teléfono} onChange={handleChange} placeholder="+1234567890" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_nacimiento" className="label">Fecha de Nacimiento</label>
                <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="input" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="peso" className="label">Peso (kg)</label>
                <input type="number" id="peso" name="peso" value={formData.peso} onChange={handleChange} placeholder="70" step="0.1" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="altura" className="label">Altura (cm)</label>
                <input type="number" id="altura" name="altura" value={formData.altura} onChange={handleChange} placeholder="180" step="0.1" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="genero" className="label">Género</label>
                <select id="genero" name="genero" value={formData.genero} onChange={handleChange} className="input" required>
                  <option value="">Selecciona tu género</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="tiene_restricciones"
                  name="tiene_restricciones"
                  checked={formData.tiene_restricciones}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tiene_restricciones: e.target.checked }))}
                />
                <label htmlFor="tiene_restricciones">Tengo restricciones o recomendaciones de alimentación</label>
              </div>
              {formData.tiene_restricciones && (
                <textarea
                  id="restricciones_detalles"
                  name="restricciones_detalles"
                  value={formData.restricciones_detalles}
                  onChange={handleChange}
                  placeholder="Especifica alergias, preferencias (ej. vegetariano), recomendaciones médicas, etc."
                  className="input"
                  rows="3"
                />
              )}
            </div>
            <div className="form-group">
              <label htmlFor="objetivo" className="label">Objetivo</label>
              <select id="objetivo" name="objetivo" value={formData.objetivo} onChange={handleChange} className="input">
                <option value="">Selecciona tu objetivo</option>
                <option value="pérdida_de_grasa">Pérdida de Grasa</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="ganancia_muscular">Ganancia Muscular</option>
              </select>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="rememberEmail" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} />
              <label htmlFor="rememberEmail">Recordar mi correo para iniciar sesión</label>
            </div>
            <div className="policies-section">
              <div className="checkbox-group">
                <input type="checkbox" id="acceptPrivacy" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
                <label htmlFor="acceptPrivacy">Acepto la <button type="button" onClick={() => setShowPrivacyModal(true)} className="policy-link">Política de Privacidad</button></label>
              </div>
              <div className="checkbox-group">
                <input type="checkbox" id="acceptTerms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <label htmlFor="acceptTerms">Acepto los <button type="button" onClick={() => setShowTermsModal(true)} className="policy-link">Términos y Condiciones</button></label>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">Continuar a elegir plan</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Confirm} className="space-y-4">
            <p className="text-stone-600 text-sm">Elige un plan (opcional: gimnasio y entrenador). Puedes omitir el plan y elegirlo después.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.nombre}
                  onClick={() => setSelectedPlan(plan)}
                  className={`card cursor-pointer ${selectedPlan?.nombre === plan.nombre ? 'ring-2 ring-lime-500' : ''}`}
                >
                  <h4 className="font-bold text-stone-900">{plan.nombre?.toUpperCase()}</h4>
                  <p className="text-lime-600 font-semibold">${(plan.precio_mensual || 0).toLocaleString()}/mes</p>
                  <p className="text-stone-600 text-sm">{plan.descripcion}</p>
                </div>
              ))}
            </div>
            {plans.length === 0 && <p className="text-stone-500 text-sm">No hay planes disponibles. Puedes registrarte sin plan y elegirlo después.</p>}
            <div className="form-group">
              <label className="label">Gimnasio (opcional)</label>
              <select name="gym_id" value={formData.gym_id} onChange={handleChange} className="input">
                <option value="">Ninguno</option>
                {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Entrenador (opcional)</label>
              <select name="trainer_id" value={formData.trainer_id} onChange={handleChange} className="input">
                <option value="">Ninguno</option>
                {trainers.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Método de pago</label>
              <select name="metodoPago" value={formData.metodoPago} onChange={handleChange} className="input">
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo en sede</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Atrás</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Completando...' : selectedPlan ? 'Confirmar y pagar' : 'Terminar registro'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitchToLogin} className="link-button">Inicia sesión aquí</button>
        </p>
      </AuthLayout>

      {showPrivacyModal && (
        <PrivacyPolicyModal
          onClose={() => setShowPrivacyModal(false)}
          onAccept={() => {
            setAcceptPrivacy(true);
            setShowPrivacyModal(false);
          }}
        />
      )}

      {showTermsModal && (
        <TermsOfServiceModal
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setAcceptTerms(true);
            setShowTermsModal(false);
          }}
        />
      )}
    </>
  );
}
