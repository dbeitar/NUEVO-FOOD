# VIENTO RECIO — Biblia completa + Asistente espiritual (Nicolas del Rio)

Guía práctica para tener la **Biblia descargada**, un **asistente gratuito** que genera versículos, devocionales y estudios con visión espiritual centrada en **las enseñanzas de Jesús** (no religión denominacional), y enlazarlo a la **comunidad del entrenador Nicolas del Rio**.

---

## 1. Biblia completa descargada (RVR1960)

V1 incluye un importador JSON. El repo trae solo una **muestra** (`sample_bible_rvr1960.example.json`); para producción necesitas el texto completo con **licencia válida**.

### Opción A — JSON público (desarrollo / verificar licencia en producción)

Repositorios comunes con Reina-Valera en JSON:

- [thiagobodruk/bible](https://github.com/thiagobodruk/bible) — varias versiones en JSON
- [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) — SQL/JSON/CSV

Formato requerido por MVPFOOD:

```json
[
  { "book": "GEN", "chapter": 1, "verse": 1, "text": "En el principio..." }
]
```

### Importar (recomendado — descarga + base de datos)

Un solo comando descarga la **Reina-Valera 1960 completa** (~31 000 versículos) e importa a PostgreSQL:

```bash
npm run spiritual:import-bible-full
```

Queda almacenada en:
- **PostgreSQL** — tablas `spiritual_bible_*` (lectura en la app)
- **Caché local** — `backend/data/spiritual/rvr1960.source.json` y `rvr1960.flat.json` (re-importación sin red)

Para forzar nueva descarga: `node scripts/spiritual/download_and_import_rvr1960.cjs --force`

### Importar manual (JSON propio)

---

## 2. Asistente espiritual gratuito (Ollama)

El ecosistema ya usa **Ollama** (IA local, sin costo de API) para nutrición y entrenamiento. VIENTO RECIO reutiliza el mismo stack.

### Instalar Ollama (gratis)

```bash
# macOS
brew install ollama
ollama serve

# Modelo recomendado (8B, balance calidad/velocidad)
ollama pull llama3.1:8b
```

### Configurar backend (`backend/.env`)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
SPIRITUAL_CENTER_ENABLED=true
```

Si Ollama **no** está disponible, el asistente usa **contenido fallback** de alta calidad (enseñanzas de Jesús predefinidas) — sigue funcionando.

### Visión teológica del asistente

| Sí | No |
|----|-----|
| Enseñanzas de Jesús (Sermón del Monte, parábolas, amor, servicio) | Dogma denominacional |
| Formación espiritual aplicada al día a día | Culpa, miedo, sectarismo |
| Integración cuerpo + espíritu (comunidad Nicolas) | Debates doctrinales |

---

## 3. Enlazar a Nicolas del Rio

### Paso 1 — Crear entrenador (si no existe)

```bash
npm run seed:coach-nicolas
```

Cuenta coach: `nicolasdelrio@foodplan.local` / `nicolas123`

### Paso 2 — Bootstrap automático (versículo + devocional 7 días + estudio)

```bash
npm run spiritual:bootstrap-nicolas
```

Esto:

1. Localiza al entrenador **Nicolas del Rio**
2. Importa biblia sample si la base está vacía
3. Genera y publica contenido con **`scope_type: trainer`** → solo usuarios con `trainer_id` de Nicolas (sus clientes)

### Paso 3 — Desde el admin (UI)

Centro de Formación Espiritual → pestaña **Asistente IA**:

- Ver estado Ollama
- **Generar versículo del día** (Nicolas)
- **Generar devocional 7 días** (Nicolas)
- **Generar estudio** (Nicolas)

Al generar, el alcance queda en **Entrenador → Nicolas del Rio** automáticamente.

### Quién ve el contenido

Usuarios con `trainer_id` igual al ID de Nicolas del Rio ven el widget **«Hoy»** con versículo, devocional, estudios y eventos asignados.

Clientes demo del seed: p. ej. `johnnicolasdelrio718@gmail.com`

---

## 4. Flujo recomendado (primera vez)

```bash
# 1. Entrenador Nicolas
npm run seed:coach-nicolas

# 2. Biblia completa (cuando tengas el JSON)
node scripts/spiritual/import_bible.mjs --file /ruta/rvr1960.json

# 3. Ollama (opcional pero recomendado)
ollama pull llama3.1:8b

# 4. Contenido inicial comunidad Nicolas
npm run spiritual:bootstrap-nicolas

# 5. Verificar
./scripts/test_spiritual_v1.sh
```

---

## 5. Programar envío diario (versículo)

1. Admin → Versículo del día → alcance **Entrenador** → ID de Nicolas
2. Marcar **Publicar ahora** (o programar fecha)
3. Communication Center envía por **in_app**, **email** y **WhatsApp** (según plantillas activas)

Para automatizar cada mañana: usar pestaña **Asistente IA** → Generar versículo (Nicolas) — o cron externo que llame `POST /api/spiritual/admin/ai/verse-of-day`.

---

## 6. Personalizar la voz de Nicolas

Edita el prompt base en:

`backend/src/services/spiritual/spiritualAiService.js` → `SPIRITUAL_PERSONA`

Puedes añadir frases propias de Nicolas del Rio (tono coach, bienestar integral) sin cambiar FOOD ni Training.

---

## 7. FAQ

**¿Necesito pagar por la IA?**  
No, si usas Ollama local. Es el mismo patrón gratuito del asistente de rutinas.

**¿Puedo usar OpenAI en lugar de Ollama?**  
V1.1 puede añadirlo; hoy está Ollama + fallback.

**¿Los clientes de otros entrenadores ven esto?**  
No, si el alcance es `trainer` + ID de Nicolas.

**¿Es “religioso”?**  
Está diseñado como **formación espiritual** centrada en Jesús, no como liturgia ni denominación.

---

*Guía Biblia + Asistente IA — Comunidad Nicolas del Rio.*
