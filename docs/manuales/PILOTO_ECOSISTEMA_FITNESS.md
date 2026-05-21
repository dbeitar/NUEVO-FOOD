# Piloto del Ecosistema Fitness

**Versión:** 1.0
**Audiencia:** Equipo fundador, coaches y gimnasios piloto, soporte
**Relación:** ejecuta lo definido en `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md`, opera dentro de `ROADMAP_REALISTA_ECOSISTEMA.md` y respeta `GTM_LATAM_COACHES_Y_GYMS.md`

> Este piloto NO existe para “probar features”. Existe para **validar operación humana real** y dejar evidencia rastreable antes de cualquier expansión.

---

## 1. Objetivo del piloto

Validar, en condiciones reales y controladas, que el ecosistema:

1. Permite a un coach operar su día sin volver a su Excel/WhatsApp.
2. Permite a un gimnasio dar clases en vivo y registrar asistencia auditable.
3. Permite a un usuario final entender qué hacer hoy y ver su progreso sin ayuda técnica.
4. Sostiene la promesa de **marca blanca** desde la primera pantalla.
5. Funciona estable durante un ciclo completo (28 días).

Si estas cinco cosas pasan, el ecosistema está listo para escalar a más marcas.
Si alguna falla, **no se escala** hasta resolver.

---

## 2. Tamaño del piloto

| Actor | Cantidad objetivo |
| --- | --- |
| Coaches | **3 a 5** |
| Usuarios finales | **50 a 150** (sumando todos los coaches) |
| Gimnasios | **1 a 2** |
| Programas D28D activos | hasta 3 (Vital, Pancitas Fit, Virtual D28D) |

Distribución sugerida:
- 1 gym piloto (con 2–3 coaches y ~80 usuarios).
- 1 coach independiente sin gym (con 30–50 usuarios propios).
- 1–2 coaches D28D usando plantillas bloqueadas.

Esta mezcla permite probar marca propia, operación multi-coach, contenido bloqueado y casos individuales en paralelo.

---

## 3. Duración

- **1 ciclo de 28 días** mínimo (alineado con D28D).
- Ideal: **2 ciclos consecutivos** (56 días) para medir retención post-primer ciclo.
- Revisiones internas: cada **7 días**.
- Revisión con coach/gym piloto: **al cierre de cada ciclo**.

---

## 4. Qué se valida

### 4.1 Adherencia
- ¿Cuántos usuarios completan al menos el 70% de su plan en el ciclo?
- ¿Cuántos abandonan antes del día 14?
- ¿En qué día/etapa se concentra el abandono?

### 4.2 Onboarding
- Tiempo desde que un coach acepta hasta su primera clase publicada.
- Tiempo desde que un usuario recibe la invitación hasta su primer registro.
- Cantidad de pasos que el usuario tuvo que repetir.
- Soporte requerido (en minutos por usuario).

### 4.3 Retención
- ¿Qué porcentaje de usuarios sigue activo en el día 28?
- ¿Cuántos vuelven en el ciclo 2?
- ¿Qué hace un coach con un usuario inactivo?

### 4.4 Claridad
- ¿El coach puede explicar la plataforma a un cliente nuevo en 30 segundos?
- ¿El usuario final puede explicar “qué hago hoy” sin ayuda?
- ¿La marca del cliente se ve siempre primero?

### 4.5 Estabilidad
- Errores 5xx por semana.
- Tiempo de respuesta promedio en endpoints críticos.
- Caídas / interrupciones (debe ser cero o casi cero en piloto).
- Pérdida de datos: **cero**.

### 4.6 Operación
- ¿Cuántos minutos al día le toma al coach operar?
- ¿La asistencia a clases en vivo se registra correctamente al hacer clic en “Unirse”?
- ¿Las sustituciones de ejercicios se usan?

### 4.7 Soporte
- Volumen de mensajes a soporte por semana.
- Tiempo de respuesta del equipo.
- Tipos de incidencias (técnicas vs de uso).

---

## 5. Métricas de éxito

