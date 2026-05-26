# Negocio y mercado — D28D Gimnasio Virtual

**Documento maestro 2/5**

---

## 1. Qué es y qué no es

### Qué es

Un **sistema operativo modular** para que coaches, marcas fitness y gimnasios operen con orden, bajo **su marca**, con módulos que activan según madurez:

- entrenamiento + alimentación + clases en vivo + programas D28D,
- un solo login para el usuario final,
- separación de datos por gimnasio/marca.

### Qué no es

- No es una super app tipo “todo en uno” genérica.
- No es un marketplace (roadmap futuro).
- No es un producto de IA protagonista.
- No compite feature-a-feature con Trainerize, Mindbody o MyFitnessPal.

---

## 2. Problema que resuelve

En LATAM, coaches y gimnasios boutique operan con WhatsApp, Excel, PDFs y herramientas globales que:

- no integran plan + clase + alimentación + seguimiento,
- no muestran la marca del coach al usuario,
- se sienten caras o complejas.

**Propuesta de valor:**

> *“Tu plataforma de coaching, con tu marca, lista para operar.”*

Tres pilares: operación humana ordenada · marca blanca real · modularidad progresiva.

---

## 3. Para quién (ICP)

| Prioridad | Perfil | Tamaño típico |
|-----------|--------|----------------|
| **Principal** | Coach / pequeña marca fitness | 30–300 usuarios |
| **Secundario** | Gimnasio o estudio boutique | 100–2.000 usuarios |
| **Terciario** | Programa formativo / franquicia (D28D) | 500+ usuarios |

Fuera de estos tres perfiles → **fuera de alcance** en esta etapa.

---

## 4. Módulos y gobernanza

| Módulo | Marca blanca | Contenido D28D bloqueado |
|--------|--------------|---------------------------|
| Gym / marca | Sí | — |
| D28D | Sí | Plantillas y clases no editables por el gym |
| Entrenamiento | Sí | — |
| Alimentación | Sí | — |
| Clases en vivo | Sí | Puede usar plantillas D28D |

**Roles clave:** `super_admin`, `admin_d28d`, `admin_food`, `admin_entrenador`, `admin_gimnasio`, `entrenador`, `nutricionista`, `usuario_final`.

**Principio:** ningún rol ve datos de otra marca por defecto (`gym_id` en JWT).

---

## 5. Go-to-market LATAM

- Foco **Colombia y México** primero; español neutro.
- Onboarding **humano** en piloto (no self-serve enterprise).
- WhatsApp como canal natural con marcas.
- Comunidad de coaches → referidos y casos de éxito.
- **Cero promesas** de features del roadmap futuro en ventas.

### Pricing conceptual (interno, no público)

| Tier | Audiencia | Idea |
|------|-----------|------|
| Starter | Coach solo | Marca propia, ~50 usuarios |
| Pro | Gym boutique | Multi-coach, branding completo |
| Brand | Franquicia / D28D | Plantillas bloqueadas, soporte dedicado |

Sin onboarding fee en piloto. Plan anual con descuento. Precios finales tras datos del piloto.

### Comunicación comercial

**Sí decir:** “Tu plataforma con tu marca”, “operación diaria unificada”, “módulos que activas cuando creces”.

**No decir:** “IA avanzada”, “coach virtual con cámara”, “ERP fitness enterprise”, “reemplaza a X competidor”.

---

## 6. Piloto controlado

**Objetivo:** validar operación humana real antes de escalar GTM.

| Métrica mínima | Meta |
|----------------|------|
| Coach opera 2 semanas sin volver a Excel | Sí |
| Usuario final entiende su plan del día | Sí |
| Clase en vivo con asistencia registrada | Sí |
| Admin gym configura marca blanca | Sí |

**Reglas:** no escalar comercial si fallan ≥2 métricas; no prometer roadmap como Core.

Detalle operativo del piloto: ver checklist en [03_PRODUCTO_Y_OPERACION.md](./03_PRODUCTO_Y_OPERACION.md).

---

## 7. Oportunidades

1. **LATAM coaches boutique** — idioma, cultura y precio local vs SaaS global.
2. **Marca blanca real** — el usuario ve al coach, no al software.
3. **D28D como ancla** — programas + gimnasios + clases en un solo ecosistema.
4. **Modularidad** — empezar con food o training y crecer sin migración dolorosa.
5. **Registro por código invite** — onboarding alineado con coach/gym (B2B2C limpio).

---

## 8. Narrativa eliminada (no volver a vender)

- Coach virtual con visión por computadora **como producto hoy** (suspendido en código).
- IA biomecánica avanzada como protagonista.
- “Super app fitness con todo integrado”.
- Paridad con apps globales.

Todo lo anterior vive en **roadmap futuro** → [03](./03_PRODUCTO_Y_OPERACION.md) y [05](./05_RIESGOS_Y_AUDITORIA.md).
