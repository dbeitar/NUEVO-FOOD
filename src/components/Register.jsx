import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';
import AuthLayout from './AuthLayout';
import { useI18n } from '../context/useI18n';
import { PUBLIC_BRAND_NAME } from '../utils/branding';
import { fetchPaymentMethods, openWompiCheckout } from '../utils/paymentMethods';

function readApiError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (err?.response?.status === 429) {
    return 'Demasiados intentos. Espera unos minutos o reinicia el backend en desarrollo.';
  }
  return fallback;
}

const MODULE_LABELS = {
  training: 'Entrenamiento',
  nutrition: 'Plan de alimentación',
  food_plan: 'Plan de alimentación',
  d28d: 'Programas D28D',
  live_classes: 'Clases en vivo',
};

export default function Register({ onSwitchToLogin }) {
  const { t } = useI18n();
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
    metodoPago: 'wompi_online',
    tiene_restricciones: false,
    restricciones_detalles: '',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [inviteContext, setInviteContext] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const { register, login } = useAuth();

  useEffect(() => {
    api.get('/accounts/plans')
      .then((res) => setPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    if (!inviteContext) return;
    const mod = inviteContext?.module_access?.training && !inviteContext?.module_access?.d28d
      ? 'training'
      : inviteContext?.module_access?.food_plan || inviteContext?.module_access?.nutrition
        ? 'food'
        : 'd28d';
    fetchPaymentMethods(mod).then(setPaymentMethods);
  }, [inviteContext]);

  const filteredPlans = useMemo(() => {
    if (!inviteContext?.plan_scope) return plans;
    const scope = inviteContext.plan_scope;
    if (scope === 'trainer') {
      return plans.filter((p) => {
        const pid = String(p.program_id || '').toLowerCase();
        return pid === 'virtual_d28d' || pid === 'vital' || !p.program_id;
      });
    }
    if (scope === 'gym' || scope === 'd28d') {
      return plans.filter((p) => {
        const pid = String(p.program_id || '').toLowerCase();
        return ['virtual_d28d', 'pancitas', 'vital'].includes(pid);
      });
    }
    return plans;
  }, [plans, inviteContext]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    if (!acceptPrivacy || !acceptTerms) {
      setError(t('register.accept_required', 'Debes aceptar la Política de Privacidad y los Términos de Servicio'));
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('register.password_mismatch', 'Las contraseñas no coinciden'));
      return;
    }
    if (formData.password.length < 8) {
      setError(t('register.password_min', 'La contraseña debe tener al menos 8 caracteres'));
      return;
    }
    if (!formData.genero) {
      setError(t('register.gender_required', 'Por favor selecciona tu género'));
      return;
    }
    setStep(2);
  };

  const validateInviteCode = async (e) => {
    e.preventDefault();
    setError('');
    setValidatingCode(true);
    try {
      const res = await api.post('/auth/resolve-invite', { code: inviteCode });
      const ctx = res.data?.data;
      if (!ctx) {
        setError(t('register.invite_invalid', 'Código no válido'));
        return;
      }
      setInviteContext(ctx);
      setSelectedPlan(null);
      setStep(3);
    } catch (err) {
      setError(readApiError(err, t('register.invite_validate_error', 'No pudimos validar el código')));
    } finally {
      setValidatingCode(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!inviteContext) {
      setError(t('register.invite_required', 'Primero valida tu código de entrenador o gimnasio'));
      setStep(2);
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register({
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        teléfono: formData.teléfono,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        peso: formData.peso || null,
        altura: formData.altura || null,
        genero: formData.genero,
        objetivo: formData.objetivo,
        tiene_restricciones: formData.tiene_restricciones,
        restricciones_detalles: formData.restricciones_detalles,
        gym_id: inviteContext.gym_id,
        trainer_id: inviteContext.trainer_id,
        module_access: inviteContext.module_access,
        invite_code: inviteCode.trim(),
      });
      try {
        await login(formData.email, formData.password);
      } catch (loginErr) {
        setError(
          `Cuenta creada, pero no pudimos iniciar sesión automáticamente: ${readApiError(loginErr, 'revisa tu contraseña')}. Usa "Iniciar sesión" con el mismo email.`
        );
        return;
      }
      if (selectedPlan) {
        try {
          const mod = inviteContext?.module_access?.training && !inviteContext?.module_access?.d28d
            ? 'training'
            : inviteContext?.module_access?.food_plan || inviteContext?.module_access?.nutrition
              ? 'food'
              : 'd28d';
          const planRes = await api.post('/accounts', {
            plan: selectedPlan.nombre,
            gym_id: inviteContext.gym_id || null,
            trainer_id: inviteContext.trainer_id || null,
            metodoPago: formData.metodoPago,
            module_code: mod,
          });
          if (formData.metodoPago === 'wompi_online' && planRes.data?.payment_url) {
            openWompiCheckout(planRes.data.payment_url);
          }
        } catch (planErr) {
          console.warn('Plan opcional no activado:', planErr?.response?.data || planErr.message);
        }
      }
      if (rememberEmail && formData.email) {
        try {
          localStorage.setItem('prefillEmail', formData.email);
        } catch { /* noop */ }
      }
      setSuccess('¡Registro completado! Entrando a tu cuenta...');
      try {
        localStorage.setItem('afterRegisterHome', '1');
      } catch { /* noop */ }
      window.location.assign('/');
    } catch (err) {
      setError(readApiError(err, 'Error al completar el registro'));
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = step === 1 ? 'Crear cuenta' : step === 2 ? 'Código de acceso' : 'Elige tu plan';
  const stepSubtitle = step === 1
    ? `Únete a ${PUBLIC_BRAND_NAME}`
    : step === 2
      ? 'Ingresa el código que te dio tu entrenador, tu gimnasio o D28D'
      : inviteContext?.label || 'Selecciona un plan para activar tus módulos';

  return (
    <>
      <AuthLayout wide={step >= 2} title={stepTitle} subtitle={stepSubtitle}>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="nombre" className="label">Nombre completo</label>
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
                <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="Repite tu contraseña" className="input" />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="form-group">
                <label htmlFor="teléfono" className="label">Teléfono</label>
                <input type="tel" id="teléfono" name="teléfono" value={formData.teléfono} onChange={handleChange} placeholder="+57 300 000 0000" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="fecha_nacimiento" className="label">Fecha de nacimiento</label>
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
                <input type="number" id="altura" name="altura" value={formData.altura} onChange={handleChange} placeholder="170" step="0.1" className="input" />
              </div>
              <div className="form-group">
                <label htmlFor="genero" className="label">Género</label>
                <select id="genero" name="genero" value={formData.genero} onChange={handleChange} className="input" required>
                  <option value="">Selecciona</option>
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
                  checked={formData.tiene_restricciones}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tiene_restricciones: e.target.checked }))}
                />
                <label htmlFor="tiene_restricciones">Tengo restricciones o recomendaciones de alimentación</label>
              </div>
              {formData.tiene_restricciones && (
                <textarea
                  name="restricciones_detalles"
                  value={formData.restricciones_detalles}
                  onChange={handleChange}
                  placeholder="Alergias, vegetariano, recomendaciones médicas…"
                  className="input mt-2"
                  rows="3"
                />
              )}
            </div>
            <div className="form-group">
              <label htmlFor="objetivo" className="label">Objetivo</label>
              <select id="objetivo" name="objetivo" value={formData.objetivo} onChange={handleChange} className="input">
                <option value="">Selecciona tu objetivo</option>
                <option value="pérdida_de_grasa">Pérdida de grasa</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="ganancia_muscular">Ganancia muscular</option>
              </select>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="rememberEmail" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} />
              <label htmlFor="rememberEmail">Recordar mi correo para iniciar sesión</label>
            </div>
            <div className="policies-section">
              <div className="checkbox-group">
                <input type="checkbox" id="acceptPrivacy" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
                <label htmlFor="acceptPrivacy">
                  {t('register.accept_privacy', 'Acepto la')}{' '}
                  <button type="button" onClick={() => setShowPrivacyModal(true)} className="policy-link">{t('register.privacy_link', 'Política de Privacidad')}</button>
                </label>
              </div>
              <div className="checkbox-group">
                <input type="checkbox" id="acceptTerms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                <label htmlFor="acceptTerms">
                  {t('register.accept_terms', 'Acepto los')}{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="policy-link">{t('register.terms_link', 'Términos y Condiciones')}</button>
                </label>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">Continuar</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={validateInviteCode} className="space-y-4">
            <p className="text-stone-600 text-sm">
              Antes de elegir plan, indica el código de tu <strong>entrenador</strong>, tu <strong>gimnasio</strong> o el código <strong>D28D</strong>.
            </p>
            <div className="form-group">
              <label htmlFor="inviteCode" className="label">Código de invitación</label>
              <input
                id="inviteCode"
                type="text"
                className="input uppercase"
                placeholder="Ej: COACH-CARLOS-001, GYM-D28D-004, D28D-PILOTO"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-stone-500">
              Piloto: <code className="bg-stone-100 px-1 rounded">D28D-PILOTO</code> · Gimnasio D28D: <code className="bg-stone-100 px-1 rounded">GYM-D28D-004</code> · Coach: <code className="bg-stone-100 px-1 rounded">COACH-CARLOS-001</code>
            </p>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>Atrás</button>
              <button type="submit" className="btn-primary flex-1" disabled={validatingCode}>
                {validatingCode ? 'Validando…' : 'Validar código'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && inviteContext && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="bg-lime-50 border border-lime-200 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-stone-900">{inviteContext.label}</p>
              <p className="text-stone-600 mt-1">Módulos que tendrás activos:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(inviteContext.module_access || {})
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <li key={key} className="text-xs bg-white border border-lime-300 text-lime-800 px-2 py-1 rounded-full">
                      {MODULE_LABELS[key] || key}
                    </li>
                  ))}
              </ul>
            </div>

            <p className="text-stone-600 text-sm">Elige un plan (opcional — puedes activarlo después con tu coach).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPlans.map((plan) => {
                const selected = selectedPlan?.nombre === plan.nombre;
                return (
                  <button
                    key={plan.nombre}
                    type="button"
                    onClick={() => setSelectedPlan(selected ? null : plan)}
                    className={`card text-left p-4 transition-all ${selected ? 'ring-2 ring-lime-500 bg-lime-50/50' : 'hover:border-stone-300'}`}
                  >
                    <h4 className="font-bold text-stone-900">{plan.nombre?.toUpperCase()}</h4>
                    <p className="text-lime-600 font-semibold">${(plan.precio_mensual || 0).toLocaleString()}/mes</p>
                    <p className="text-stone-600 text-sm mt-1">{plan.descripcion}</p>
                  </button>
                );
              })}
            </div>
            {filteredPlans.length === 0 && (
              <p className="text-stone-500 text-sm">No hay planes para este código. Puedes terminar el registro y tu coach te asignará uno.</p>
            )}

            <div className="form-group">
              <label className="label">Método de pago</label>
              <div className="space-y-2">
                {(paymentMethods.length ? paymentMethods : [
                  { id: 'wompi_online', label: 'Pago en línea (Wompi)' },
                  { id: 'pago_sede', label: 'Pago en sede' },
                ]).map((m) => (
                  <label key={m.id} className="flex items-center gap-2 p-3 rounded-lg border border-stone-200 cursor-pointer">
                    <input
                      type="radio"
                      name="metodoPago"
                      value={m.id}
                      checked={formData.metodoPago === m.id}
                      onChange={handleChange}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={() => setStep(2)}>Atrás</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Completando…' : selectedPlan ? 'Confirmar registro' : 'Terminar sin plan'}
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
