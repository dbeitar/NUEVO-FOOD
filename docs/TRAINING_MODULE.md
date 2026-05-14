# Módulo de Entrenamiento — Esquema técnico

**Versión:** 1.1 — Consolidación documental

> **Alcance.** Este documento describe el contrato del endpoint que genera planes de entrenamiento. La sección `cv_tracking_logic` se mantiene en el esquema porque **prepara el terreno para una futura asistencia visual**, pero **no está activa hoy** (ver `ROADMAP_REALISTA_ECOSISTEMA.md`). Las claves se conservan para evitar migraciones cuando llegue esa capacidad.

---

## Endpoint

- `POST /api/training/plan-json`
- Requiere `Authorization: Bearer <token>`

## Body de entrada

```json
{
  "level": "principiante | intermedio | avanzado",
  "days_available": 4,
  "objective": "hipertrofia | fuerza | resistencia"
}
```

## Salida (JSON)

```json
{
  "routine_id": "UUID",
  "exercise_sequence": [
    {
      "exercise_name": "string",
      "prescription": {
        "sets": 0,
        "reps": 0,
        "target_rpe": 0,
        "tempo": "string"
      },
      "cv_tracking_logic": {
        "camera_angle_setup": "lateral | frontal | 45_degrees",
        "primary_landmarks": [11, 12, 23, 24, 25, 26, 27, 28],
        "validation_rules": [
          {
            "rule": "depth_check",
            "joint_a": "hip",
            "joint_b": "knee",
            "threshold_angle": 90,
            "comparison": "less_than"
          }
        ],
        "real_time_audio_feedback": {
          "on_error_posture": "string",
          "on_rep_half_way": "string",
          "on_velocity_loss": "string"
        }
      }
    }
  ]
}
```

### Notas sobre `cv_tracking_logic`

- Es **información declarativa**, no se ejecuta hoy en el cliente.
- En frontend hay un componente `TrainingRealtimeCoach` **suspendido** detrás de un *feature flag*; no se renderiza al usuario final.
- Se conserva por dos razones:
  1. evitar romper consumidores cuando la capacidad se reactive,
  2. permitir que coaches y diseñadores de plantillas describan intención técnica del ejercicio.

---

## Fuente de datos

- Biblioteca de ejercicios extraída desde `PLANTILLA HOMBRES NICO (1).xlsx` (pestaña `BIBLIOTECA`) y guardada en:
  - `backend/data/training_library.json`
- Reglas de nivel y volumen base derivadas de `PARTE 2 jabel.docx`.

---

## Lo que este endpoint **no** hace

- No analiza la postura del usuario.
- No usa cámara.
- No requiere modelos externos para responder.
- No reemplaza la prescripción del coach: facilita un punto de partida estructurado.
