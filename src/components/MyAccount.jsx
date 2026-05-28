import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
 
import { emitToast } from '../context/toast';
import { useI18n } from '../context/useI18n';
import CoachBrandingPanel from './CoachBrandingPanel';
import { fetchPaymentMethods, openWompiCheckout } from '../utils/paymentMethods';
import { buildWaMeUrl, resolvePlanSupport } from '../utils/whatsappSupport';

export default function MyAccount() {
  const { user, refreshProfile } = useAuth();
  const { t } = useI18n();
  const isPlanSelection = (() => {
    try {
      return (window.location && window.location.pathname) === '/planes';
    } catch {
      return false;
    }
  })();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [myServices, setMyServices] = useState([]);
  const [planSupport, setPlanSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [handledPending, setHandledPending] = useState(false);
  
  // Estados para el flujo de suscripción
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [formData, setFormData] = useState({
    gym_id: '',
    trainer_id: '',
    cycle_id: '',
    metodoPago: 'wompi_online',
    module_code: 'd28d',
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [profileData, setProfileData] = useState({
    telefono: user?.telefono || '',
    fecha_nacimiento: user?.fecha_nacimiento || '',
    peso: user?.peso || '',
    altura: user?.altura || '',
    objetivo: user?.objetivo || 'mantenimiento'
  });
  const getEstadoBadgeClass = (e) => {
    if (!e) return 'badge-slate';
    const s = String(e).toLowerCase();
    if (['activo','vigente'].includes(s)) return 'badge-green';
    if (['pendiente','en_proceso'].includes(s)) return 'badge-warning';
    if (['vencido','cancelado'].includes(s)) return 'badge-danger';
    return 'badge-slate';
  };

  const userProgramId = user?.module_access?.d28d_program || null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const planParams = { kind: 'd28d' };
      if (userProgramId) planParams.program_id = userProgramId;
      const plansRes = await api.get('/accounts/plans', { params: planParams });
      setPlans(plansRes.data || []);
      if (!isPlanSelection) {
        try {
          const myAccountRes = await api.get('/accounts/me');
          const d = myAccountRes.data;
          if (d && typeof d === 'object' && ('hasAccount' in d)) {
            setCurrentPlan(d.hasAccount ? d.account : null);
            setPlanSupport(d.plan_support || null);
          } else {
            // Compatibilidad con respuesta antigua (objeto cuenta directa)
            setCurrentPlan(d || null);
          }
        } catch {
          console.warn('Sin plan activo al consultar /accounts/me');
        }
        try {
          const svcRes = await api.get('/accounts/my-services');
          setMyServices(svcRes.data?.services || []);
        } catch {
          setMyServices([]);
        }
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
    } finally {
      setLoading(false);
    }
  }, [isPlanSelection, userProgramId]);

  const fetchOptions = useCallback(async () => {
    try {
      const [gymsRes, trainersRes, cyclesRes] = await Promise.all([
        api.get('/gyms'),
        api.get('/trainers'),
        api.get('/cycles'),
      ]);
      setGyms(gymsRes.data || []);
      setTrainers(trainersRes.data || []);
      setCycles(cyclesRes.data?.data || []);
    } catch (err) {
      console.error('Error cargando opciones:', err);
    }
  }, []);

  const handleContactSupport = async () => {
    let support = planSupport;
    if (!support) {
      try {
        const res = await api.get('/communications/support');
        support = res.data?.data;
        setPlanSupport(support);
      } catch {
        const planName = currentPlan?.plan;
        const fromList = plans.find((p) => p.nombre === planName);
        support = resolvePlanSupport(fromList);
      }
    }
    const url = support?.wa_url || buildWaMeUrl('573192635819', support?.support_message);
    try {
      await api.post('/communications/whatsapp/click', {
        plan_nombre: currentPlan?.plan || null,
        program_id: user?.module_access?.d28d_program || null,
        kind: user?.module_access?.training ? 'training' : (user?.module_access?.food_plan ? 'food' : 'd28d'),
        whatsapp: support?.support_whatsapp,
        message: support?.support_message,
      });
    } catch {
      /* no bloquear apertura */
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyCoupleCode = async () => {
    const code = currentPlan?.couple_invite_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      emitToast({ type: 'success', title: 'Copiado', message: 'Código de pareja copiado al portapapeles' });
    } catch {
      emitToast({ type: 'info', title: code, message: 'Copia el código manualmente' });
    }
  };

  const cyclesForPlan = (plan) => {
    const ids = Array.isArray(plan?.cycle_ids) ? plan.cycle_ids : [];
    if (!ids.length) return cycles;
    return cycles.filter((c) => ids.includes(Number(c.id)));
  };

  useEffect(() => {
    fetchData();
    fetchOptions();
    fetchPaymentMethods('d28d').then(setPaymentMethods);
  }, [fetchData, fetchOptions]);

  // Auto-suscripción si viene con plan pendiente desde el registro
  useEffect(() => {
    const tryPending = async () => {
      if (handledPending || currentPlan) return;
      let raw = null;
      try {
        raw = localStorage.getItem('pendingSubscription');
      } catch {
        console.warn('No se pudo leer pendingSubscription');
      }
      if (!raw) return;
      let pending = null;
      try {
        pending = JSON.parse(raw);
      } catch {
        console.warn('JSON inválido en pendingSubscription');
      }
      if (!pending || !pending.plan) return;
      try {
        const res = await api.post('/accounts', {
          plan: pending.plan,
          gym_id: pending.gym_id || null,
          trainer_id: pending.trainer_id || null,
          metodoPago: pending.metodoPago || 'tarjeta_credito',
        });
        setCurrentPlan(res.data?.account || null);
        emitToast({ type: 'success', title: 'Suscripción activada', message: `Plan ${pending.plan.toUpperCase()} activo` });
        try { localStorage.removeItem('pendingSubscription'); } catch { console.warn('No se pudo limpiar pendingSubscription'); }
        if (isPlanSelection) { window.location.assign('/my-account'); }
      } catch (e) {
        // Si falla, no bloqueamos la vista
        console.error('Auto-suscripción falló', e);
      } finally {
        setHandledPending(true);
      }
    };
    tryPending();
  }, [handledPending, currentPlan, isPlanSelection]);

  const openSubscribeModal = (plan) => {
    setSelectedPlan(plan);
    const allowed = cyclesForPlan(plan);
    const defaultCycle = allowed.length === 1 ? String(allowed[0].id) : '';
    setShowModal(true);
    setFormData((prev) => ({ ...prev, gym_id: '', trainer_id: '', cycle_id: defaultCycle }));
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    // Reglas:
    // - Si no hay gimnasio NI entrenador, el pago es obligatorio (se procesa ahora mismo).
    // - Si hay gimnasio o entrenador, el pago es opcional.

    try {
      const res = await api.post('/accounts', {
        plan: selectedPlan.nombre,
        gym_id: formData.gym_id ? parseInt(formData.gym_id, 10) : null,
        trainer_id: formData.trainer_id ? parseInt(formData.trainer_id, 10) : null,
        cycle_id: formData.cycle_id ? parseInt(formData.cycle_id, 10) : null,
        metodoPago: formData.metodoPago,
        module_code: formData.module_code || 'd28d',
      });
      const payload = res.data || {};
      if (formData.metodoPago === 'wompi_online' && payload.payment_url) {
        openWompiCheckout(payload.payment_url);
      }
      const pending = payload.pending;
      emitToast({
        type: 'success',
        title: pending ? 'Solicitud registrada' : 'Suscripción exitosa',
        message: pending
          ? 'Tu coach o administrador confirmará el pago en sede, o completa Wompi en la pestaña abierta.'
          : `Plan ${selectedPlan.nombre.toUpperCase()} activado`,
      });
      setCurrentPlan(payload.account || null);
      await refreshProfile();
      setShowModal(false);
      if (isPlanSelection) window.location.assign('/my-account');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al suscribirse');
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', {
        telefono: profileData.telefono || null,
        fecha_nacimiento: profileData.fecha_nacimiento || null,
        peso: profileData.peso ? parseFloat(profileData.peso) : null,
        altura: profileData.altura ? parseFloat(profileData.altura) : null,
        objetivo: profileData.objetivo || null
      });
      await refreshProfile();
      emitToast({ type: 'success', title: 'Perfil actualizado', message: 'Tus datos fueron guardados' });
    } catch {
      setError('No se pudo actualizar el perfil');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{t('loading', 'Cargando...')}</div>;

  return (
    <div className="space-y-8">
      <header className="card bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-lime-400 mb-4">{t('myaccount.profile', 'Mi Perfil')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-stone-400 text-sm uppercase tracking-wider">{t('common.name', 'Nombre')}</p>
              <p className="font-medium text-lg">{user?.nombre}</p>
            </div>
            <div>
              <p className="text-stone-400 text-sm uppercase tracking-wider">{t('common.email', 'Email')}</p>
              <p className="font-medium text-lg">{user?.email}</p>
            </div>
            {(() => {
              const roles = user?.roles && user.roles.length ? user.roles : [user?.rol || 'usuario_final'];
              const adminLike = roles.some((r) => r !== 'usuario_final');
              if (!adminLike) return null;
              return (
                <div className="md:col-span-2 mt-2">
                  <p className="text-stone-400 text-sm uppercase tracking-wider mb-2">{t('common.roles', 'Permisos')}</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <span key={r} className="px-3 py-1 bg-lime-500/20 text-lime-300 border border-lime-500/30 rounded-full text-xs font-semibold tracking-wide uppercase">
                        {r.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {error && <div className="card border border-red-800 text-red-400">{error}</div>}

      {!isPlanSelection && myServices.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-sans font-bold text-stone-900">Mis Servicios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myServices.map((svc) => (
              <div key={svc.service} className="card border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-stone-900">{svc.label}</h4>
                  <span className={`badge ${getEstadoBadgeClass(svc.status)}`}>{svc.status}</span>
                </div>
                {svc.program_name && (
                  <p className="text-sm text-stone-600">Programa: <strong>{svc.program_name}</strong></p>
                )}
                {svc.plan && (
                  <p className="text-sm text-stone-600">Plan: <strong>{svc.plan}</strong></p>
                )}
                {svc.valid_from && (
                  <p className="text-xs text-stone-500 mt-1">Inicio: {new Date(svc.valid_from).toLocaleDateString()}</p>
                )}
                {svc.valid_until && (
                  <p className="text-xs text-stone-500">Vence: {new Date(svc.valid_until).toLocaleDateString()}</p>
                )}
                {svc.plan_support?.support_activo !== false && (
                  <button
                    type="button"
                    className="btn-secondary text-xs mt-3 w-full"
                    onClick={async () => {
                      const url = svc.plan_support?.wa_url || buildWaMeUrl('573192635819', svc.plan_support?.support_message);
                      try {
                        await api.post('/communications/whatsapp/click', {
                          plan_nombre: svc.plan,
                          program_id: svc.program_id,
                          kind: svc.service,
                        });
                      } catch { /* noop */ }
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    WhatsApp soporte
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isPlanSelection && (
        <section className="space-y-4">
          <h3 className="font-sans font-bold text-stone-900">{t('myaccount.current_subscription', 'Mi Suscripción Actual')}</h3>
          {currentPlan ? (
            <div className="card">
              <h4 className="text-lg font-semibold text-stone-900 mb-2">Plan {currentPlan.plan.toUpperCase()}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-600">
                <p>{t('common.role', 'Rol')}: <span className={`badge ${getEstadoBadgeClass(currentPlan.estado)}`}>{currentPlan.estado}</span></p>
                <p>{t('myaccount.expires', 'Vence')}: {new Date(currentPlan.fecha_vencimiento).toLocaleDateString()}</p>
                <p>{t('myaccount.gym', 'Sede')}: {gyms.find(g => g.id === currentPlan.gym_id)?.nombre || 'N/A'}</p>
                <p>{t('myaccount.trainer', 'Entrenador')}: {trainers.find(tr => tr.id === currentPlan.trainer_id)?.nombre || 'Ninguno'}</p>
                <p>{t('myaccount.sessions_left', 'Sesiones Restantes')}: {currentPlan.sesiones_restantes}</p>
                {currentPlan.cycle_id ? (
                  <p>Ciclo D28D: {cycles.find((c) => Number(c.id) === Number(currentPlan.cycle_id))?.name || currentPlan.cycle_id}</p>
                ) : null}
              </div>
              {currentPlan.couple_invite_code && !currentPlan.couple_invite_used_by_user_id && (
                <div className="mt-4 p-4 rounded-xl bg-lime-50 border border-lime-200">
                  <p className="text-sm font-semibold text-stone-800 mb-1">Código para tu pareja (un solo uso)</p>
                  <p className="font-mono text-lg text-lime-800 break-all">{currentPlan.couple_invite_code}</p>
                  <button type="button" className="btn-secondary mt-2" onClick={copyCoupleCode}>
                    Copiar código
                  </button>
                  <p className="text-xs text-stone-500 mt-2">Compártelo en el registro; heredará plan, programa y vigencia.</p>
                </div>
              )}
              {currentPlan.primary_account_id && (
                <p className="text-sm text-stone-500 mt-3">Cuenta vinculada a plan de pareja (invitado).</p>
              )}
              <div className="mt-4 pt-4 border-t border-stone-200">
                <p className="text-sm font-semibold text-stone-800 mb-2">Soporte</p>
                <button type="button" className="btn-primary" onClick={handleContactSupport}>
                  CONTACTAR SOPORTE
                </button>
                <p className="text-xs text-stone-500 mt-2">Se abrirá WhatsApp con el mensaje configurado para tu plan.</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <p className="text-stone-600">{t('myaccount.no_active', 'No tienes una suscripción activa.')}</p>
            </div>
          )}
        </section>
      )}

      {!isPlanSelection && (user?.roles?.includes('entrenador') || user?.rol === 'entrenador') && user?.trainer_id && (
        <CoachBrandingPanel trainerId={user.trainer_id} />
      )}

      {!isPlanSelection && (
        <section className="space-y-4">
          <h3 className="font-sans font-bold text-stone-900">{t('myaccount.mydata', 'Mis Datos')}</h3>
          <form onSubmit={handleSaveProfile} className="card grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('myaccount.birthdate', 'Fecha de Nacimiento')}</label>
              <input type="date" name="fecha_nacimiento" value={profileData.fecha_nacimiento || ''} onChange={handleProfileChange} className="input" />
            </div>
            <div>
              <label className="label">{t('myaccount.objective', 'Objetivo')}</label>
              <select name="objetivo" value={profileData.objetivo || 'mantenimiento'} onChange={handleProfileChange} className="input">
                <option value="mantenimiento">Mantenimiento</option>
                <option value="perdida_grasa">Pérdida de Grasa</option>
                <option value="ganancia_muscular">Ganancia Muscular</option>
              </select>
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" step="0.1" name="peso" value={profileData.peso || ''} onChange={handleProfileChange} className="input" placeholder="70" />
            </div>
            <div>
              <label className="label">Altura (cm)</label>
              <input type="number" step="0.1" name="altura" value={profileData.altura || ''} onChange={handleProfileChange} className="input" placeholder="175" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary">{t('myaccount.save', 'Guardar Cambios')}</button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="font-sans font-bold text-stone-900">{isPlanSelection ? t('myaccount.choose_plan', 'Elige tu plan') : t('myaccount.available_plans', 'Planes Disponibles')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.nombre}
              className={`card ${currentPlan?.plan === plan.nombre ? 'ring-2 ring-lime-400' : ''}`}
            >
              <h4 className="text-xl font-bold text-stone-900 mb-1">{plan.nombre.toUpperCase()}</h4>
              <p className="text-2xl font-extrabold text-lime-600 mb-2">
                ${plan.precio_mensual.toLocaleString()} COP
                {plan.precio_mensual_usd > 0 && (
                  <span className="text-base text-stone-600 font-semibold"> · USD {plan.precio_mensual_usd}</span>
                )}
                <span className="text-sm text-stone-600 font-medium"> / mes</span>
              </p>
              {plan.is_couple && (
                <p className="text-xs text-lime-700 font-medium mb-2">Plan de pareja — incluye código para 2.ª persona</p>
              )}
              <p className="text-stone-600 mb-4">{plan.descripcion}</p>
              <ul className="space-y-1 text-stone-600 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-lime-600">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {currentPlan?.plan === plan.nombre ? (
                <button disabled className="btn-secondary w-full opacity-80">{t('common.current', 'Tu Plan Actual')}</button>
              ) : (
                <button 
                  onClick={() => openSubscribeModal(plan)} 
                  className="btn-primary w-full"
                >
                  {t('myaccount.subscribe', 'Contratar')}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {showModal && selectedPlan && (
        <div className="form-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="form-modal w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="form-modal-content">
            <h3 className="text-xl font-bold mb-1">{t('myaccount.subscribe_plan', 'Contratar Plan')} {selectedPlan.nombre.toUpperCase()}</h3>
            <p className="text-lime-400 text-2xl font-extrabold mb-4">
              ${selectedPlan.precio_mensual.toLocaleString()} COP
              {selectedPlan.precio_mensual_usd > 0 && ` · USD ${selectedPlan.precio_mensual_usd}`}
            </p>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <p className="text-stone-600 text-sm">{t('myaccount.plan_hint', 'Puedes elegir gimnasio, entrenador, ambos o ninguno. Solo el plan es obligatorio.')}</p>
              {cyclesForPlan(selectedPlan).length > 0 && (
                <div>
                  <label className="label">Ciclo D28D</label>
                  <select
                    value={formData.cycle_id}
                    onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
                    className="input"
                    required={cyclesForPlan(selectedPlan).length > 0}
                  >
                    <option value="">Selecciona ciclo</option>
                    {cyclesForPlan(selectedPlan).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.startDate})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Gimnasio (opcional)</label>
                <select
                  value={formData.gym_id}
                  onChange={(e) => setFormData({...formData, gym_id: e.target.value})}
                  className="input"
                >
                  <option value="">Ninguno</option>
                  {gyms.map(gym => (
                    <option key={gym.id} value={gym.id}>{gym.nombre}{gym.ciudad ? ` (${gym.ciudad})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Entrenador (opcional)</label>
                <select 
                  value={formData.trainer_id}
                  onChange={(e) => setFormData({...formData, trainer_id: e.target.value})}
                  className="input"
                >
                  <option value="">Ninguno</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>{trainer.nombre}{trainer.especialidad ? ` (${trainer.especialidad})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">{t('myaccount.method', 'Método de Pago')}</label>
                <div className="space-y-2 mt-1">
                  {(paymentMethods.length ? paymentMethods : [
                    { id: 'wompi_online', label: 'Pago en línea (Wompi)' },
                    { id: 'pago_sede', label: 'Pago en sede' },
                  ]).map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-3 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50">
                      <input
                        type="radio"
                        name="metodoPago"
                        value={m.id}
                        checked={formData.metodoPago === m.id}
                        onChange={() => setFormData({ ...formData, metodoPago: m.id })}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
                {formData.metodoPago === 'wompi_online' && (
                  <p className="text-xs text-stone-500 mt-2">
                    {t('myaccount.wompi_hint', 'Al confirmar se abrirá el checkout Wompi en una nueva pestaña.')}
                  </p>
                )}
                {formData.metodoPago === 'pago_sede' && (
                  <p className="text-xs text-stone-500 mt-2">
                    {t('myaccount.sede_hint', 'Tu entrenador o administrador recibirá la notificación y activará tu vigencia.')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel', 'Cancelar')}</button>
                <button type="submit" className="btn-primary">
                  {(!formData.gym_id && !formData.trainer_id) ? t('myaccount.confirm_and_pay', 'Confirmar y Pagar') : t('myaccount.confirm', 'Confirmar')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
