const PRIVACY_ES = `# Política de Privacidad

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
Algunos datos (peso, edad, género, restricciones, condiciones médicas) son **datos sensibles** bajo normativa LATAM. Solo los tratamos para personalizar tu plan. **No estás obligado a entregarlos**, pero sin ellos el plan será genérico.

## 3. Para qué usamos tus datos

- Calcular y mantener tu plan nutricional y de entrenamiento.
- Permitir a tu coach y/o gimnasio acompañarte.
- Registros y reportes consultables por ti.
- Agenda de clases en vivo y asistencia.
- Cumplir obligaciones legales (auditoría, seguridad).
- Mejorar la plataforma de forma agregada y anonimizada.

**No vendemos tus datos. No los compartimos con anunciantes.**

## 4. Quién ve tus datos

- **Tú**, en tu cuenta.
- **Tu coach asignado** (si aplica).
- **El admin de tu gimnasio**, en su tenant.
- **Proveedores técnicos** necesarios (hosting, base de datos), bajo confidencialidad.
- **Autoridades**, solo por orden judicial.

Otros gimnasios o usuarios **no** ven tus datos.

## 5. Cómo los protegemos

HTTPS/TLS, contraseñas con bcrypt, acceso por roles, logs de auditoría, secretos fuera del cliente.

## 6. Tus derechos

Acceso, corrección, eliminación, portabilidad y oposición. Contacta a tu **gimnasio** o canal oficial de tu marca.

## 7. Retención

Cuenta activa mientras uses la plataforma; inactiva hasta 24 meses; eliminación en ~30 días; logs de seguridad hasta 12 meses.

## 8. Cookies y almacenamiento local

Sesión (JWT) y preferencias (idioma). Sin cookies publicitarias.

## 9. Menores

Mayores de 18, o menores con consentimiento y supervisión de un adulto y del gimnasio.

## 10. Cambios

Te avisaremos por canales del gimnasio y la plataforma antes de cambios relevantes.

## 11. Contacto

Preguntas o derechos: tu **gimnasio** o canal oficial de tu marca.`;

const PRIVACY_EN = `# Privacy Policy

**Version:** Controlled pilot 2026
**Last updated:** May 14, 2026

## 1. Data controller

Your data is processed by the **gym operator** you joined (or D28D GYM VIRTUAL when using the platform directly). Your gym will tell you how to contact them and exercise your rights.

## 2. Data we collect

### Data you provide
- Basic identity: name, email, phone.
- Health and body metrics you enter voluntarily (weight, height, age, gender, goals, dietary restrictions, injuries).
- Your password (stored hashed with bcrypt, never in plain text).

### Data from your use
- Nutrition logs you create.
- Training logs (completed routines, RPE if applicable).
- Live class attendance (when you join a link).
- Minimal technical data (IP, browser, time) for security and audit.

### Sensitive data
Some of the above are **sensitive data** under LATAM regulations. We use them only to personalize your plan. You are **not required** to provide them, but plans will be generic without them.

## 3. Why we use your data

- Calculate and maintain your nutrition and training plan.
- Let your coach and/or gym support you.
- Reports you can view.
- Live class scheduling and attendance.
- Legal obligations (audit, security).
- Aggregated, anonymized product improvement.

**We do not sell your data. We do not share it with advertisers.**

## 4. Who sees your data

- **You**, in your account.
- **Your assigned coach** (if any).
- **Your gym admin**, within their tenant.
- **Technical providers** (hosting, database) under confidentiality.
- **Authorities**, only when legally required.

Other gyms or users **cannot** see your data.

## 5. How we protect it

HTTPS/TLS, bcrypt passwords, role-based access, audit logs, secrets not exposed to the client.

## 6. Your rights

Access, correction, deletion, portability, and objection. Contact your **gym** or official brand channel.

## 7. Retention

Active account while you use the platform; inactive up to 24 months; deletion within ~30 days; security logs up to 12 months.

## 8. Cookies and local storage

Session (JWT) and preferences (language). No advertising cookies.

## 9. Minors

18+ only, or minors with explicit consent and supervision by an adult and the gym.

## 10. Changes

We will notify you via gym channels and the platform before material changes.

## 11. Contact

Questions or rights requests: your **gym** or official brand channel.`;

const TERMS_ES = `# Términos y Condiciones de Uso

**Versión:** Piloto controlado 2026
**Última actualización:** 14 de mayo de 2026

## 1. Qué es esta plataforma

**D28D Gimnasio Virtual** es una plataforma de acompañamiento fitness y nutricional con FOOD_PLAN, Entrenamiento y Clases en vivo. Tu gimnasio puede operar como marca blanca.

## 2. Aceptación

Al crear cuenta o iniciar sesión aceptas estos términos.

## 3. Quién puede usarla

Mayores de 18 o menores con consentimiento y supervisión. Datos veraces. Consulta a un profesional de salud si tienes condiciones relevantes.

## 4. Lo que esperamos de ti

Protege tu contraseña, no compartas credenciales, usa la plataforma con respeto, no intentes acceder a datos de otros usuarios o gimnasios.

## 5. Servicios y límites

Planes orientativos, no sustituyen consejo médico profesional. Clases en vivo dependen de enlaces externos (Zoom, etc.).

## 6. Pagos

Si tu gym cobra por fuera de la plataforma, esos acuerdos son entre tú y tu gym.

## 7. Propiedad intelectual

Contenidos de D28D y de tu gym están protegidos. No copies ni redistribuyas sin autorización.

## 8. Suspensión

Podemos suspender cuentas por incumplimiento grave o fraude.

## 9. Limitación de responsabilidad

Uso bajo tu responsabilidad. No garantizamos resultados específicos de salud o composición corporal.

## 10. Cambios

Te notificaremos cambios relevantes. El uso continuado implica aceptación.

## 11. Contacto

Consultas: tu gimnasio o canal oficial D28D.`;

const TERMS_EN = `# Terms of Service

**Version:** Controlled pilot 2026
**Last updated:** May 14, 2026

## 1. What this platform is

**D28D GYM VIRTUAL** is a fitness and nutrition coaching platform with Nutrition Plan, Training, and Live Classes. Your gym may operate as white-label.

## 2. Acceptance

By creating an account or signing in you accept these terms.

## 3. Who may use it

Adults 18+ or minors with consent and supervision. Accurate data. Consult a health professional if you have relevant conditions.

## 4. What we expect

Protect your password, do not share credentials, use the platform respectfully, do not access other users’ or gyms’ data.

## 5. Services and limits

Plans are guidance, not medical advice. Live classes rely on external links (Zoom, etc.).

## 6. Payments

If your gym charges outside the platform, that agreement is between you and your gym.

## 7. Intellectual property

D28D and gym content is protected. Do not copy or redistribute without permission.

## 8. Suspension

We may suspend accounts for serious breach or fraud.

## 9. Limitation of liability

Use at your own risk. We do not guarantee specific health or body composition outcomes.

## 10. Changes

We will notify material changes. Continued use means acceptance.

## 11. Contact

Questions: your gym or official D28D channel.`;

export function getPrivacyContent(lang) {
  return lang === 'en' ? PRIVACY_EN : PRIVACY_ES;
}

export function getTermsContent(lang) {
  return lang === 'en' ? TERMS_EN : TERMS_ES;
}
