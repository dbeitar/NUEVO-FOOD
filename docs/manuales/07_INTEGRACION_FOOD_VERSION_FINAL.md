# Integración `dbeitar/food_version_final` → D28D (MVPFOOD)

**Fecha análisis:** 2026-05-21  
**Repositorio origen:** https://github.com/dbeitar/food_version_final (privado)  
**Producción referencia:** https://foodplan.tech/

---

## 1. Resumen ejecutivo

`food_version_final` es una aplicación **completa y madura** (Food Plan): NestJS + TypeORM + Postgres + Redis + React/TypeScript/Redux, desplegable con Docker. No es un “módulo UI” que se pegue en un día: es **otro producto** con su propio auth, roles, suscripciones y esquema de BD (UUID).

**Reemplazar** el plan de alimentación embebido en D28D por este desarrollo es **viable**, con probabilidad de éxito **media-alta (≈65–75%)** si se elige integración por **servicio + SSO** y no por “fusionar todo en un solo backend Express” de entrada.

---

## 2. Comparativa rápida

| Aspecto | MVPFOOD (D28D) hoy | food_version_final |
|--------|-------------------|---------------------|
| Backend | Express + Prisma/JSON híbrido | NestJS + TypeORM |
| Frontend | React 19 + JS + Vite | React + TS + Redux |
| IDs usuario | `Int` | `UUID` |
| Roles | `super_admin`, `admin_food_plan`, `usuario_final`, … | `SUPER_ADMIN`, `ADMIN`, `TRAINER`, `USER` |
| Auth | JWT sesión D28D | JWT + refresh + Redis |
| Food log / plan | Rutas `/api/food-log`, `/api/plan`, componentes JSX | Módulos `nutrition`, `nutrition-plan`, `recipes`, `measurements`, `daily-report` |
| Extra | D28D, live classes, training, gym WL | Suscripciones, features por plan, barcode, mail, Anthropic chatbot |
| Deploy | Backend :3002, Postgres :5434 | Docker :3000 / :3001 / :5432 |

**Solapamiento funcional:** calculadora/macros, registro diario, recetas, mi plan, mediciones, reporte diario, chatbot, admin alimentos, gyms, trainers.

**Lo que D28D tiene y Food Plan no (mantener en shell):** clases en vivo, programas D28D, rutinas/training gallery, licencias modulares `module_access`, maestro de apariencia unificado.

---

## 3. Estrategias posibles (orden recomendado)

### Opción A — Microservicio + SSO (recomendada) — **probabilidad ~70%**

1. Desplegar API Food Plan (`:3001`) y front Food (`:3000` o subdominio `food.d28d.com`).
2. En D28D, tarjeta “Plan de alimentación” → redirect o iframe controlado con **token SSO** (email + firma HMAC, 60s).
3. Mapeo de roles D28D → Food Plan al provisionar usuario.
4. `module_access.food_plan` decide quién ve el enlace.
5. Usuarios legacy en foodplan.tech siguen en su BD hasta migración por lotes.

**Pros:** No rompe D28D; reutiliza el repo tal cual; alinea con foodplan.tech.  
**Contras:** Dos sesiones si SSO mal hecho; operación de 2 deploys.

### Opción B — Solo frontend Food dentro del shell D28D — **probabilidad ~45%**

Reescribir rutas del dashboard para cargar el front TS de Food Plan y apuntar `VITE_API_URL` al NestJS.

**Pros:** Una sola “app” visual.  
**Contras:** Dos stacks front (JS + TS), tokens distintos, CORS, bundler distinto; mucho trabajo de empaquetado.

### Opción C — Portar NestJS → Express/Prisma — **probabilidad ~35%**

Reimplementar ~5.4k líneas backend + migrar esquema UUID → Int.

**Pros:** Un solo backend a largo plazo.  
**Contras:** Meses; alto riesgo para usuarios en producción.

### Opción D — Redirect simple a foodplan.tech — **probabilidad ~85% operativo, ~40% UX**

Sin integración real; segundo login.

Solo como puente de días, no como reemplazo definitivo.

---

## 4. Plan de ejecución por fases (Opción A)

