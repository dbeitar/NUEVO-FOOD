import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import AuthLayout from './AuthLayout';
import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { fetchPaymentMethods, openWompiCheckout } from '../utils/paymentMethods';

const SERVICES = [
  { id: 'd28d', label: 'D28D', desc: 'Programas Vital, Pancitas o Virtual' },
  { id: 'food', label: 'FOOD_PLAN', desc: 'Nutrición y registro de alimentos' },
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
  const [entryMode, setEntryMode] = useState('direct');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteContext, setInviteContext] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const effectiveService = useMemo(() => {
    if (inviteContext) {
      const ma = inviteContext.module_access || {};
      if (ma.training && !ma.d28d) return 'training';
      if (ma.food_plan || ma.nutrition) return 'food';
      return 'd28d';
    }
    return service;
  }, [inviteContext, service]);

  const effectiveProgramId = useMemo(() => {
    if (inviteContext?.program_id) return inviteContext.program_id;
    return programId;
  }, [inviteContext, programId]);

  useEffect(() => {
    api.get('/programs/public', { skipShellAuth: true })
      .then((res) => setPrograms(res.data?.data || []))
      .catch((err) => {
        console.error('Error cargando programas para registro:', err);
        setPrograms([]);
        setError('No se pudieron cargar los programas. Recarga la página o intenta más tarde.');
      });
  }, []);

  useEffect(() => {
    const svc = effectiveService;
    if (!svc) return;
    const mod = svc === 'food' ? 'food' : svc === 'training' ? 'training' : 'd28d';
    fetchPaymentMethods(mod).then(setPaymentMethods);
  }, [effectiveService]);

  const filteredPlans = useMemo(() => {
    const svc = effectiveService;
    if (!svc) return [];
    let list = plans.filter((p) => {
      if (p.activo === false || p.visible === false) return false;
      if (String(p.kind) !== svc) return false;
      if (svc === 'd28d' && effectiveProgramId) {
        return String(p.program_id) === String(effectiveProgramId);
      }
      return true;
    });
    if (inviteContext?.plan_scope) {
      const scope = inviteContext.plan_scope;
      if (inviteContext.type === 'program' && inviteContext.program_id) {
        const pid = String(inviteContext.program_id);
        list = list.filter((p) => String(p.program_id || '') === pid);
      } else if (scope === 'trainer') {
        list = list.filter((p) => {
          const pid = String(p.program_id || '').toLowerCase();
          return pid === 'virtual_d28d' || pid === 'vital' || !p.program_id;
        });
      } else if (scope === 'gym' || scope === 'd28d') {
        list = list.filter((p) => {
          const pid = String(p.program_id || '').toLowerCase();
          return ['virtual_d28d', 'pancitas', 'vital'].includes(pid);
        });
      }
    }
    return list;
  }, [plans, effectiveService, effectiveProgramId, inviteContext]);

  useEffect(() => {
    if (!inviteContext?.suggested_plan || selectedPlan) return;
    const suggested = filteredPlans.find((p) => p.nombre === inviteContext.suggested_plan);
    if (suggested) setSelectedPlan(suggested);
  }, [inviteContext, filteredPlans, selectedPlan]);

  useEffect(() => {
    const svc = effectiveService;
    if (!svc) return;
    if (svc === 'd28d' && !effectiveProgramId && !inviteContext) return;
    const params = { visible: 'true', kind: svc };
    if (svc === 'd28d' && effectiveProgramId) params.program_id = effectiveProgramId;
    api.get('/accounts/plans', { params, skipShellAuth: true })
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setPlans(raw);
      })
      .catch((err) => {
        console.error('Error cargando planes:', err);
        setPlans([]);
      });
  }, [effectiveService, effectiveProgramId, inviteContext]);

  const priceForCurrency = (plan, moneda) => {
    if (!plan) return '';
    if (moneda === 'USD') {
      const usd = Number(plan.precio_mensual_usd || 0);
      return usd > 0 ? `USD ${usd.toLocaleString('en-US')} / mes` : 'Precio en USD no configurado';
    }
    return `$${Number(plan.precio_mensual || 0).toLocaleString('es-CO')} COP / mes`;
  };

  const validateInviteCode = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!inviteCode.trim()) {
      setError('Ingresa tu código de invitación');
      return;
    }
    setValidatingCode(true);
    try {
      const res = await api.post('/auth/resolve-invite', { code: inviteCode.trim() }, { skipShellAuth: true });
      const ctx = res.data?.data;
      if (!ctx) {
        setError('Código no válido');
        return;
      }
      setInviteContext(ctx);
      setSelectedPlan(null);
      if (ctx.program_id) setProgramId(ctx.program_id);
      setStep(3);
    } catch (err) {
      setError(readApiError(err, 'No pudimos validar el código'));
    } finally {
      setValidatingCode(false);
    }
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
    if (step === 3 && !currency) {
      setError('Selecciona si pagarás en COP o USD');
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
      const module_access = inviteContext?.module_access || {
        ...MODULE_PRESETS[effectiveService],
        ...(effectiveService === 'd28d' && effectiveProgramId ? { d28d_program: effectiveProgramId } : {}),
      };
      await register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        teléfono: formData.teléfono,
        genero: formData.genero,
        module_access,
        gym_id: inviteContext?.gym_id ?? null,
        trainer_id: inviteContext?.trainer_id ?? null,
        invite_code: inviteContext ? inviteCode.trim() : undefined,
      });
      await login(formData.email, formData.password);
      const moduleCode = effectiveService === 'food' ? 'food' : effectiveService === 'training' ? 'training' : 'd28d';
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

      {step === 1 && entryMode === 'invite' && (
        <form onSubmit={validateInviteCode} className="space-y-3">
          <p className="text-sm text-stone-400">
            Código de programa D28D, entrenador, gimnasio o pareja.
          </p>
          <input
            className="input font-mono uppercase"
            placeholder="Ej. GYM-PRO-001"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" className="btn-primary w-full" disabled={validatingCode}>
            {validatingCode ? 'Validando…' : 'Validar código'}
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => { setEntryMode('direct'); setInviteCode(''); setInviteContext(null); setError(''); }}
          >
            Volver a registro directo
          </button>
        </form>
      )}

      {step === 1 && entryMode === 'direct' && (
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

      {inviteContext && step >= 3 && (
        <p className="text-sm text-lime-400 mb-2">Código: {inviteContext.label || inviteCode}</p>
      )}

      {step === 3 && (
        <div className="space-y-4 notranslate" translate="no">
          {filteredPlans.length ? filteredPlans.map((plan) => (
            <button
              key={plan.nombre}
              type="button"
              className={`register-option w-full text-left p-4 rounded-xl border ${
                selectedPlan?.nombre === plan.nombre ? 'register-option--active' : ''
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <p className="font-semibold register-option-title">{plan.nombre}</p>
              <p className="text-sm register-option-muted">{plan.descripcion}</p>
              <p className="register-option-price text-sm mt-1 notranslate" translate="no">
                {priceForCurrency(plan, 'COP')}
                {Number(plan.precio_mensual_usd || 0) > 0 ? ` · ${priceForCurrency(plan, 'USD')}` : ''}
              </p>
              {plan.is_couple && <p className="text-xs text-amber-400">Plan de pareja (2 usuarios)</p>}
            </button>
          )) : (
            <p className="register-option-muted">
              No hay planes activos para este programa. En admin → Programas D28D → pestaña Planes, marca los planes como Activos.
            </p>
          )}

          {selectedPlan && (
            <div className="space-y-2 border-t border-stone-600 pt-4">
              <p className="text-sm font-semibold text-stone-200">¿En qué moneda deseas pagar?</p>
              {[
                { id: 'COP', title: 'Pesos colombianos (COP)' },
                { id: 'USD', title: 'Dólares estadounidenses (USD)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`register-option w-full p-4 rounded-xl border text-left ${
                    currency === opt.id ? 'register-option--active' : ''
                  }`}
                  onClick={() => setCurrency(opt.id)}
                >
                  <span className="font-semibold register-option-title block">{opt.title}</span>
                  <span className="text-sm register-option-muted block mt-1">
                    {priceForCurrency(selectedPlan, opt.id)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => {
              if (inviteContext) {
                setStep(1);
                setEntryMode('invite');
              } else {
                setStep(effectiveService === 'd28d' ? 2 : 1);
              }
            }}>Atrás</button>
            <button type="button" className="btn-primary flex-1" onClick={goNext} disabled={!selectedPlan || !currency}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 notranslate" translate="no">
          <p className="text-sm text-stone-300">Confirma moneda y plan</p>
          <p className="register-option-title font-semibold">{selectedPlan?.nombre}</p>
          <p className="register-option-price">{priceForCurrency(selectedPlan, currency)}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setStep(3)}>Atrás</button>
            <button type="button" className="btn-primary flex-1" onClick={goNext}>Continuar a datos</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {selectedPlan && (
            <div className="rounded-lg border border-stone-600 bg-stone-900/40 p-3 text-sm notranslate" translate="no">
              <p><strong>Plan:</strong> {selectedPlan.nombre}</p>
              <p><strong>Pago:</strong> {currency === 'USD' ? 'Dólares (USD)' : 'Pesos colombianos (COP)'}</p>
              <p className="text-lime-400">{priceForCurrency(selectedPlan, currency)}</p>
            </div>
          )}
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
        ¿Tienes código de gym, coach o programa?{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => { setEntryMode('invite'); setStep(1); setError(''); }}
        >
          Registrarme con código
        </button>
      </p>
    </AuthLayout>
  );
}
