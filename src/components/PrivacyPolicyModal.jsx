 

const PrivacyPolicyModal = ({ onClose, onAccept }) => {
  const privacyContent = `# Política de Privacidad

**Versión:** Piloto controlado 2026
**Última actualización:** 14 de mayo de 2026

## 1. Quién es el responsable

El responsable del tratamiento de tus datos es el **operador del gimnasio** al que te afiliaste (o D28D Gimnasio Virtual cuando uses la plataforma directamente). Tu gimnasio te indicará cómo contactarlo y cómo ejercer tus derechos.

## 2. Qué datos recogemos

### Datos que tú nos das
- Identidad básica: nombre, correo, teléfono.
- Datos de salud y composición que ingresas voluntariamente (peso, altura, edad, género, objetivo, restricciones alimentarias, lesiones).
- Tu contraseña (almacenada cifrada con bcrypt, nunca en texto plano).

### Datos generados por tu uso
- Registros nutricionales que tú creas (comidas, porciones, calorías).
- Registros de entrenamiento (rutinas completadas, sensaciones, RPE si aplica).
- Asistencia a clases en vivo (cuando entras al enlace).
- Información técnica mínima (IP, navegador, hora) para seguridad y auditoría.

### Datos sensibles
Algunos de los datos anteriores (peso, edad, género, restricciones alimentarias, condiciones médicas) son **datos sensibles** bajo normativa LATAM (p.ej. Ley 1581/2012 en Colombia, Ley 25.326 en Argentina, LGPD en Brasil). Solo los tratamos para personalizar tu plan. **No estás obligado a entregarlos**, pero sin ellos el plan será genérico.

## 3. Para qué usamos tus datos

- Calcular y mantener actualizado tu plan nutricional y de entrenamiento.
- Permitir a tu coach y/o tu gimnasio acompañarte.
- Generar registros y reportes que tú puedes consultar.
- Operar la agenda de clases en vivo y la asistencia.
- Cumplir obligaciones legales aplicables (auditoría, seguridad).
- Mejorar la plataforma de forma agregada y anonimizada.

**No vendemos tus datos. No los compartimos con anunciantes.**

## 4. Quién ve tus datos

- **Tú mismo**, en tu cuenta.
- **Tu coach asignado** (si tu gimnasio te asignó uno).
- **El admin de tu gimnasio**, dentro de su tenant, para operación.
- **Proveedores técnicos** estrictamente necesarios (hosting, base de datos), bajo acuerdos de confidencialidad.
- **Autoridades**, solo cuando una orden judicial nos obligue.

Otros gimnasios o usuarios **no** ven tus datos. La separación multi-tenant es estricta (cada gym solo ve los suyos).

## 5. Cómo los protegemos

- Conexiones cifradas (HTTPS/TLS).
- Contraseñas hasheadas con bcrypt.
- Acceso por roles: tu admin gym no puede ver datos de otro gym, tu coach no puede asignarse roles administrativos.
- Logs de auditoría para acciones administrativas críticas.
- Variables sensibles (claves JWT, contraseñas) gestionadas por separado y nunca expuestas al cliente.

## 6. Tus derechos

Puedes en cualquier momento:
- Acceder a una copia de tus datos.
- Corregir información incorrecta.
- Solicitar la eliminación de tu cuenta y tus registros.
- Llevarte tus datos en un formato exportable (p.ej. PDF / JSON).
- Oponerte a tratamientos específicos y retirar consentimientos.

Para ejercerlos, **escribe a tu gimnasio** o al canal que tu marca te haya compartido.

## 7. Retención

- **Cuenta activa**: tus datos se mantienen mientras uses la plataforma.
- **Cuenta inactiva**: pueden ser eliminados tras 24 meses sin actividad.
- **Eliminación a solicitud**: hasta 30 días para completar la baja, conservando solo lo que la ley nos exija.
- **Logs de seguridad**: máximo 12 meses.

## 8. Cookies y almacenamiento local

Usamos almacenamiento del navegador para:
- Mantener tu sesión iniciada (JWT) sin pedirte login en cada visita.
- Recordar preferencias mínimas (idioma).

No usamos cookies de seguimiento publicitario.

## 9. Menores de edad

La plataforma está pensada para mayores de 18. Si un menor la usa, debe ser bajo supervisión y consentimiento explícito de un adulto responsable y de su gimnasio.

## 10. Cambios a esta política

Si actualizamos esta política, te avisaremos por los canales del gimnasio y por la propia plataforma antes de que entre en vigor. El uso continuado implica aceptación de la versión vigente.

## 11. Contacto

Para preguntas o ejercer derechos sobre tus datos personales: contacta a tu **gimnasio** o al canal oficial que tu marca te haya compartido.`;

  return (
    <div className="policy-modal-overlay" onClick={onClose}>
      <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="policy-modal-header">
          <h2>Política de Privacidad</h2>
          <button className="policy-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="policy-modal-content">
          <div className="policy-text">
            {privacyContent.split('\n\n').map((section, idx) => (
              <div key={idx} className="policy-section">
                {section.startsWith('#') ? (
                  <h3>{section.replace(/^#+\s/, '')}</h3>
                ) : section.startsWith('- ') ? (
                  <ul>
                    {section.split('\n').map((item, i) => (
                      <li key={i}>{item.replace(/^- /, '')}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{section}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="policy-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="btn-primary" onClick={onAccept}>
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
