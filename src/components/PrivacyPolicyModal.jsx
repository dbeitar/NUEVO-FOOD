 

const PrivacyPolicyModal = ({ onClose, onAccept }) => {
  const privacyContent = `# Política de Privacidad

**Última actualización:** 20 de febrero de 2026
**Vigencia:** A partir del 20 de febrero de 2026

## 1. INTRODUCCIÓN

En Food Plan ("nosotros", "nuestro", "nos"), respetamos su privacidad y estamos comprometidos con proteger sus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos su información.

**Responsable del Tratamiento de Datos:**
JHON NICOLAS DEL RIO CASALLAS
Cédula de Ciudadanía 1153465988
KM 1 VIA MANCILLA ALTOS DEL BOSQUE CASA 6B
nicolasdelrio718@gmail.com
3192635819

## 2. INFORMACIÓN QUE RECOPILAMOS

### 2.1 Información Proporcionada Directamente
- Nombre completo
- Correo electrónico
- Número de teléfono
- Fecha de nacimiento
- Datos antropométricos (peso, altura)
- Objetivo nutricional/fitness
- Historial dietético
- Contraseña (encriptada)
- Información de pago (si aplica)

**Nota sobre Datos Sensibles:** Algunos de los datos solicitados, como la fecha de nacimiento, peso, altura, género, objetivo nutricional e historial dietético/restricciones, son considerados datos sensibles bajo la Ley 1581 de 2012. Usted no está obligado a autorizar el tratamiento de estos datos. Sin embargo, la provisión de esta información nos permite ofrecerle un servicio más personalizado y efectivo.

### 2.2 Información Recopilada Automáticamente
- Dirección IP
- Tipo de dispositivo y navegador
- Sistema operativo
- Actividad de uso (búsquedas, clics, tiempo en la aplicación)
- Cookies y tecnologías similares
- Ubicación general (país/región)

### 2.3 Información de Terceros
- Datos de servicios conectados (Google, Apple)
- Información de nutricionistas o entrenadores (si aplica)

## 3. USO DE SUS DATOS

Usamos su información para:
- Crear y mantener su cuenta
- Proporcionar funcionalidades de la aplicación
- Calcular necesidades nutricionales personalizadas
- Generar recomendaciones de IA
- Mejorar nuestros servicios
- Detectar y prevenir fraude
- Cumplir obligaciones legales
- Enviar notificaciones de servicio
- Marketing (solo con tu consentimiento)
- Análisis de seguridad

## 4. COMPARTIR DE DATOS

**NO vendemos, alquilamos o compartimos sus datos personales con terceros** excepto cuando sea legalmente requerido.

### 4.1 Compartición Permitida
- Servicios de hosting y almacenamiento en la nube
- Proveedores de análisis (Google Analytics)
- Procesadores de pago (cuando donativos/premium)
- Autoridades legales (subpoenas, orden judicial)
- Profesionales de salud (solo con su consentimiento expreso)

### 4.2 Protección de Datos en Tránsito
Toda información compartida se envía mediante encriptación HTTPS/SSL.

## 5. SEGURIDAD DE DATOS

Implementamos múltiples capas de seguridad:
- Encriptación SSL/TLS para datos en tránsito
- Hashing bcryptjs para contraseñas
- Control de acceso basado en roles (RBAC)
- Firewalls y monitoreo de seguridad
- Auditoría de accesos
- Políticas de retención de datos
- Protección contra inyección SQL
- Validación de entrada en todos los formularios

## 6. DERECHOS DEL USUARIO

Usted tiene derecho a:
- **Accesso**: Solicitar una copia de sus datos
- **Rectificación**: Corregir información incorrecta
- **Eliminación**: Solicitar borrado de sus datos
- **Portabilidad**: Recibir datos en formato transferible
- **Restricción**: Limitar uso de sus datos
- **Oposición**: Oponerse a ciertos usos
- **Revocar consentimiento**: En cualquier momento

Para ejercitar estos derechos: privacy@foodplan.app

## 7. RETENCIÓN DE DATOS

- **Cuenta activa**: Datos se mantienen mientras use la app
- **Cuenta inactiva**: Se pueden eliminar después de 24 meses
- **Solicitud de eliminación**: Eliminamos dentro de 30 días
- **Datos de pago**: Retenidos por requisitos fiscales (7 años)
- **Logs de seguridad**: Máximo 1 año

## 8. COOKIES Y TECNOLOGÍAS DE RASTREO

Usamos cookies para:
- Mantener su sesión de inicio de sesión
- Recordar preferencias
- Análisis de uso
- Seguridad

Puede desactivar cookies en su navegador, pero esto puede afectar funcionalidades.

## 9. CAMBIOS A ESTA POLÍTICA

Podemos actualizar esta política en cualquier momento. Si hay cambios materiales:
- Le notificaremos por correo electrónico
- Actualizaremos la fecha de vigencia
- Le solicitaremos consentimiento si es necesario

## 10. CONTACTO

Para preguntas sobre privacidad:
- **Email**: privacy@foodplan.app
- **Dirección**: Calle Principal 123, Bogotá, Colombia
- **Teléfono**: +57 (1) 1234-5678`;

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
