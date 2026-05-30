# VIENTO RECIO — Modelo de datos

**Versión:** 0.1 (diseño)  
**Motor:** PostgreSQL vía Prisma (mismo cluster MVPFOOD)  
**Prefijo tablas:** `spiritual_*`  
**Sin tablas en Food DB**

---

## 1. Principios

1. **Dominio aislado** — ninguna FK hacia tablas Food externas.
2. **FK a `users`, `gyms`, `trainers`** — alineado con multi-tenant existente.
3. **Biblia volumétrica** — índices en `verse`; importación por lotes.
4. **Retos espirituales** — reutilizan `d28d_challenges` (no duplicar entries/evidences).
5. **Progreso denormalizado opcional** — snapshots para dashboard rápido.

---

## 2. Diagrama entidad-relación (resumen)

```
spiritual_bible_versions
spiritual_bible_books ──< spiritual_bible_chapters ──< spiritual_bible_verses

spiritual_verse_of_day (programación + contenido publicado)

spiritual_devotional_plans ──< spiritual_devotional_days
spiritual_devotional_progress (user_id, plan_id, day_index, completed_at)

spiritual_studies (+ tags vía spiritual_study_tags)
spiritual_study_authors
spiritual_study_categories

spiritual_testimonies (moderation_status, media)

spiritual_events ──< spiritual_event_registrations
spiritual_event_attendance

spiritual_prayer_requests ──< spiritual_prayer_comments (admin/coach)

spiritual_content_assignments (polimórfico scope)

spiritual_user_notes (bible verse notes, private)
spiritual_user_favorites (verse_id | study_id | ...)
spiritual_user_bookmarks

d28d_challenges (existente, reglas.kind = spiritual)
```

---

## 3. Biblia (Componente 1)

### `spiritual_bible_versions`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| code | String unique | ej. `RVR1960`, `NVI` |
| name | String | «Reina-Valera 1960» |
| language | String | `es` |
| active | Boolean | Una versión default por idioma |
| imported_at | DateTime | |
| source_meta | Json | checksum, filas, archivo origen |

### `spiritual_bible_books`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| version_id | FK | |
| orden | Int | 1..66 |
| code | String | `GEN`, `MAT` |
| name | String | «Génesis» |
| testament | String | `OT` \| `NT` |

### `spiritual_bible_chapters`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| book_id | FK | |
| chapter_number | Int | |

### `spiritual_bible_verses`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | BigInt PK | ~31k+ versículos por versión |
| chapter_id | FK | |
| verse_number | Int | |
| text | Text | |

**Índices:**

- `(chapter_id, verse_number)` unique
- GIN/trigram en `text` para búsqueda español (pg_trgm) — fase implementación

### Importador (sin hardcode)

| Formato | Uso |
|---------|-----|
| JSON | `[{ book, chapter, verse, text }]` |
| CSV | `book_code,chapter,verse,text` |
| SQL | INSERT batch generado offline |

Script: `scripts/spiritual/import_bible.mjs --version RVR1960 --file data/bible/rvr1960.json`

---

## 4. Versículo del día (Componente 2)

### `spiritual_verse_of_day`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| scheduled_date | Date unique | Día calendario TZ America/Mexico_City |
| verse_id | FK nullable | Referencia biblia |
| custom_text | Text nullable | Override manual |
| reflection | Text | Reflexión corta |
| published | Boolean | |
| published_at | DateTime | |
| created_by_id | Int | SuperAdmin |
| assignment_id | FK nullable | Si no es global |

---

## 5. Devocionales (Componente 3)

### `spiritual_devotional_plans`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| title | String | |
| duration_days | Int | 7, 21, 30, 40 |
| description | Text | |
| active | Boolean | |
| cover_url | String nullable | |

### `spiritual_devotional_days`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| plan_id | FK | |
| day_index | Int | 1..N |
| verse_id | FK nullable | |
| reflection | Text | |
| prayer | Text | |
| challenge | Text | Desafío del día |

### `spiritual_devotional_progress`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| user_id | FK users | |
| plan_id | FK | |
| day_index | Int | |
| completed_at | DateTime | |
| notes | Text nullable | |

**Unique:** `(user_id, plan_id, day_index)`

---

## 6. Estudios bíblicos (Componente 4)

### `spiritual_studies`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| title | String | |
| description | Text | |
| media_type | Enum | `pdf`, `video`, `audio`, `youtube`, `document`, `text` |
| media_url | String | |
| category_id | FK nullable | |
| author_id | FK nullable | |
| tags | String[] o tabla M2M | |
| active | Boolean | |
| created_at | DateTime | |

### `spiritual_study_categories` / `spiritual_study_authors`

Catálogos simples CRUD SuperAdmin.

