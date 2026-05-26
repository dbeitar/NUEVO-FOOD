import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import AuthLayout from './AuthLayout';
import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { fetchPaymentMethods, openWompiCheckout } from '../utils/paymentMethods';

const SERVICES = [
  { id: 'd28d', label: 'D28D', desc: 'Programas Vital, Pancitas o Virtual' },
  { id: 'food', label: 'Plan de Alimentación', desc: 'Nutrición y registro de alimentos' },
  { id: 'training', label: 'Entrenadores', desc: 'Rutinas y seguimiento con coach' },
];

const MODULE_PRESETS = {
  d28d: { d28d: true, live_classes: true },
  food: { food_plan: true, nutrition: true },
  training: { training: true, nutrition: true },
};

function readApiError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  return data?.error || data?.message || fallback;
}

export default function RegisterCommercialWizard({ onSwitchToLogin }) {
  const { register, login } = useAuth();
  const [step, setStep] = useState(1);
  const [service, setService] = useState('');
  const [programId, setProgramId] = useState('');
  const [programs, setPrograms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currency, setCurrency] = useState('COP');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    teléfono: '',
    genero: '',
    metodoPago: 'wompi_online',
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/programs')
      .then((res) => setPrograms(res.data?.data || []))
      .catch(() => setPrograms([]));
  }, []);

  useEffect(() => {
    if (!service) return;
    const mod = service === 'food' ? 'food' : service === 'training' ? 'training' : 'd28d';
    fetchPaymentMethods(mod).then(setPaymentMethods);
  }, [service]);

  const filteredPlans = useMemo(() => {
    if (!service) return [];
    const kind = service;
    return plans.filter((p) => {
      if (String(p.kind) !== kind) return false;
      if (kind === 'd28d' && programId) {
        return String(p.program_id) === String(programId);
      }
      return true;
    });
  }, [plans, service, programId]);

  useEffect(() => {
    if (step !== 3 || !service) return;
    const params = { visible: 'true', kind: service };
    if (service === 'd28d' && programId) params.program_id = programId;
    api.get('/accounts/plans', { params })
      .then((res) => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlans([]));
  }, [step, service, programId]);

  const priceLabel = (plan) => {
    if (!plan) return '';
    if (currency === 'USD' && plan.precio_mensual_usd > 0) {
      return `USD ${plan.precio_mensual_usd} / mes`;
    }
    return `$${Number(plan.precio_mensual || 0).toLocaleString()} COP / mes`;
  };

  const goNext = () => {
    setError('');
    if (step === 1 && !service) {
      setError('Selecciona un servicio');
      return;
    }
    if (step === 2 && service === 'd28d' && !programId) {
      setError('Selecciona un programa D28D');
      return;
    }
    if (step === 3 && !selectedPlan) {
      setError('Selecciona un plan');
      return;
    }
    if (step === 4 && !currency) {
      setError('Selecciona moneda');
      return;
    }
    if (step === 1 && service !== 'd28d') {
      setStep(3);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!formData.genero) {
      setError('Selecciona tu género');
      return;
    }
    setLoading(true);
    try {
      const module_access = {
        ...MODULE_PRESETS[service],
        ...(service === 'd28d' && programId ? { d28d_program: programId } : {}),
      };
      await register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        teléfono: formData.teléfono,
        genero: formData.genero,
        module_access,
      });
      await login(formData.email, formData.password);
      const moduleCode = service === 'food' ? 'food' : service === 'training' ? 'training' : 'd28d';
      const planRes = await api.post('/accounts', {
        plan: selectedPlan.nombre,
        cycle_id: Array.isArray(selectedPlan.cycle_ids) && selectedPlan.cycle_ids.length
          ? selectedPlan.cycle_ids[0]
          : null,
        metodoPago: formData.metodoPago,
        module_code: moduleCode,
        currency,
      });
      if (formData.metodoPago === 'wompi_online' && planRes.data?.payment_url) {
        openWompiCheckout(planRes.data.payment_url);
      }
      window.location.assign('/');
    } catch (err) {
      setError(readApiError(err, 'No se pudo completar el registro'));
    } finally {
      setLoading(false);
    }
  };

  const maxStep = 5;
  const titles = ['Servicio', 'Programa', 'Plan', 'Moneda', 'Datos y pago'];

  return (
    <AuthLayout
      wide
      title={`Registro — ${titles[step - 1] || ''}`}
      subtitle={`Paso ${step} de ${maxStep} · ${PUBLIC_BRAND_NAME}`}
    >
      {error && <div className="error-message">{error}</div>}

      {step === 1 && (
        <div className="space-y-3">
          {SERVICES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left p-4 rounded-xl border ${
                service === s.id ? 'border-lime-500 bg-lime-50' : 'border-stone-200'
              }`}
              onClick={() => {
                setService(s.id);
                setProgramId('');
                setSelectedPlan(null);
              }}
            >
              <p className="font-semibold text-stone-900">{s.label}</p>
              <p className="text-sm text-stone-600">{s.desc}</p>
            </button>
          ))}
          <button type="button" className="btn-primary w-full" onClick={goNext}>Continuar</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {service === 'd28d' ? (
            programs.filter((p) => p.active !== false).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`w-full text-left p-4 rounded-xl border ${
                  programId === p.id ? 'border-lime-500 bg-lime-50' : 'border-stone-200'
                }`}
                onClick={() => {
                  setProgramId(p.id);
                  setSelectedPlan(null);
                }}
              >
                <p className="font-semibold">{p.name}</p>
              </button>
            ))
          ) : (
            <p className="text-stone-600 text-sm">Este servicio no requiere elegir programa. Continúa al plan.</p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>Atrás</button>
            <button type="button" className="btn-primary flex-1" onClick={goNext}>Continuar</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {filteredPlans.length ? filteredPlans.map((plan) => (
            <button
              key={plan.nombre}
              type="button"
              className={`w-full text-left p-4 rounded-xl border ${
                selectedPlan?.nombre === plan.nombre ? 'border-lime-500 bg-lime-50' : 'border-stone-200'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <p className="font-semibold">{plan.nombre}</p>
              <p className="text-sm text-stone-600">{plan.descripcion}</p>
              <p className="text-lime-700 font-medium text-sm mt-1">
                COP ${Number(plan.precio_mensual || 0).toLocaleString()}
                {plan.precio_mensual_usd > 0 ? ` · USD ${plan.precio_mensual_usd}` : ''}
              </p>
              {plan.is_couple && <p className="text-xs text-amber-700">Plan de pareja (2 usuarios)</p>}
            </button>
          )) : (
            <p className="text-stone-500">No hay planes visibles para esta selección.</p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(service === 'd28d' ? 2 : 1)}>Atrás</button>
            <button type="button" className="btn-primary flex-1" onClick={goNext}>Continuar</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">Plan: <strong>{selectedPlan?.nombre}</strong></p>
          {['COP', 'USD'].map((c) => (
            <button
              key={c}
              type="button"
              className={`w-full p-4 rounded-xl border text-left ${
                currency === c ? 'border-lime-500 bg-lime-50' : 'border-stone-200'
              }`}
              onClick={() => setCurrency(c)}
            >
              <span className="font-semibold">{c}</span>
              <span className="block text-sm text-stone-600">{priceLabel(selectedPlan)}</span>
            </button>
          ))}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(3)}>Atrás</button>
            <button type="button" className="btn-primary flex-1" onClick={goNext}>Continuar</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input" placeholder="Nombre completo" required value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          <input className="input" type="email" placeholder="Email" required value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <input className="input" type="password" placeholder="Contraseña (mín. 8)" required value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <input className="input" type="password" placeholder="Confirmar contraseña" required value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
          <select className="input" required value={formData.genero}
            onChange={(e) => setFormData({ ...formData, genero: e.target.value })}>
            <option value="">Género</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
          <div className="space-y-2">
            {(paymentMethods.length ? paymentMethods : [{ id: 'wompi_online', label: 'Wompi' }, { id: 'pago_sede', label: 'Pago en sede' }]).map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input type="radio" name="metodoPago" value={m.id} checked={formData.metodoPago === m.id}
                  onChange={() => setFormData({ ...formData, metodoPago: m.id })} />
                {m.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(4)}>Atrás</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Procesando…' : 'Registrarme y pagar'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-stone-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>Iniciar sesión</button>
      </p>
      <p className="text-center text-xs text-stone-400">
        ¿Tienes código de gym, coach o pareja?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>Usa el registro con código</button>
      </p>
    </AuthLayout>
  );
}
