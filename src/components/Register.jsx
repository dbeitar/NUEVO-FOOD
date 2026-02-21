import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    teléfono: '',
    fecha_nacimiento: '',
    peso: '',
    altura: '',
    objetivo: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar aceptación de políticas
    if (!acceptPrivacy || !acceptTerms) {
      setError('Debes aceptar la Política de Privacidad y los Términos de Servicio para continuar');
      return;
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

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
        objetivo: formData.objetivo,
      });
      setSuccess('¡Registro exitoso! Redirigiendo al login...');
      setTimeout(onSwitchToLogin, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box auth-box-large">
        <h2>Crear Cuenta</h2>
        <p className="auth-subtitle">Únete a Food Plan</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="auth-form-row">
            <div className="form-group">
              <label htmlFor="nombre" className="label">Nombre Completo</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Tu nombre"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
                className="input"
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="form-group">
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Mínimo 6 caracteres"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="label">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repite tu contraseña"
                className="input"
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="form-group">
              <label htmlFor="teléfono" className="label">Teléfono</label>
              <input
                type="tel"
                id="teléfono"
                name="teléfono"
                value={formData.teléfono}
                onChange={handleChange}
                placeholder="+1234567890"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fecha_nacimiento" className="label">Fecha de Nacimiento</label>
              <input
                type="date"
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="form-group">
              <label htmlFor="peso" className="label">Peso (kg)</label>
              <input
                type="number"
                id="peso"
                name="peso"
                value={formData.peso}
                onChange={handleChange}
                placeholder="70"
                step="0.1"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="altura" className="label">Altura (cm)</label>
              <input
                type="number"
                id="altura"
                name="altura"
                value={formData.altura}
                onChange={handleChange}
                placeholder="180"
                step="0.1"
                className="input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="objetivo" className="label">Objetivo</label>
            <select
              id="objetivo"
              name="objetivo"
              value={formData.objetivo}
              onChange={handleChange}
              className="input"
            >
              <option value="">Selecciona tu objetivo</option>
              <option value="pérdida_de_grasa">Pérdida de Grasa</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="ganancia_muscular">Ganancia Muscular</option>
            </select>
          </div>

          {/* Aceptación de Políticas */}
          <div className="policies-section">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="acceptPrivacy"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <label htmlFor="acceptPrivacy">
                Acepto la{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="policy-link"
                >
                  Política de Privacidad
                </button>
              </label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <label htmlFor="acceptTerms">
                Acepto los{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="policy-link"
                >
                  Términos y Condiciones de Uso
                </button>
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
          
          <p className="auth-subtitle" style={{ marginTop: '10px' }}>
            Al registrarte aceptas la{' '}
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="policy-link"
            >
              Política de Privacidad
            </button>{' '}
            y los{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="policy-link"
            >
              Términos y Condiciones de Uso
            </button>
            .
          </p>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta?{' '}
          <button type="button" onClick={onSwitchToLogin} className="link-button">
            Inicia sesión aquí
          </button>
        </p>
      </div>

      {/* Modales de Políticas */}
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
    </div>
  );
}