---

## 7. Testimonios (Componente 5)

### `spiritual_testimonies`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| user_id | FK | Autor |
| tipo | String | `video`, `audio`, `image`, `text` |
| content | Text | Texto o URL media |
| moderation_status | String | `pending`, `approved`, `rejected` |
| gym_id | FK nullable | Scope comunidad |
| trainer_id | FK nullable | |
| approved_by_id | Int nullable | SuperAdmin |
| created_at | DateTime | |

---

## 8. Eventos (Componente 6)

### `spiritual_events`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| title | String | |
| description | Text | |
| mode | String | `in_person`, `virtual`, `hybrid` |
| location | String nullable | |
| zoom_link | String nullable | Reutiliza patrón live classes (no FK) |
| meet_link | String nullable | |
| start_time | DateTime | |
| end_time | DateTime | |
| capacity | Int nullable | |
| active | Boolean | |

### `spiritual_event_registrations`

| user_id | event_id | registered_at | status |

### `spiritual_event_attendance`

| user_id | event_id | joined_at | trigger |

Patrón análogo a `attendance_events` en `LiveClassDatabase` pero en tablas dedicadas espirituales.

---

## 9. Peticiones de oración (Componente 7)

### `spiritual_prayer_requests`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| user_id | FK | |
| title | String | |
| body | Text | |
| status | String | `open`, `answered`, `closed` |
| visibility | String | `private`, `community`, `leaders_only` |
| gym_id | FK nullable | Derivado de usuario |
| trainer_id | FK nullable | |
| answered_at | DateTime nullable | |
| answer_note | Text nullable | Testimonio de respuesta |

### `spiritual_prayer_comments`

| id | request_id | author_id | body | is_staff | created_at |

Solo staff asignado (SuperAdmin; opcional coach con flag) — no hilo público abierto.

---

## 10. Asignación de contenido (Componente 9)

### `spiritual_content_assignments`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | Int PK | |
| content_type | String | `verse`, `devotional_plan`, `study`, `event`, `challenge`, `testimony_feed` |
| content_id | Int | ID en tabla respectiva |
| scope_type | String | `global`, `gym`, `trainer`, `users` |
| scope_gym_id | Int nullable | |
| scope_trainer_id | Int nullable | |
| scope_user_ids | Json | `[1,2,3]` si users |
| active_from | DateTime | |
| active_until | DateTime nullable | |
| created_by_id | Int | |

**Índice:** `(content_type, content_id, scope_type)`

---

## 11. Datos de usuario (favoritos, notas, marcadores)

### `spiritual_user_favorites`

| user_id | target_type | target_id | created_at |

### `spiritual_user_notes`

| user_id | verse_id | note | private default true |

### `spiritual_user_bookmarks`

| user_id | chapter_id | label | position |

---

## 12. Retos espirituales — reutilización `d28d_challenges`

**No crear tablas nuevas para entries/evidences.**

Extensión semántica vía JSON `reglas`:

```json
{
  "kind": "spiritual",
  "spiritual_type": "prayer",
  "assignment_id": 12,
  "daily_goal_minutes": 10
}
```

Opcional vista SQL o query:

```sql
SELECT * FROM d28d_challenges
WHERE reglas->>'kind' = 'spiritual';
```

---

## 13. Migraciones

1. `20260601000000_spiritual_bible_core`
2. `20260601010000_spiritual_content_devotionals_studies`
3. `20260601020000_spiritual_events_prayer_assignments`
4. `20260601030000_spiritual_user_engagement`

**Rollback:** drop schema spiritual tables only — sin impacto Food/D28D comercial.

---

## 14. Almacenamiento archivos

| Tipo | Ruta |
|------|------|
| PDF estudios | `/uploads/spiritual/studies/` |
| Testimonios media | `/uploads/spiritual/testimonies/` |
| Import biblia | `/data/spiritual/imports/` (no servido público) |

Mismo patrón multer que `d28dChallengeRoutes` evidencias.

---

## 15. Volumetría estimada

| Entidad | Filas estimadas |
|---------|-----------------|
| Versículos (1 versión ES) | ~31 000 |
| Devocional days (10 planes × 40 días) | 400 |
| Eventos/año | 100–500 |
| Peticiones oración activas | 1 000–5 000 |
| Asignaciones | 500 |

PostgreSQL actual MVPFOOD soporta carga sin sharding en piloto.

---

## 16. Lo que NO se crea

- Tablas en Food DB
- `module_licenses` row tipo `viento_recio`
- Planes comerciales en `accounts` / `commercial_plans`
- Duplicado de `communication_templates` existentes (solo INSERT nuevos)

---

*Modelo de datos propuesto — sujeto a revisión en implementación Fase 1.*
