 

const TermsOfServiceModal = ({ onClose, onAccept }) => {
  const termsContent = `# Términos y Condiciones de Uso

**Versión:** Piloto controlado 2026
**Última actualización:** 14 de mayo de 2026

## 1. Qué es esta plataforma

**D28D Gimnasio Virtual** es una plataforma de acompañamiento fitness y nutricional. Reúne tres servicios sobre el mismo entorno:
- **Plan de Alimentación** (calculadora, catálogo de alimentos, recetas y registro diario).
- **Entrenamiento** (rutinas, galería de videos y diario por ejercicio).
- **Clases en vivo** (agenda y enlace de la reunión correspondiente).

Tu gimnasio puede operar como marca blanca sobre esta plataforma.

## 2. Aceptación

Al crear una cuenta o iniciar sesión aceptas estos términos. Si no estás de acuerdo, no uses la plataforma.

## 3. Quién puede usarla

- Mayores de 18 años, o menores con consentimiento explícito de un adulto responsable y bajo supervisión del coach/gimnasio.
- Usuarios que aporten datos verdaderos: tus métricas y restricciones afectan el plan que recibes.
- Si tienes alguna condición médica relevante, **consulta primero a tu profesional de salud**.

## 4. Lo que esperamos de ti

- Cuida tu contraseña. No la compartas.
- No subas información de terceros sin su permiso.
- No intentes vulnerar la seguridad ni saltar restricciones de acceso.
- Reporta a tu coach o al admin de tu gimnasio cualquier comportamiento extraño en la plataforma.

## 5. Lo que **no** somos

- **No somos médicos ni clínica.** Las recomendaciones del plan son orientación nutricional y de actividad física, no un diagnóstico ni un tratamiento.
- **No reemplazamos a tu nutricionista, médico o entrenador presencial.** Si tienes condiciones especiales (embarazo, lesiones, patologías, alergias), tu profesional siempre tiene la última palabra.
- Las sugerencias automáticas (sustituciones, ajustes de porciones, ordenes de comidas) son **asistencias prácticas**, no consejo clínico.

## 6. Asistencia automatizada

La plataforma puede usar asistencia automatizada para calcular requerimientos, sugerir sustituciones y armar planes. Estas sugerencias son orientativas. Tu coach o tu gimnasio pueden ajustarlas. Si algo no encaja con tu situación, **avisa a tu coach** antes de seguirlo.

## 7. Tus datos

- Recopilamos solo lo necesario para personalizar tu experiencia: identidad básica, métricas que tú ingresas y tu actividad dentro de la plataforma.
- Tu plan y tus registros pertenecen a tu cuenta. Tu gimnasio y/o tu coach asignado los ven para acompañarte.
- Ver el detalle completo en la **Política de Privacidad**.

## 8. Disponibilidad del servicio

Durante el piloto controlado pueden existir ventanas de mantenimiento, ajustes y reinicios. Avisaremos por los canales del gimnasio cuando sean previsibles.

## 9. Cuenta y baja

- Puedes pedir la baja de tu cuenta a tu gimnasio en cualquier momento.
- Podemos suspender una cuenta si detectamos abuso, uso indebido o riesgo para otros usuarios.

## 10. Cambios a estos términos

Podemos actualizar estos términos para reflejar mejoras o cambios regulatorios. Te avisaremos con tiempo razonable. El uso continuado implica aceptación de la versión vigente.

## 11. Contacto

Si tienes dudas o quieres ejercer tus derechos sobre tus datos, contáctanos a través de tu gimnasio o al canal que tu marca te haya compartido.`;

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
