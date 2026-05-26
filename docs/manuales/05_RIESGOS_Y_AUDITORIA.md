# Riesgos, auditoría y decisiones — D28D

**Documento maestro 5/5**

---

## 0. Evolución sin destrucción (gobierno técnico)

Toda iniciativa debe cumplir el principio definido en [01_INDICE_MAESTRO.md](./01_INDICE_MAESTRO.md).

### Riesgo si se ignora

| Anti-patrón | Consecuencia |
|-------------|--------------|
| “Empezar de cero” con otro framework | Pérdida de meses de Core (ciclos D28D, live, food, invites) |
| Quitar JsonStore antes de paridad Prisma | Regresión en dev y despliegues híbridos |
| Apagar módulos “por limpieza” | Ruptura de contratos piloto y multi-tenant |
| Rediseño UI total sin capas | Bloqueo de operación mientras se reconstruye |

### Checklist antes de aprobar un cambio

- [ ] ¿Mantiene las rutas/API/pantallas que ya usan clientes o el piloto?  
- [ ] ¿Hay plan de rollback o feature flag?  
- [ ] ¿La migración es por fases (ej. JSON → Prisma ya hecho así)?  
- [ ] ¿El doc 03 sigue describiendo lo vendible sin mentir?  

### Mejoras alineadas (ejemplos válidos)

- Capa Prisma **junto a** JsonStore, no en lugar abrupto  
- Códigos invite en admin **sin** cambiar flujo de registro  
- Refactor de un controller **con** mismos contratos HTTP  
- Tests smoke automatizados **sobre** comportamiento actual  

---

## 1. Riesgos estratégicos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Prometer roadmap como Core | Pérdida de confianza en piloto | Solo doc 03 §1 en ventas |
| Competir con apps globales | Posicionamiento difuso | Marca blanca + LATAM + modular |
| IA como protagonista | Expectativa no cumplida | IA = asistente opcional |
| Escalar sin piloto validado | Churn temprano | Métricas § piloto en doc 02 |
| Multi-tenant mal probado | Fuga de datos entre gyms | Smoke § multi-tenant doc 03 |
| JSON en producción | Pérdida/corrupción datos | Postgres + Prisma obligatorio |

---

## 2. Hallazgos auditoría (resumen ejecutivo)

Consolidado de auditorías pre-piloto y profesionalización del ecosistema.

### P0 — Bloqueantes antes de piloto real

| # | Hallazgo | Estado típico |
|---|----------|----------------|
| 1 | Separación datos por `gym_id` en todas las rutas admin | Revisar en cada release |
| 2 | JWT + roles en rutas sensibles | Implementado; verificar nuevas rutas |
| 3 | Registro invite validado en servidor (no solo UI) | **Resuelto** (Postgres + inviteResolver) |
| 4 | Persistencia producción ≠ archivos JSON sueltos | **Resuelto** con Prisma |
| 5 | Health + variables obligatorias documentadas | Doc 04 |

### P1 — Importante (primer mes post-piloto)

- Audit log persistente en Postgres para acciones admin  
- UI asignación `program_id` sin depender de seed  
- Rate limits y mensajes de error consistentes en español  
- Tests automatizados mínimos (auth, invite, tenant)  
- Backup automático de BD  

### P2 — Mejora continua

- Observabilidad (logs estructurados, alertas)  
- Documentación API OpenAPI  
- Reducción de deuda en componentes admin grandes  
- Internacionalización si sale de LATAM  

---

## 3. Deuda técnica conocida

| Área | Nota |
|------|------|
| `UserDatabase` + JSON | Coexiste con repos Prisma; camino: solo repos en prod |
| Componentes admin | Archivos grandes; refactor incremental |
| Smoke tests | Puertos en texto antiguo (3001); usar 3002 en ejecución |
| README raíz | Actualizar si aún dice “sin Prisma” |
| Realtime coach | Código presente, flag apagado — no documentar como live |

---

## 4. Oportunidades (priorizadas)

1. **Piloto con 1 gym real** — caso de estudio LATAM  
2. **Códigos invite en admin** — ya en producto; acelerar onboarding B2B2C  
3. **Postgres + seed reproducible** — clonar repo en otro PC sin sorpresas  
4. **Paquete “Coach Starter”** — food + training sin D28D  
5. **Integración WhatsApp** — ya en branding gym; profundizar notificaciones  

---

## 5. Decisiones de producto cerradas

- D28D = módulo con contenido **bloqueado** para gyms  
- Asistencia live = al **entrar a Zoom**, no al abrir calendario  
- 13 ciclos × 28 días = regla de negocio fija  
- Registro = **invite obligatorio** (no registro abierto)  
- Visión por cámara = **suspendida** hasta nueva validación  

---

## 6. Qué revisar en cada release

- [ ] `npm run build` sin errores  
- [ ] `prisma migrate deploy` en entorno destino  
- [ ] Smoke auth + multi-tenant (doc 03 §6)  
- [ ] Copy UI sin promesas de roadmap  
- [ ] `VITE_API_BASE_URL` correcto en build de producción  

---

## 7. Historial documental

**Mayo 2026:** ~20 manuales en `docs/manuales/` unificados en **5 maestros**. Versiones antiguas (`VISION_*`, `PRODUCCION_HOY`, `AUDITORIA_*` separados, etc.) eliminadas por duplicación. Fuente de verdad: `01`–`05` en esta carpeta.
