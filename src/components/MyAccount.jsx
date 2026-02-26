import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { emitToast } from '../context/ToastContext.jsx';

export default function MyAccount() {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPlanSelection = location.pathname === '/planes';
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [handledPending, setHandledPending] = useState(false);
  
  // Estados para el flujo de suscripción
  const [gyms, setGyms] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({
    gym_id: '',
    trainer_id: '',
    metodoPago: 'tarjeta_credito'
  });
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

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const plansRes = await api.get('/accounts/plans');
      setPlans(plansRes.data || []);
      if (!isPlanSelection) {
        try {
          const myAccountRes = await api.get('/accounts/me');
          const d = myAccountRes.data;
          if (d && typeof d === 'object' && ('hasAccount' in d)) {
            setCurrentPlan(d.hasAccount ? d.account : null);
          } else {
            // Compatibilidad con respuesta antigua (objeto cuenta directa)
            setCurrentPlan(d || null);
          }
        } catch {
          console.warn('Sin plan activo al consultar /accounts/me');
        }
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [gymsRes, trainersRes] = await Promise.all([
        api.get('/gyms'),
        api.get('/trainers')
      ]);
      setGyms(gymsRes.data || []);
      setTrainers(trainersRes.data || []);
    } catch (err) {
      console.error('Error cargando opciones:', err);
    }
  };

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
        if (isPlanSelection) navigate('/my-account');
      } catch (e) {
        // Si falla, no bloqueamos la vista
        console.error('Auto-suscripción falló', e);
      } finally {
        setHandledPending(true);
      }
    };
    tryPending();
  }, [handledPending, currentPlan, isPlanSelection, navigate]);

  const openSubscribeModal = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
    setFormData(prev => ({ ...prev, gym_id: '', trainer_id: '' }));
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    // Reglas:
    // - Si no hay gimnasio NI entrenador, el pago es obligatorio (se procesa ahora mismo).
    // - Si hay gimnasio o entrenador, el pago es opcional.

    try {
      const res = await api.post('/accounts', {
        plan: selectedPlan.nombre,
        gym_id: formData.gym_id ? parseInt(formData.gym_id) : null,
        trainer_id: formData.trainer_id ? parseInt(formData.trainer_id) : null,
        metodoPago: formData.metodoPago
      });
      emitToast({ type: 'success', title: 'Suscripción exitosa', message: `Plan ${selectedPlan.nombre.toUpperCase()} activado` });
      setCurrentPlan(res.data?.account || null);
      setShowModal(false);
      if (isPlanSelection) navigate('/my-account');
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

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Cargando perfil...</div>;

  return (
    <div className="space-y-8">
      {/* <header className="account-header">
        <h2>Mi Perfil</h2>
        <div className="user-info">
          <p><strong>Nombre:</strong> {user?.nombre}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Rol:</strong> {user?.rol}</p>
        </div>
      </header> */}

      {error && <div className="card border border-red-800 text-red-400">{error}</div>}

      {!isPlanSelection && (
        <section className="space-y-4">
          <h3 className="font-sans font-bold text-stone-900">Mi Suscripción Actual</h3>
          {currentPlan ? (
            <div className="card">
              <h4 className="text-lg font-semibold text-stone-900 mb-2">Plan {currentPlan.plan.toUpperCase()}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-600">
                <p>Estado: <span className={`badge ${getEstadoBadgeClass(currentPlan.estado)}`}>{currentPlan.estado}</span></p>
                <p>Vence: {new Date(currentPlan.fecha_vencimiento).toLocaleDateString()}</p>
                <p>Sede: {gyms.find(g => g.id === currentPlan.gym_id)?.nombre || 'N/A'}</p>
                <p>Entrenador: {trainers.find(t => t.id === currentPlan.trainer_id)?.nombre || 'Ninguno'}</p>
                <p>Sesiones Restantes: {currentPlan.sesiones_restantes}</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <p className="text-stone-600">No tienes una suscripción activa.</p>
            </div>
          )}
        </section>
      )}

      {!isPlanSelection && (
        <section className="space-y-4">
          <h3 className="font-sans font-bold text-stone-900">Mis Datos</h3>
          <form onSubmit={handleSaveProfile} className="card grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Nacimiento</label>
              <input type="date" name="fecha_nacimiento" value={profileData.fecha_nacimiento || ''} onChange={handleProfileChange} className="input" />
            </div>
            <div>
              <label className="label">Objetivo</label>
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
              <button type="submit" className="btn-primary">Guardar Cambios</button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="font-sans font-bold text-stone-900">{isPlanSelection ? 'Elige tu plan' : 'Planes Disponibles'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.nombre}
              className={`card ${currentPlan?.plan === plan.nombre ? 'ring-2 ring-lime-400' : ''}`}
            >
              <h4 className="text-xl font-bold text-stone-900 mb-1">{plan.nombre.toUpperCase()}</h4>
              <p className="text-2xl font-extrabold text-lime-600 mb-2">${plan.precio_mensual.toLocaleString()} <span className="text-sm text-stone-600 font-medium">/ mes</span></p>
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
                <button disabled className="btn-secondary w-full opacity-80">Tu Plan Actual</button>
              ) : (
                <button 
                  onClick={() => openSubscribeModal(plan)} 
                  className="btn-primary w-full"
                >
                  Contratar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-lg">
            <h3 className="text-xl font-bold mb-1">Contratar Plan {selectedPlan.nombre.toUpperCase()}</h3>
            <p className="text-lime-400 text-2xl font-extrabold mb-4">${selectedPlan.precio_mensual.toLocaleString()}</p>
            
            <form onSubmit={handleSubscribe} className="space-y-4">
              <p className="text-stone-600 text-sm">Puedes elegir gimnasio, entrenador, ambos o ninguno. Solo el plan es obligatorio.</p>
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
                <label className="label">Método de Pago</label>
                <select 
                  value={formData.metodoPago}
                  onChange={(e) => setFormData({...formData, metodoPago: e.target.value})}
                  className="input"
                >
                  <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="efectivo">Efectivo en Sede</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">
                  {(!formData.gym_id && !formData.trainer_id) ? 'Confirmar y Pagar' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
