 

const TermsOfServiceModal = ({ onClose, onAccept }) => {
  const termsContent = `# Términos y Condiciones de Uso

**Última actualización:** 20 de febrero de 2026
**Vigencia:** A partir del 20 de febrero de 2026

## 1. ACEPTACIÓN DE TÉRMINOS

Al acceder y utilizar **D28D Gimnasio Virtual** ("la Aplicación", "el Servicio"), usted acepta estar vinculado por estos Términos y Condiciones. Si no está de acuerdo, por favor no utilice la Aplicación.

## 2. DESCRIPCIÓN DEL SERVICIO

D28D Gimnasio Virtual es una aplicación móvil/web que proporciona:
- Cálculo personalizado de necesidades calóricas y nutricionales
- Registro y seguimiento de ingesta alimentaria diaria
- Recomendaciones automáticas de alimentos basados en IA
- Análisis de progreso nutricional
- Base de datos de alimentos con información nutricional

## 3. ELEGIBILIDAD

Para utilizar D28D Gimnasio Virtual, usted debe:
- Tener al menos 18 años de edad
- Tener capacidad legal para celebrar contratos
- Aceptar estos términos de manera voluntaria
- Proporcionar información exacta y completa

## 4. RESPONSABILIDADES DEL USUARIO

Usted se compromete a:
- No usar la Aplicación para actividades ilegales
- No intentar acceder a áreas no autorizadas
- No interferir con la seguridad o integridad de la Aplicación
- Mantener la confidencialidad de su contraseña
- No compartir su cuenta con terceros
- No proporcionar información falsa o engañosa

## 5. LÍMITE DE RESPONSABILIDAD

**DESCARGO DE RESPONSABILIDAD IMPORTANTE:**

D28D Gimnasio Virtual proporciona información educativa y nutricional. **NO es un sustituto de:**
- Consejo médico profesional
- Diagnóstico de condiciones médicas
- Tratamiento médico

**Siempre consulte a un profesional de la salud o nutricionista** antes de hacer cambios significativos en su dieta.

## 6. PROPIEDAD INTELECTUAL

Todos los contenidos de la Aplicación (código, diseño, texto, imágenes, gráficos) son propiedad de D28D Gimnasio Virtual. Usted recibe una licencia limitada para usar la Aplicación únicamente para fines personales y no comerciales.

## 7. CONTENIDO GENERADO POR IA

D28D Gimnasio Virtual utiliza inteligencia artificial para generar recomendaciones. Usted entiende y acepta que:
- Las recomendaciones de IA pueden no ser perfectas
- No somos responsables por decisiones basadas en IA
- Siempre ejerza criterio profesional

## 8. PROHIBICIÓN DE ABUSO

**Uso prohibido incluye:**
- Scraping automatizado de datos
- Intentos de hackeo
- Distribución de malware
- Spam o acoso
- Violación de derechos de terceros

## 9. RESOLUCIÓN DE DISPUTAS

Cualquier disputa será resuelta mediante:
- Negociación amistosa
- Arbitraje bajo las leyes de Colombia
- Jurisdicción en Bogotá, Colombia

## 10. CONTACTO

Para preguntas sobre estos Términos:
- **Email**: legal@foodplan.app
- **Dirección**: Calle Principal 123, Bogotá, Colombia
- **Teléfono**: +57 (1) 1234-5678`;

  return (
    <div className="policy-modal-overlay" onClick={onClose}>
      <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="policy-modal-header">
          <h2>Términos y Condiciones de Uso</h2>
          <button className="policy-close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="policy-modal-content">
          <div className="policy-text">
            {termsContent.split('\n\n').map((section, idx) => (
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

export default TermsOfServiceModal;
