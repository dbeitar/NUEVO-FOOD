# VIENTO RECIO — Seguridad y privacidad

**Versión:** 0.1 (diseño)  
**Alcance:** Centro de Formación Espiritual (`spiritual` namespace)  
**Principio:** Mínimo privilegio, multi-tenant estricto, datos sensibles (oración) protegidos

---

## 1. Modelo de amenazas (resumen)

| Amenaza | Impacto | Mitigación |
|---------|---------|------------|
| Usuario accede contenido no asignado | Medio | `spiritualAssignmentService` en cada GET |
| Coach ve peticiones de otra comunidad | Alto | Filtro gym_id/trainer_id + visibility |
| Escalación a SuperAdmin sin rol | Crítico | `requireSuperAdmin` middleware |
| Inyección en búsqueda biblia | Bajo | Prisma parametrizado; sanitizar query |
| UGC testimonio malicioso (XSS) | Medio | Sanitizar HTML; CSP frontend |
| URL media arbitraria (SSRF) | Medio | Allowlist dominios upload; no fetch server-side URLs usuario |
| Fuga datos oración en notificaciones | Alto | Plantillas CC respetan visibility; no body completo en push |
| Bypass licencia comercial | N/A | No hay licencia — asignación explícita only |

---

## 2. Roles y permisos (RBAC)

### Matriz de acceso API

