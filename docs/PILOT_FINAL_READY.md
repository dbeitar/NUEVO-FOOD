# Preparación final piloto — evidencia A1–A5

**Fecha:** 2026-05-29  
**Regla:** FOOD_PLAN congelado — cambios solo en shell D28D/TRAINING.

---

## Ajustes aplicados

| ID | Descripción | Archivos |
|----|-------------|----------|
| **A1** | Registro único wizard; legacy no montado | `src/App.jsx`, `.env.example`, `docs/REGISTER_OFFICIAL_EVIDENCE.md` |
| **A2** | Coach: solo roles Usuario Final + Nutricionista; sin gym/trainer en form | `src/components/AdminUsers.jsx` |
| **A3** | FOOD-only: sin HelpAssistant; sin FAB NutritionChat si Food externo | `src/components/Dashboard.jsx` |
| **A4** | Runbook migración Food | `docs/FOOD_MIGRATION_RUNBOOK.md` |
| **A5** | Auditoría read-only usuarios Food | `scripts/audit_food_users_readonly.mjs`, `docs/FOOD_USER_AUDIT_EVIDENCE.json` |

---

## Pruebas E2E

| Suite | Resultado | Notas |
|-------|-----------|-------|
| `test:e2e` | **14/14 OK** | |
| `test:comm` | **21/21 OK** | |
| `test:ux` | **26/26 OK** | |
| `test:commercial` | **18/20 OK** | 1 fallo: plan Vital capacidad (409) — datos repetidos E2E, no regresión A1–A3 |
| **Total funcional** | **79/80 OK** | Comercial recuperable reseteando contador plan o usando otro plan |

---

## A5 — Auditoría usuarios Food (local, read-only)

| Métrica | Valor |
|---------|-------|
| Usuarios totales (admin list) | 146 |
| Candidatos Food (`module_access`) | 55 |
| Auditados (muestra) | 50 |
| Login OK (`Demo!2026` pilot) | 49/50 |
| Licencia food activa | 48/50 |
| Food module status enabled | 49/50 |
| Usuario sin login | `food.admin@d28d.local` — contraseña distinta a seed piloto (esperado) |

**Producción 35 usuarios:** ejecutar en staging `node scripts/audit_food_users_readonly.mjs https://API/api` con credencial ops; **no modificar usuarios**.

---

## Clasificación piloto

| Escenario | Estado | Condición |
|-----------|--------|-----------|
| **Piloto 5 usuarios** | **READY** | A1–A3 desplegados; env `VITE_REGISTER_WIZARD_V2=true` |
| **Piloto 20 usuarios** | **READY** | + runbook Food comunicado |
| **Piloto 35 usuarios Food** | **WARNING** | Ejecutar auditoría A5 en prod; 1 login fallido posible si password ≠ seed |
| **Producción controlada** | **WARNING** | SMTP/Zoom/Wompi prod + auditoría A5 completa |

### Blockers

- Ninguno de código Food
- Comercial 409 capacidad plan → ops (incrementar cupo o limpiar cuentas test)

---

## Deploy checklist

```bash
# Frontend
VITE_REGISTER_WIZARD_V2=true
VITE_FOOD_LEGACY=false

# Backend (sin tocar Food DB)
FOOD_MODULE_URL=...
FOOD_SHELL_API_KEY=...
```

---

*Preparación final — sin V1.1, sin Notification Center, sin bundle comercial.*
