# VIENTO RECIO V1 — Guía de administración (SuperAdmin)

**Audiencia:** Super Admin exclusivamente  
**Acceso:** Maestros → Configuraciones → **Centro de Formación Espiritual**

---

## 1. Biblia

### Importar versión (RVR1960)

1. Pestaña **Biblia**
2. Subir archivo JSON con formato:

```json
[
  { "book": "JHN", "chapter": 3, "verse": 16, "text": "..." }
]
```

3. Alternativa CLI:

```bash
node scripts/spiritual/import_bible.mjs --file backend/data/spiritual/sample_bible_rvr1960.example.json
```

**V1:** una sola versión activa. Biblia completa se importa desde archivo externo con licencia adecuada (no incluir en repo producción).

---

## 2. Versículo del día

1. Pestaña **Versículo del día**
2. Seleccionar **fecha**
3. Escribir texto (o usar versículo importado vía API con `verse_id`)
4. Añadir **reflexión**
5. Elegir **alcance:**
   - **Global** — todos los usuarios finales
   - **Gimnasio** — ID de gym
   - **Entrenador** — ID de trainer
6. Marcar **Publicar ahora**

Al publicar se dispara `verse.published` vía Communication Center (in_app, email, WhatsApp según plantillas activas).

---

## 3. Devocionales

1. Pestaña **Devocionales**
2. Título, duración (7 / 21 / 30 / 40 días)
3. Completar día 1: reflexión, oración, desafío
4. Guardar

Para planes multi-día completos, usar API `POST /spiritual/admin/devotionals` con array `days[]` o ampliar en V1.1.

**Alcance:** global, gym o trainer (campos en API).

---

## 4. Estudios bíblicos

1. Pestaña **Estudios**
2. Título y tipo: PDF, video, audio, YouTube
3. **YouTube:** pegar URL
4. **PDF/video/audio:** subir archivo
5. Categoría, autor, etiquetas (opcional)
6. Guardar

Los usuarios ven estudios en «Estudios recomendados» del widget «Hoy».

---

## 5. Eventos espirituales

1. Pestaña **Eventos**
2. Título, modo (presencial / virtual / hybrid)
3. Fechas inicio y fin
4. Enlaces Zoom y/o Google Meet (virtual)
5. Ubicación (presencial)
6. Guardar

- Usuarios pueden **inscribirse** desde el widget
- **Recordatorios** automáticos 24h antes (job `spiritualScheduler`)
- Asistencia registrada al confirmar participación

---

## 6. Communication Center

Plantillas modulo `spiritual` en Configuraciones → Comunicación.

Eventos V1:

| Evento | Cuándo |
|--------|--------|
| `verse.published` | Publicar versículo |
| `devotional.started` | Usuario inicia plan |
| `devotional.completed` | Usuario termina plan |
| `event.created` | Nuevo evento |
| `event.reminder` | 24h antes del evento |

Editar copy en Comunicación; no afecta plantillas D28D/Training/Food.

---

## 7. Auditoría

Configuraciones → Auditoría → filtrar modulo **spiritual**

Acciones clave: lecturas biblia, devocionales, estudios abiertos, eventos inscritos/asistidos.

---

## 8. Kill switch

Desactivar sin deploy Food:

```env
SPIRITUAL_CENTER_ENABLED=false
VITE_SPIRITUAL_WIDGETS=false
```

Reiniciar backend y rebuild frontend.

---

## 9. Buenas prácticas V1

- Publicar versículo del día antes de activar cohortes piloto
- Usar alcance **trainer** o **gym** para pruebas antes de global
- Importar biblia completa en staging antes de producción
- Revisar plantillas CC antes del primer envío masivo

---

*Guía SuperAdmin — VIENTO RECIO V1.*