| Recurso | super_admin | admin_d28d | coach | gym_admin | usuario_final |
|---------|-------------|------------|-------|-----------|---------------|
| `/api/spiritual/admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Biblia lectura | ✅ | ❌* | ❌* | ❌* | ✅ si asignado |
| Versículo del día (read) | ✅ | ❌* | ❌* | ❌* | ✅ si asignado |
| Devocional progreso (write) | ✅ | ❌ | ❌ | ❌ | ✅ propio |
| Estudios (read) | ✅ | ❌* | ❌* | ❌* | ✅ si asignado |
| Testimonio (create) | ✅ | ❌ | ❌* | ❌* | ✅ propio |
| Testimonio (moderate) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Eventos (register) | ✅ | ❌ | ❌ | ❌ | ✅ propio |
| Oración (create/read) | ✅ all | ❌ | ⚠️ leaders_only comunidad | ❌ | ✅ propio + visibility |
| Oración (comment staff) | ✅ | ❌ | ⚠️ flag futuro | ❌ | ❌ |
| Retos espirituales | ✅ admin | ❌ | ❌ | ❌ | ✅ inscripción propia |
| Asignación contenido | ✅ | ❌ | ❌ | ❌ | ❌ |

\* Solo si contenido global asignado y rol tiene acceso shell (usuario final autenticado).

### Implementación

```javascript
// Patrón recomendado — spiritualRoutes.js
router.use('/admin', auth, requireSuperAdmin);
router.use('/feed', auth, requireSpiritualAccess); // flag + asignación no vacía
router.post('/prayer', auth, prayerController.create); // ownership user_id
```

Reutilizar helpers existentes:

- `tenantScope.isPlatformAdmin()` — solo SuperAdmin opera admin
- **No** usar `licenseScope` para spiritual (no es licencia comercial)

---

## 3. Multi-tenant y asignación

### Reglas de resolución

1. **Global:** visible a todo usuario autenticado con `SPIRITUAL_CENTER_ENABLED` y al menos un servicio activo (D28D, FOOD, TRAINING) — configurable.
2. **Gym:** `user.gym_id === assignment.scope_gym_id`
3. **Trainer:** `user.trainer_id === assignment.scope_trainer_id`
4. **Users:** `user.id IN assignment.scope_user_ids`

### Anti-patterns prohibidos

- Devolver contenido por `gym_id` query param del cliente (siempre derivar de sesión)
- Listar todos los testimonios sin filtro scope
- Admin endpoints sin verificar `super_admin` en JWT/session

### Tests obligatorios

- Usuario gym A no lee evento asignado gym B
- Lista `scope_user_ids` no enumerable por otros usuarios

---

## 4. Datos sensibles — peticiones de oración

### Clasificación

| Campo | Sensibilidad | Retención |
|-------|--------------|-----------|
| title, body | Personal / espiritual | Hasta cierre + 1 año |
| visibility | Metadato | — |
| answer_note | Personal | Igual que request |
| comments staff | Interno | Audit trail |

### Visibility levels

| Valor | Quién lee |
|-------|-----------|
| `private` | Usuario + SuperAdmin |
| `community` | Usuario + SuperAdmin + usuarios mismo gym (anonimizado título opcional V1.1) |
| `leaders_only` | Usuario + SuperAdmin + coach/trainer asignado |

### Notificaciones

- `prayer.request.created`: plantilla CC **sin** body completo en email/WhatsApp — solo «Nueva petición» + link in-app
- Push in-app: truncar a 100 caracteres
- Log audit: **no** persistir body en metadata audit (solo id + visibility)

---

## 5. UGC — testimonios

| Control | Detalle |
|---------|---------|
| Moderación | Default `pending`; no publicar hasta `approved` |
| Media upload | Mismo límite tamaño que evidencias retos; MIME allowlist |
| XSS | Escapar texto; React default escape; no `dangerouslySetInnerHTML` |
| PII | Usuario informado en copy; SuperAdmin puede rechazar |

---

## 6. Biblia y notas privadas

| Recurso | Acceso |
|---------|--------|
| Versículos | Read-only post-import; SuperAdmin re-import |
| Favoritos | Solo `user_id` owner |
| Notas | `private=true` default; API filtra por owner |
| Marcadores | Solo owner |

**No** exponer notas de un usuario a coach/admin salvo export legal futuro (fuera alcance).

---

## 7. Autenticación y transporte

- Mismas cookies/JWT que MVPFOOD (`auth` middleware existente)
- HTTPS obligatorio producción (sin cambio)
- Rate limiting recomendado en:
  - `POST /spiritual/prayer` — 10/hora/usuario
  - `POST /spiritual/testimony` — 5/día/usuario
  - `GET /spiritual/bible/search` — 60/min/usuario

Patrón: reutilizar rate limiter global Express si existe; si no, añadir solo en spiritual routes.

---

## 8. Feature flags y kill switch

| Variable | Efecto |
|----------|--------|
| `SPIRITUAL_CENTER_ENABLED=false` | 404 en `/api/spiritual/*`; widgets ocultos |
| `VITE_SPIRITUAL_WIDGETS=false` | Frontend no monta componentes |

Kill switch no afecta FOOD/D28D/Training.

---

## 9. Auditoría y cumplimiento

### Eventos audit (modulo `spiritual`)

Registrar en `platform_audit_events`:

- Acciones admin: import biblia, publicar versículo, asignar contenido, moderar testimonio
- Acciones usuario: completar devocional, asistir evento, crear petición (sin body)
- Acceso denegado: log opcional `spiritual.access.denied` (sin PII)

### Retención

Alinear con política MVPFOOD existente (`legalContent.js` / términos plataforma).

### GDPR / derechos usuario (futuro)

- Export peticiones + notas propias
- Borrado soft-delete peticiones `closed` > retención

---

## 10. Communication Center — seguridad plantillas

### Reglas

1. **Solo INSERT** plantillas nuevas modulo `spiritual`
2. Variables plantilla allowlist: `{{userName}}`, `{{verseText}}`, `{{eventTitle}}`, `{{link}}` — no `{{prayerBody}}`
3. WhatsApp: mismas credenciales CC; no canal paralelo
4. Validar `normalizeModule('spiritual')` no remap a `d28d`/`food`

---

## 11. Retos espirituales — aislamiento D28D

| Riesgo | Control |
|--------|---------|
| Reto espiritual visible en leaderboard fitness | Excluir `reglas.kind=spiritual` de rankings públicos fitness |
| Evidencia oración expuesta | Misma privacidad evidencias retos; coach solo si reto asignado a su comunidad |
| programId comercial | Null o ID interno no comercial |

---

## 12. Almacenamiento archivos

```
/uploads/spiritual/studies/     — PDF admin upload
/uploads/spiritual/testimonies/ — media UGC moderado
/data/spiritual/imports/        — fuera webroot; solo CLI import
```

- Nombres archivo UUID; no confiar en nombre original
- Servir vía endpoint autenticado o signed URL (preferido)
- Antivirus scan: backlog V1.1 (documentar en runbook)

---

## 13. Checklist pre-deploy

- [ ] Todas rutas `/admin/*` con `requireSuperAdmin`
- [ ] Assignment check en cada endpoint read contenido
- [ ] Prayer visibility enforced server-side (no solo UI)
- [ ] Plantillas CC revisadas sin PII en email
- [ ] `food_version_final` diff vacío
- [ ] Pen test básico: IDOR assignment gym A/B
- [ ] Secrets import biblia no en repo

---

## 14. Incident response

| Severidad | Acción |
|-----------|--------|
| P0 — fuga peticiones cross-tenant | `SPIRITUAL_CENTER_ENABLED=false` + hotfix assignment |
| P1 — XSS testimonio | Desactivar testimonios flag; purge pending |
| P2 — spam oración | Ajustar rate limit |

Contacto: mismo canal incidentes MVPFOOD (SuperAdmin ops).

---

## 15. Lo que NO se implementa (seguridad)

- Cifrado E2E chat (no hay chat)
- OAuth social login adicional
- API pública anónima biblia
- Licencia comercial como control de acceso

---

*Documento de seguridad VIENTO RECIO — revisar antes de Fase 1 implementación.*
