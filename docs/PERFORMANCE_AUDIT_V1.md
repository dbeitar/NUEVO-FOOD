# MVPFOOD / D28D — PERFORMANCE AUDIT V1 (K6)

**FASE 10 — Performance, escalabilidad y resiliencia**  
**Fecha:** 2026-05-27  
**Regla aplicada:** no se modificó lógica de negocio. Se midió primero.

---

## 1) Arquitectura evaluada

- **Frontend:** React + Vite (no incluido en carga; pruebas directas a API).
- **Backend API:** Node/Express (ruta base `/api`).
- **DB:** PostgreSQL 16 (docker local `mvpfood-postgres`).
- **Auth:** JWT, endpoint `POST /api/auth/login`.
- **Observación clave:** existe rate limit de autenticación:
  - `backend/serverApp.js` configura `authLimiter` con **máximo 300 / 15min en dev** y **20 / 15min en prod**.

---

## 2) Escenarios ejecutados (evidencia)

Se ejecutó la suite en modo **smoke** para obtener evidencia rápida y repetible:

```bash
BASE_URL=http://localhost:3002/api K6_PROFILE=smoke bash performance/run-suite.sh
```

**Artefactos:**

- K6 summaries: `performance/results/*-summary.json`
- Métricas tabla: `performance/results/k6-metrics-table.md`
- Auditoría PG:  
  - `performance/results/postgres-audit-before.json`  
  - `performance/results/postgres-audit-after.json`
- Monitor CSV (host + postgres): `performance/results/monitor-run.csv`
- Log de ejecución: `performance/results/run-log.jsonl`

---

## 3) Métricas K6 (P50/P95/P99, throughput, error rate)

Fuente: `performance/results/k6-metrics-table.md`

Resumen (smoke):

- **01-health (10 VU):** P50 ~3ms, P95 ~243ms, ~40 RPS, 0% error.
- **02-login (50 VU):** 100% error (**BLOCKER**) por rate limiting de auth (ver sección 6).
- **03-usuario-final (100 VU):** P50 ~1141ms, P95 ~2142ms, ~87 RPS. Error reportado 33% (ver nota de interpretación).
- **04-d28d (100 VU):** P50 ~1151ms, P95 ~2019ms, ~67 RPS, 0% error.
- **05-training (100 VU):** P50 ~1366ms, P95 ~3226ms, ~52 RPS, 0% error.
- **06-communication (50 VU):** P50 ~964ms, P95 ~1603ms, ~40 RPS, 0% error.
- **07-stress (500 VU):** P50 ~866ms, P95 ~2686ms, ~190 RPS, 0% error.
- **08-spike (500 VU):** P50 ~2444ms, P95 ~4239ms, ~132 RPS, ~0.02% error.
- **09-endurance (50 VU, smoke):** P50 ~1080ms, P95 ~2507ms, ~39 RPS. Error reportado 33% (ver nota).
- **11-audit (30 VU):** P50 ~1028ms, P95 ~1801ms, ~26 RPS. Error reportado 16.67% (ver nota).

### Nota sobre “HTTP error rate”

En K6, `http_req_failed` se incrementa cuando `expected_response=false` (no 2xx/3xx).  
Algunos endpoints en los flujos permiten **403/404** como “válidos” en el negocio (p.ej. módulo no licenciado, plan inexistente), pero K6 igual los cuenta como “failed”.

Por eso, los escenarios donde **checks** fallan (ej. en `03-usuario-final` fallan `help 200` y `profile 200`) deben interpretarse como:

- **“Error real de API”** si es 4xx/5xx inesperado para un usuario con licencia.
- **“Respuesta esperada”** si forma parte del flujo (403/404) y se decide aceptarla explícitamente.

Evidencia: `performance/results/03-usuario-final-summary.json` muestra `help 200` y `profile 200` en fail 100%.

---

## 4) Consumo CPU / RAM / PostgreSQL / Conexiones

### 4.1 Monitor host + Postgres (CSV)

