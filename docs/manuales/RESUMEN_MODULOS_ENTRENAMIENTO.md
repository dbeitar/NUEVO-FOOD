# Resumen de Módulos de Entrenamiento

**Versión:** 1.1 — Consolidación documental
**Audiencia:** Equipo de producto, coaches piloto, integradores

> Este documento describe **lo que existe y se opera hoy**. Capacidades futuras (CV biomecánica, coach virtual avanzado, etc.) viven en `ROADMAP_REALISTA_ECOSISTEMA.md`.

---

## 1. Mi Entrenamiento (`TrainingModule.jsx`)

**Para quién:** usuario final.
**Qué hace hoy:**
- Muestra la rutina del día asignada por su coach o generada a partir de plantillas.
- Permite registrar series, repeticiones, carga e intensidad sentida (RPE/RIR).
- Permite **solicitar sustitución** de un ejercicio cuando hay molestia, falta de equipo o fatiga.
- Marca el día como completado y lleva un registro simple del avance.

**Qué NO hace hoy:**
- **No** hay coach biomecánico en tiempo real con cámara. La función existe en código pero está **suspendida** detrás de un *feature flag* (`ENABLE_REALTIME_COACH = false`) hasta que se valide en piloto.
- **No** ejecuta análisis de pose en vivo ni evalúa técnica con IA.
- La sustitución de ejercicios es **asistencia simple por similitud** (matching contra biblioteca), no un razonamiento experto.

---

## 2. Maestro de Entrenamiento (`AdminTrainingManager.jsx`)

**Para quién:** coach o admin de gimnasio.
**Qué hace hoy:**
- CRUD de planes de entrenamiento por usuario.
- Editor visual de días y ejercicios con prescripción (sets, reps, RPE/RIR, descansos).
- Generador de plantillas a partir de parámetros básicos (nivel, método, días disponibles).
- Sistema de **logs** de sesiones para revisar adherencia y ajustar.
- Asignación de planes a usuarios concretos.

**Qué NO hace hoy:**
- No optimiza periodización avanzada de forma autónoma.
- No reemplaza el criterio del coach.

---

## 3. Galería de Entrenamiento (`AdminTrainingGallery.jsx`)

**Para quién:** admin / coach.
**Qué hace hoy:**
- Repositorio centralizado de videos de YouTube por ejercicio.
- Conversión automática de URL a embed.
- CRUD simple (alta, listado, eliminación).
- Acceso público para que el usuario final vea referencias visuales.

**Qué NO hace hoy:**
- No graba ni hospeda video propio.
- No analiza el contenido del video.

---

## 4. Cómo se relacionan los módulos

- **Mi Entrenamiento** consume planes del **Maestro** y referencias visuales de la **Galería**.
- El **Maestro** define las plantillas y las asigna; la **Galería** enriquece la experiencia visual.
- Todos comparten la biblioteca de ejercicios (`backend/data/training_library.json`) y los logs viven en `training_log.json` / `training_plans.json`.

---

## 5. Stack mínimo

- React + Tailwind 4 (frontend).
- Express + JsonStore (backend en modo dev).
- Persistencia local en JSON; configurable a PostgreSQL/MySQL en producción.
- Sin dependencia de servicios externos para operar las funciones core.

---

## 6. Estado y siguiente paso

- Estado actual: **operativo en local, listo para piloto controlado**.
- Pre-condición de piloto: validar adherencia con coaches reales (ver `PILOTO_ECOSISTEMA_FITNESS.md`).
- Capacidades avanzadas (CV en vivo, periodización IA, sustituciones inteligentes contextuales) → roadmap futuro, no compromiso actual.

---

*Refinado el 13 de mayo de 2026 como parte de la consolidación estratégica del ecosistema.*