| Fase | Entregable | Duración estimada |
|------|------------|-------------------|
| **0** | Backup git + tag (hecho en repo) | 1 día |
| **1** | Inventario: usuarios foodplan.tech vs D28D (emails duplicados) | 2–3 días |
| **2** | Deploy staging Food Plan (docker-compose) + variables | 2 días |
| **3** | Endpoint SSO en NestJS + validación en D28D Express | 1 semana |
| **4** | Cambiar tarjeta `food-plan` en `userServices` / Dashboard (externo vs interno) | 2 días |
| **5** | Migración piloto 50 usuarios (script email → UUID) | 1 semana |
| **6** | Apagar vistas legacy JSX (`FoodLog`, `Calculator`, …) por feature flag | 3 días |
| **7** | Producción + monitoreo + rollback tag | ongoing |

---

## 5. Qué necesito para ejecutarlo (checklist)

### Acceso y datos
- [ ] Credenciales admin foodplan.tech / dump Postgres producción Food Plan
- [ ] Variables `.env` producción Food (`JWT_SECRET`, `ANTHROPIC_API_KEY`, mail, Redis)
- [ ] Lista de usuarios activos (conteo, emails, gyms)
- [ ] Decisión: ¿misma BD Postgres o instancia separada con sync?

### Infra
- [ ] Subdominio o path (`food.` / `/food`) + TLS
- [ ] Docker registry o servidor para `foodplan_api` + `foodplan_web`
- [ ] Redis en staging/prod (requerido por el repo)

### Producto / negocio
- [ ] Matriz roles D28D ↔ Food Plan (tabla escrita)
- [ ] ¿Suscripciones Food Plan siguen vigentes o pasan a `module_access` D28D?
- [ ] ¿Usuarios solo-D28D sin food deben auto-provisionarse?

### Equipo
- [ ] Dev con NestJS/TypeORM (mantenimiento API Food)
- [ ] Dev con MVPFOOD (SSO + dashboard)
- [ ] QA: login, plan vencido, registro diario, recetas, mediciones, chatbot

### Técnico en MVPFOOD (ya identificado)
- Archivos a **dejar de usar** tras cutover: `FoodPlanAdminView` rutas internas, `FoodLog.jsx`, `Calculator.jsx`, `Recipes.jsx`, `Equivalentes.jsx`, `NutritionChat.jsx`, `MyPlanView.jsx`, rutas `backend/src/routes/foodLogRoutes.js`, etc.
- **No tocar** en primera fase: D28D, training, live classes, appearance master.

---

## 6. Riesgos principales

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| IDs UUID vs Int | Migración imposible 1:1 simple | Tabla `user_account_links` (email, d28d_id, food_uuid) |
| Dos passwords | Abandono | SSO obligatorio antes de cutover |
| Food log en JSON (MVPFOOD) vs SQL (Food) | Pérdida histórico | Export/import script por usuario |
| Puertos 5432/3001 en docker Food vs 5434/3002 D28D | Conflicto local | Compose con nombres de servicio distintos |
| Roles distintos | Permisos incorrectos | Mapeo explícito + tests por rol |

---

## 7. Probabilidad de éxito (estimación)

| Escenario | Probabilidad | Comentario |
|-----------|--------------|------------|
| **A – Microservicio + SSO + piloto** | **65–75%** | Mejor balance esfuerzo/riesgo |
| **B – Front embebido** | 40–50% | Fricción técnica alta |
| **C – Un solo backend** | 30–40% | Solo si hay 2–3 meses dedicados |
| **D – Solo redirect** | 85% “funciona”, 40% satisfacción usuario | No es reemplazo real |

Factores que **suben** la probabilidad: usar foodplan.tech como API ya probada, piloto pequeño, mantener tag de rollback.  
Factores que **bajan**: migrar todos los usuarios de golpe, unificar BD sin diseño, apagar módulo viejo sin SSO.

---

## 8. Punto de restauración (backup)

- **Rama:** `backup/pre-food-integration-20260521`
- **Tag:** `pre-food-integration-20260521`
- **Commit base:** ver `docs/manuales/08_BACKUP_RESTORE.md`

Para volver:

```bash
git checkout pre-food-integration-20260521
# o crear rama de trabajo desde ahí:
git checkout -b restore-main pre-food-integration-20260521
```

---

## 9. Próximo paso sugerido

1. Confirmar **Opción A** (microservicio + SSO).  
2. Levantar Food Plan en staging con `docker-compose` del repo clonado.  
3. Prueba manual: login Food → registrar comida → recetas → mediciones.  
4. Diseñar tabla de vínculo de cuentas por email (1 página).  
5. Implementar SSO en sprint de 1 semana antes de apagar JSX legacy.
