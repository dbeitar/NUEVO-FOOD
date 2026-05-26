# Manual 03 — Plan de alimentación (Food)

**Calculadora, catálogo, recetas, registro diario y seguimiento nutricional**  
**Versión:** Mayo 2026

---

## 1. Para qué sirve

El módulo **Food / Plan de alimentación** permite:

- Calcular necesidades calóricas (TMB/TDEE).
- Gestionar catálogo de alimentos y equivalentes.
- Registrar comidas diarias y ver macros.
- Biblioteca de recetas.
- Seguimiento de adherencia nutricional (coaches).

Puede operar **embebido** (`/food-plan`, módulo NestJS) o en **modo legacy** dentro del shell (`VITE_FOOD_LEGACY=true`).

---

## 2. Cómo acceder

| Rol | Ruta |
|-----|------|
| Admin food | **Maestros → Plan de alimentación** |
| Coach / nutricionista | Servicio Food en Inicio → panel operativo |
| Usuario final | **Mi Plan** / tarjeta Food en Inicio |

**SSO:** si Food es externo/embebido, el shell genera URL de launch con token (`/api/food-module/launch`).

---

## 3. Panel administrativo (tarjetas)

| Tarjeta | Función |
|---------|---------|
| **Usuarios** | Personas con plan nutricional |
| **Configurar planes** | Plan calórico por usuario |
| **Seguimiento** | Adherencia y evolución |
| **Calculadora nutricional** | Referencia inicial TMB/TDEE |
| **Alimentos (catálogo)** | CRUD alimentos, macros, porciones |
| **Registro de comidas** | Diario (vista admin) |
| **Equivalentes por grupo** | Sustituciones por macro |
| **Recetas** | Biblioteca de recetas |
| **Vigencias** | Pagos y extensiones (roles autorizados) |

---

## 4. Flujo usuario final

```
Calculadora / plan asignado → Registro diario → Totales del día → Progreso semanal
```

| Entrada | Salida |
|---------|--------|
| Alimentos del catálogo | Búsqueda y selección en registro |
| Porciones consumidas | Calorías, proteína, carbos, grasas |
| Peso, objetivo | Recomendación en calculadora |
| Chat nutricional (opcional) | Sugerencias asistidas |

**APIs shell:** `/api/foods`, `/api/food-log`, `/api/plan`, `/api/recipes`, `/api/calculator`

---

## 5. Seguimiento coach

Coaches con licencia Food ven **Seguimiento** en el panel Food o en el ecosistema unificado (`CoachEcosystemTracking` → pestaña Food).

Requiere licencia activa módulo `food` (`module_licenses`).

---

## 6. Licencia y plan comercial

| Concepto | Detalle |
|----------|---------|
| Plan comercial | Kind `food` en **Planes y licencias** |
| `module_access` | `food_plan: true`, `nutrition: true` |
| Registro wizard | Paso servicio **Plan de Alimentación** |

Ver [05_PLANES_PAGOS_VIGENCIAS.md](./05_PLANES_PAGOS_VIGENCIAS.md).

---

## 7. Integración con módulo embebido

| Variable | Efecto |
|----------|--------|
| Food externo | Tarjeta Inicio abre `/food-plan` o URL configurada |
| `VITE_FOOD_LEGACY=true` | Rutas legacy en shell monolito |

**Principio:** la lógica nutricional profunda vive en `modules/food_version_final/`; el shell unifica login, licencias y pagos.

---

## 8. Pruebas

```bash
npm run test:e2e       # alimentos, food-log, plan
npm run test:phases    # food-module/status
npm run test:commercial # registro Food
```

---

[← D28D](./02_MODULO_D28D.md) · [Índice](./README.md) · [Training →](./04_MODULO_TRAINING.md)