El piloto se considera **exitoso** si, al cierre del primer ciclo, se cumplen al menos **5 de 6**:

| Métrica | Umbral mínimo |
| --- | --- |
| Adherencia | ≥ 60% de usuarios con 70%+ del plan completado. |
| Retención día 28 | ≥ 70% de usuarios activos. |
| NPS del coach | ≥ 40. |
| NPS del usuario final | ≥ 30. |
| Estabilidad | < 1% de requests con 5xx. |
| Pérdida de datos | 0 incidentes. |

Si se incumplen 2 o más, **no se escala** y se itera el producto/onboarding.

---

## 6. Estructura operativa del piloto

### 6.1 Equipo
- 1 **owner del piloto** (responsable del éxito y la coordinación).
- 1 **enlace por marca/gym piloto**.
- 1 **enlace técnico** (resuelve incidencias menores).
- Soporte por **WhatsApp** en horario LATAM.

### 6.2 Cadencia
- **Diario** (interno): revisión rápida de incidencias.
- **Semanal** (interno): métricas y bloqueos.
- **Día 14** (con cliente): check-in con cada coach/gym piloto.
- **Día 28** (con cliente): cierre de ciclo y decisión de continuar / iterar / descartar.

### 6.3 Onboarding del piloto
1. Firmar acuerdo de piloto (alcance, datos, expectativas).
2. Configurar marca (logo, colores, WhatsApp, mensaje).
3. Importar/crear primeras plantillas.
4. Cargar coaches (si aplica).
5. Cargar primeros usuarios.
6. Publicar primer calendario.
7. Sesión 1:1 de capacitación con el coach o el dueño del gym.

---

## 7. Reglas del piloto

- **Nada se promete fuera del Core Actual** (`ROADMAP_REALISTA_ECOSISTEMA.md`).
- **No se introducen features nuevos** durante el piloto, salvo correcciones necesarias.
- **Toda incidencia se registra** en `docs/test-runs/` o sistema de tickets.
- **Toda decisión de cambio** queda documentada y firmada por el owner del piloto.
- **El cliente piloto puede salir** en cualquier momento sin costo.
- **La data del cliente piloto** es siempre del cliente; al cerrar piloto se puede exportar.

---

## 8. Riesgos del piloto y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| El coach no opera la plataforma. | Check-ins semanales + recordatorios automáticos manuales. |
| El usuario final no entiende la primera pantalla. | Iteración rápida de UX según feedback (sin tocar arquitectura). |
| El coach pide features no incluidas. | Roadmap visible + filtro contra `ROADMAP_REALISTA_ECOSISTEMA.md`. |
| Caída de servicio. | Plan de rollback documentado y soporte directo del fundador en piloto. |
| Pérdida de adherencia. | Revisar contenido del coach, no solo el producto. |
| Promesas IA no cumplidas. | Prohibido prometer IA fuera del scope actual. |

---

## 9. Entregables al cierre del piloto

Al final del primer ciclo, el equipo entrega:

1. **Reporte de adherencia y retención** por marca/gym.
2. **Reporte de incidencias** y tickets resueltos.
3. **Reporte de NPS** (coach y usuario final).
4. **Lista de cambios validados** para incorporar al producto.
5. **Lista de cambios descartados** y por qué.
6. **Decisión documentada** sobre si se continúa, se itera o se cierra.

Estos entregables alimentan la próxima iteración de:
- `ROADMAP_REALISTA_ECOSISTEMA.md`
- `GTM_LATAM_COACHES_Y_GYMS.md`
- `ARQUITECTURA_VISIBLE_EXPERIENCIA.md`

---

## 10. Lo que este piloto NO es

- **No** es un beta abierto al público.
- **No** es un release comercial.
- **No** es excusa para meter features experimentales.
- **No** mide “cuánto le gusta a la gente”; mide **operación y adherencia reales**.

---

*Este piloto es la barrera entre “demo” y “producto”. Si pasa, abrimos GTM. Si no pasa, iteramos sin hacer ruido.*
