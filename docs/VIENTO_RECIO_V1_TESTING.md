# VIENTO RECIO V1 — Pruebas

**Script:** `scripts/test_spiritual_v1.sh`  
**Evidencia:** `docs/VIENTO_RECIO_V1_TEST_EVIDENCE.txt` (generada al ejecutar)

---

## Requisitos

- Backend en ejecución (PostgreSQL + migración spiritual aplicada)
- `curl`, `jq`
- Credenciales SuperAdmin (piloto: `admin@foodplan.local` / `Demo!2026`)
- Login API usa campo **`password`** (no `clave`)

---

## Ejecución

```bash
# Backend en puerto 3001 (default)
./scripts/test_spiritual_v1.sh

# Puerto alternativo
./scripts/test_spiritual_v1.sh http://localhost:3003/api admin@foodplan.local 'Demo!2026'
```

---

## Casos validados

| # | Caso | Endpoint |
|---|------|----------|
| 1 | Login SuperAdmin | `POST /auth/login` |
| 2 | Feed usuario | `GET /spiritual/feed/today` |
| 3 | Import biblia JSON | `POST /spiritual/admin/bible/import` |
| 4 | Lectura capítulo | `GET /spiritual/bible/JHN/3` |
| 5 | Búsqueda biblia | `GET /spiritual/bible/search?q=Dios` |
| 6 | Publicar versículo del día | `POST /spiritual/admin/verse-of-day` |
| 7 | Feed con versículo | `GET /spiritual/feed/today` |
| 8 | Crear devocional | `POST /spiritual/admin/devotionals` |
| 9 | Iniciar devocional | `POST /spiritual/devotionals/:id/start` |
| 10 | Completar día | `POST /spiritual/devotionals/:id/complete` |
| 11 | Crear estudio | `POST /spiritual/admin/studies` |
| 12 | Abrir estudio (audit) | `GET /spiritual/studies/:id` |
| 13 | Crear evento | `POST /spiritual/admin/events` |
| 14 | Inscripción evento | `POST /spiritual/events/:id/register` |
| 15 | Asistencia evento | `POST /spiritual/events/:id/attend` |
| 16 | Auditoría spiritual | `GET /platform/audit?modulo=spiritual` |
| 17 | Plantillas CC spiritual | `GET /communications/templates?modulo=spiritual` |
| 18 | FOOD intacto | `GET /foods` |

---

## Resultado esperado

```
RESULTADO: 18 OK, 0 FAIL
```

Ejecución local (2026-05-30): **18 OK, 0 FAIL** contra backend `:3003`.

---

## Pruebas manuales UI

1. **SuperAdmin:** Maestros → Configuraciones → Centro de Formación Espiritual
2. Importar biblia, publicar versículo, crear devocional de 7 días
3. **Usuario final:** Inicio y Progreso muestran widget «Hoy» (sin marca VIENTO RECIO)
4. Explorar Biblia desde widget
5. Verificar Mis Servicios **no** incluye servicio espiritual
6. FOOD_PLAN login y tarjeta sin cambios

---

## Regresión ecosistema

Tras desplegar V1, ejecutar también:

```bash
./scripts/smoke_test_api.sh
./scripts/test_all_phases.sh
```

FOOD, D28D y TRAINING deben permanecer en verde.

---

*Guía de pruebas VIENTO RECIO V1.*
