# VIENTO RECIO V1.1 — Roadmap (solo documentación)

**Estado:** NO implementar en V1  
**Sin tablas, APIs ni frontend** para estos componentes hasta aprobación post-piloto V1

---

## Clasificación

| Componente | Prioridad | Esfuerzo | Dependencias | Impacto |
|------------|-----------|----------|--------------|---------|
| Peticiones de oración | **ALTO** | 2–3 semanas | V1 estable, privacy model | Comunidad, acompañamiento personal |
| Retos espirituales (motor D28D) | **ALTO** | 1–2 semanas | `d28dChallengeService`, `reglas.kind=spiritual` | Adherencia hábitos espirituales |
| Testimonios (UGC moderado) | **MEDIO** | 2 semanas | Upload media, moderación admin | Comunidad, inspiración |
| Seguimiento espiritual / adherencia | **MEDIO** | 2–3 semanas | Audit V1, dashboard analytics | Retención, insights SuperAdmin |
| Comunidad avanzada | **BAJO** | 4+ semanas | Oración + testimonios | Interacción (sin red social) |
| Búsqueda biblia full-text (pg_trgm) | **BAJO** | 3–5 días | Biblia completa importada | UX lectura |
| Segunda versión biblia (NVI) | **BAJO** | 1 semana | Importador V1, licencia texto | Preferencia usuarios |
| Coach panel peticiones `leaders_only` | **MEDIO** | 1 semana | Peticiones oración | Coaches fortalecen comunidad |
| Reportes gym agregados eventos | **BAJO** | 1–2 semanas | Eventos V1 | Valor sede |

---

## Detalle por componente

### Peticiones de oración — ALTO

**Incluye:** crear petición, actualizar estado, marcar respuesta, comentarios staff  
**Tablas propuestas:** `spiritual_prayer_requests`, `spiritual_prayer_comments`  
**Evento CC:** `prayer.request.created`  
**Privacidad:** visibility `private` | `community` | `leaders_only`  
**Esfuerzo:** 2–3 semanas (backend + widget + admin)

### Retos espirituales — ALTO

**Reutiliza:** `D28dChallenge` con `reglas: { kind: "spiritual", spiritual_type: "prayer|reading|gratitude|fasting" }`  
**Sin motor nuevo**  
**UI:** widget separado de retos fitness D28D  
**Eventos:** `challenge.started`, `challenge.completed`  
**Esfuerzo:** 1–2 semanas

### Testimonios — MEDIO

**Tipos:** video, audio, imagen, texto  
**Moderación:** pending → approved/rejected  
**Asignación:** por comunidad (gym/trainer)  
**Esfuerzo:** 2 semanas

### Seguimiento espiritual — MEDIO

**Métricas:** devocionales completados, lecturas, eventos, adherencia  
**Dashboard SuperAdmin + opcional gym  
**Esfuerzo:** 2–3 semanas

### Comunidad avanzada — BAJO

**Incluye:** interacción guiada, acompañamiento, participación  
**Excluye explícitamente:** red social, chat grupal, amigos  
**Esfuerzo:** 4+ semanas — evaluar tras V1.1 core

---

## Criterios para iniciar V1.1

- [ ] V1 en producción ≥ 2 semanas sin incidentes P0/P1
- [ ] ≥ 40% cohorte piloto interactúa con widget «Hoy»
- [ ] Biblia completa importada
- [ ] SuperAdmin confirma prioridad oración vs retos

---

## Orden recomendado V1.1

1. Peticiones de oración  
2. Retos espirituales (puente D28D)  
3. Testimonios  
4. Seguimiento espiritual  
5. Comunidad avanzada (fase exploratoria)

---

*Roadmap V1.1 — documentación únicamente, sin implementación.*
