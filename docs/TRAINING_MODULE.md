# Modulo Entrenamiento IA

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

## Salida (JSON puro)

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

## Fuente de datos

- Biblioteca de ejercicios extraida desde `PLANTILLA HOMBRES NICO (1).xlsx` (pestaña `BIBLIOTECA`) y guardada en:
  - `backend/data/training_library.json`
- Reglas de nivel y volumen base derivadas de `PARTE 2 jabel.docx`.
