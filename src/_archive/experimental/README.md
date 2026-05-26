# Carpeta experimental (NO usar en bundle principal)

Aquí viven componentes y utilidades que **no están listos para producción**
y **no deben importarse** desde la app que se sirve a usuarios reales.

## Contenido

### `TrainingRealtimeCoach.jsx`
Coach de entrenamiento en tiempo real con análisis biomecánico desde cámara.
- Depende de `window.PoseDetector`, una API que **no existe** en navegadores
  estándar (no es Pose Detection API del W3C, ni MediaPipe importado, ni
  TensorFlow.js cargado). En el bundle real esto fallaba siempre.
- Conceptualmente forma parte del **roadmap futuro**; ver
  `docs/ROADMAP_REALISTA_ECOSISTEMA.md`.

### `poseCv.js`
Helpers de cálculo de ángulos articulares y desviaciones a partir de
landmarks de pose. Sin un proveedor de landmarks real, este módulo no tiene
caller.

## Reglas
- No importar archivos de esta carpeta desde `src/components/**` ni desde
  `src/main.jsx`.
- Si en el futuro se decide retomar esta línea, hacerlo en una rama
  experimental detrás de un *feature flag* explícito (no como código del
  bundle principal).
