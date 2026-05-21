# Roadmap Realista del Ecosistema

**Versión:** 1.0
**Audiencia:** Equipo fundador, ventas, partners, marcas piloto
**Propósito:** separar de forma honesta lo que **existe hoy** de lo que es **roadmap futuro**, para no vender capacidades que aún no se entregan.

> Regla de uso: cualquier conversación comercial, propuesta o demo debe basarse exclusivamente en la sección **Core Actual**. Todo lo que viva en **Roadmap Futuro** se comunica como “próximas etapas”, nunca como capacidad disponible.

---

## CORE ACTUAL — disponible y operable hoy

Estas capacidades están construidas, son operables localmente y están listas para piloto controlado.

### 1. Coaching y operación de coaches
- Alta y gestión de coaches/entrenadores.
- Asignación de usuarios a coaches.
- Plantillas de rutinas reutilizables.
- Logs de sesiones de entrenamiento (lo que el usuario ejecutó vs lo prescrito).

### 2. Rutinas
- CRUD completo de planes de entrenamiento por usuario.
- Editor por día y por ejercicio (sets, reps, RPE/RIR, descansos).
- Generador de plantillas a partir de parámetros básicos (nivel, método, días).
- Sustitución de ejercicios por similitud.
- Galería visual de ejercicios (referencias YouTube).

### 3. Food Plan
- Calculadora nutricional (TMB, TDEE, macros).
- Catálogo de alimentos con búsqueda y categorías.
- Registro diario y totales por fecha.
- Biblioteca de recetas con escalado por porciones.
- Equivalentes nutricionales determinísticos.
- Asistente nutricional (chat) basado en el catálogo y el registro del usuario.

### 4. Seguimiento
- Adherencia visible por usuario.
- Resumen diario (consumido vs planificado).
- Logs de entrenamiento por sesión.
- Asistencia real a clases en vivo (al hacer clic en “Unirse”).

### 5. White-label
- Logo, colores, mensaje y WhatsApp configurables por gimnasio/marca.
- Slug por marca.
- Identidad visible en pantallas de usuario final.
- Separación lógica de datos por marca.

### 6. Live Classes (D28D y compatibles)
- Calendario semanal.
- Inscripción + asistencia auditable.
- Estructura de **13 ciclos de 28 días**.
- Gestión de programas D28D (Vital, Pancitas Fit, Virtual D28D) con plantillas bloqueadas.
- Cuentas Zoom configurables por programa.

### 7. Roles y permisos
- Roles principales operativos (`super_admin`, `admin_marca`, `admin_d28d`, `admin_gimnasio`, `entrenador`, `nutricionista`, `usuario_final`).
- Permisos chequeados en backend.
- Auditoría básica de acciones administrativas (en evolución).

### 8. Asistencia IA mínima
- Sustituciones de alimentos por equivalentes (determinístico).
- Sugerencias nutricionales conversacionales (modelo local opcional vía Ollama).
- Si no hay modelo configurado, el sistema **funciona igual** con el motor determinístico.

### 9. Operación de plataforma
- Persistencia local en JSON para desarrollo (JsonStore).
- Persistencia configurable a PostgreSQL/MySQL en producción.
- Despliegue: frontend en Vercel, backend en Docker/Koyeb.
- Variables de entorno y CORS estricto por marca.

> Todo lo anterior es lo que se **puede demostrar y vender hoy**.

---

## ROADMAP FUTURO — explícitamente no disponible aún

Estas capacidades son **direccionales**. Pueden mencionarse en hoja de ruta, pero **no** comprometerse en propuestas comerciales actuales.

### A. Marketplace
- Marketplace de coaches y de programas (D28D y otros).
- Sistema de reseñas y verificación.
- Pagos integrados con comisión.
- Descubrimiento por geografía / objetivo.

### B. IA avanzada
- Periodización inteligente automática.
- Sustituciones contextuales (clima, equipo disponible, fatiga acumulada).
- Recomendaciones nutricionales personalizadas a partir del historial completo.
- Asistencia conversacional con memoria por usuario.
- Detección de patrones de abandono.

### C. Visión computacional (CV)
- Coach biomecánico en tiempo real (la base existe en código pero está **suspendida** detrás de feature flag).
- Conteo automático de repeticiones.
- Validación de profundidad y postura.
- Feedback de audio en vivo.
- Integración con cámara móvil.

### D. Analytics avanzados
- Dashboards multi-marca con drill-down.
- Cohortes de adherencia y retención.
- Reportes financieros automáticos para gimnasios.
- Exportación BI (CSV/Sheets/Looker).
- Métricas de ciclo D28D agregadas.

### E. Automatizaciones operativas
- Recordatorios automáticos por WhatsApp/correo.
- Onboarding asistido con checklist por usuario.
- Renovaciones automáticas de plan.
- Pasarela de pagos integrada (LATAM-friendly).
- Notificaciones push.

### F. Ecosistema extendido
- Apps móviles nativas (hoy es PWA).
- Integraciones con wearables (Apple Watch, Garmin, Whoop).
- Integraciones con plataformas de pago locales (Mercado Pago, Wompi, etc.).
- API pública para partners.

---

## Cómo se decide promover algo de Futuro a Core

Una capacidad pasa de **Roadmap Futuro** a **Core Actual** cuando cumple **todo** lo siguiente:

1. Está construida y desplegable.
2. Tiene cobertura mínima de pruebas (idealmente con evidencia en `docs/test-runs/`).
3. Está documentada en `docs/`.
4. Fue validada por al menos 1 marca/coach piloto.
5. Tiene rollback claro.
6. Su impacto en gobernanza está actualizado en `ECOSISTEMA_MODULAR_MARCA_BLANCA.md`.

Sin estos cinco pasos, **no** se promueve y **no** se vende como existente.

---

## Cómo se decide descartar algo del Roadmap

Una capacidad sale del Roadmap Futuro cuando:

- No alinea con la visión (`VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md`).
- No tiene demanda real de los ICPs.
- Su costo de mantenimiento supera el valor incremental.
- Existe en el mercado a costo razonable y no aporta diferenciación.

Descartarla es tan importante como promoverla. El roadmap **no es una bolsa infinita**.

---

## Línea narrativa en ventas y demos

Para que el discurso sea coherente con este roadmap, usar plantillas como:

- **Sí decir:**
  *“Hoy puedes operar tu marca con coaches, planes, alimentación y clases en vivo en una sola plataforma.”*
  *“Tenemos asistencia inteligente que ayuda con sustituciones y sugerencias; el sistema funciona aunque la IA no esté.”*

- **No decir:**
  *“Tenemos un coach virtual con visión por computadora.”*
  *“Nuestra IA reemplaza al entrenador.”*
  *“Es una super app fitness con todo integrado.”*

Si surge una pregunta sobre algo del Roadmap Futuro, responder:
*“Está en hoja de ruta, no es algo que te comprometamos hoy.”*