Archivo: `performance/results/monitor-run.csv`

Campos: `node_cpu_pct,node_rss_mb,pg_cpu_pct,pg_mem_mb,pg_connections,pg_active`

> En el sample disponible se observan conexiones ~79–80 durante la ventana registrada.

### 4.2 PostgreSQL audit (antes/después)

Antes: `performance/results/postgres-audit-before.json`  
Después: `performance/results/postgres-audit-after.json`

Datos relevantes (smoke):

- Tamaño DB: **847 MB → 890 MB**
- Tablas audit/log crecen durante carga:
  - `communication_event_logs`: **30909 → 32450**
  - `audit_logs`: **34343 → 35886**
  - `platform_audit_events`: **120232 → 120232** (sin cambio en este run)

---

## 5) Cuellos de botella encontrados

### 5.1 Auth `/auth/login` bajo concurrencia

**Escenario 02 (login)** falla 100% (smoke) por rate limit en auth.

Evidencia:
- `performance/results/02-login-summary.json`:
  - `login status 200`: passes 0, fails 10580
- `performance/results/run-log.jsonl`: `02-login exit_code=99`

**Conclusión:** el sistema está protegido contra ataques/abuso de login, pero el escenario “500 concurrentes login constante” no es medible sin cambiar el diseño del test (o sin un entorno prod con políticas distintas).

---

## 6) Riesgos

- **Riesgo 1 — login bursts:** en aperturas masivas (spike de usuarios) el rate limit puede generar 429/401 si muchos usuarios intentan autenticar al mismo tiempo desde una IP o un NAT.
- **Riesgo 2 — auditoría y logs:** crecimiento de tablas de auditoría y comunicación puede volverse el factor dominante a 100k+ usuarios si no hay housekeeping/partitioning (recomendación a evaluar después de medir en staging real).
- **Riesgo 3 — interpretación de error rate:** K6 cuenta 403/404 como “failed”; debe definirse explícitamente qué statuses son aceptables por endpoint para reportar error rate real.

---

## 7) Recomendaciones (sin implementar)

> Solo recomendaciones; **no** se aplicaron optimizaciones ni refactors.

- **Auth load testing realista:** medir `login` como tasa (arrival-rate) acorde a negocio (ej. aperturas de ciclo) en lugar de “login por iteración por VU”.
- **Separar métricas por endpoint:** agregar KPIs por endpoint (200/4xx/5xx) para diferenciar “expected” vs “unexpected”.
- **Staging mirror:** repetir suite completa (`K6_PROFILE=full`) en hardware similar a producción y con monitoreo real (CPU/RAM Node, PG, pool Prisma).
- **Housekeeping auditoría:** definir retención/archivado para `audit_logs` y `communication_event_logs`.

---

## 8) Capacidad estimada (smoke, aproximación)

Archivo: `performance/results/capacity-estimate.json`

**Importante:** esta estimación es una **extrapolación** basada en smoke; debe validarse con `full` y con definición de “error rate real” por endpoint.

---

## 9) Clasificación final (READY / WARNING / BLOCKER)

Con la evidencia actual (smoke):

- **1.000 concurrentes:** **BLOCKER** (por definición actual de error rate y por endpoints que responden no-200 en flujos).
- **5.000 concurrentes:** **BLOCKER**
- **10.000 concurrentes:** **BLOCKER**
- **50.000 concurrentes:** **BLOCKER**

> El siguiente paso para una clasificación justa es ejecutar `full` y ajustar el reporte para separar 4xx “esperados” de 5xx “inesperados”.

---

## 10) Checklist producción (preliminar)

- [ ] Repetir `K6_PROFILE=full` en staging con hardware similar.
- [ ] Monitoreo real: Node CPU/RAM + GC, PG conexiones/locks, Prisma pool.
- [ ] Definir SLOs (P95/P99 por endpoint crítico).
- [ ] Definir política de rate-limit compatible con picos reales de negocio.
- [ ] Plan de retención para tablas de auditoría/comunicación.

