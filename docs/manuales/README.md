# Manuales y documentación de revisión — MVPFOOD / D28D

Carpeta única para **revisar el producto** sin mezclar con PDFs, pruebas automáticas ni otros materiales en `docs/`.

**Empieza aquí:** [00_GUIA_DE_REVISION.md](./00_GUIA_DE_REVISION.md)

---

## Índice por tema

### Negocio e idea
| Archivo | Para qué sirve |
|---------|----------------|
| [VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md](./VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md) | Modelo de negocio, ICP, propuesta de valor, no-objetivos |
| [GTM_LATAM_COACHES_Y_GYMS.md](./GTM_LATAM_COACHES_Y_GYMS.md) | Go-to-market LATAM, pricing conceptual, oportunidades comerciales |
| [ECOSISTEMA_MODULAR_MARCA_BLANCA.md](./ECOSISTEMA_MODULAR_MARCA_BLANCA.md) | Módulos, marca blanca, gobernanza multi-tenant |
| [CONSOLIDACION_ESTRATEGICA_ENTREGABLE.md](./CONSOLIDACION_ESTRATEGICA_ENTREGABLE.md) | Mapa estratégico + riesgos mitigados + índice histórico |

### Funcionalidades (hoy vs futuro)
| Archivo | Para qué sirve |
|---------|----------------|
| [ROADMAP_REALISTA_ECOSISTEMA.md](./ROADMAP_REALISTA_ECOSISTEMA.md) | **Core actual** vs roadmap futuro |
| [MANUAL_PLATAFORMA_D28D.md](./MANUAL_PLATAFORMA_D28D.md) | Manual operativo: roles, pantallas, flujos |
| [ARQUITECTURA_VISIBLE_EXPERIENCIA.md](./ARQUITECTURA_VISIBLE_EXPERIENCIA.md) | Qué ve cada rol en la UI |
| [RESUMEN_MODULOS_ENTRENAMIENTO.md](./RESUMEN_MODULOS_ENTRENAMIENTO.md) | Módulo entrenamiento (alcance real) |
| [TRAINING_MODULE.md](./TRAINING_MODULE.md) | Contrato técnico API entrenamiento |

### Técnico, estructura y herramientas
| Archivo | Para qué sirve |
|---------|----------------|
| [DOCUMENTO_TECNICO_FOOD_PLAN.md](./DOCUMENTO_TECNICO_FOOD_PLAN.md) | Arquitectura, stack, estructura de carpetas, despliegue (revisar vs código) |
| [INFRAESTRUCTURA_RELACIONAL.md](./INFRAESTRUCTURA_RELACIONAL.md) | PostgreSQL + Prisma + Docker (estado actual recomendado) |
| [PRISMA_PRODUCCION.md](./PRISMA_PRODUCCION.md) | Despliegue con Prisma |
| [POSTGRES_PRODUCCION.md](./POSTGRES_PRODUCCION.md) | Postgres en producción |
| [PRODUCCION_HOY.md](./PRODUCCION_HOY.md) | Estado producción y flags de storage |

### Riesgos y calidad
| Archivo | Para qué sirve |
|---------|----------------|
| [AUDITORIA_PROFESIONALIZACION_ECOSISTEMA.md](./AUDITORIA_PROFESIONALIZACION_ECOSISTEMA.md) | Auditoría profunda (seguridad, UX, deuda) |
| [AUDITORIA_PRE_PILOTO.md](./AUDITORIA_PRE_PILOTO.md) | Bloqueantes P0/P1 antes de piloto |
| [SMOKE_TESTS_PILOTO.md](./SMOKE_TESTS_PILOTO.md) | Checklist manual de pruebas |

### Piloto, verificación y operación
| Archivo | Para qué sirve |
|---------|----------------|
| [PILOTO_ECOSISTEMA_FITNESS.md](./PILOTO_ECOSISTEMA_FITNESS.md) | Diseño del piloto controlado |
| [VERIFICACION_PRODUCCION.md](./VERIFICACION_PRODUCCION.md) | Semillas, códigos invite, usuarios de prueba |
| [FASE_2_PLAN.md](./FASE_2_PLAN.md) | Plan histórico fase 2 |

---

## Orden de lectura sugerido (revisión completa)

1. `00_GUIA_DE_REVISION.md`
2. `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md`
3. `ROADMAP_REALISTA_ECOSISTEMA.md`
4. `MANUAL_PLATAFORMA_D28D.md`
5. `DOCUMENTO_TECNICO_FOOD_PLAN.md` + `INFRAESTRUCTURA_RELACIONAL.md`
6. `AUDITORIA_PRE_PILOTO.md` o `AUDITORIA_PROFESIONALIZACION_ECOSISTEMA.md`

---

## Fuera de esta carpeta

En `docs/` (raíz) pueden quedar PDFs, presentaciones y `docs/testing/`.  
El **README del proyecto** está en la raíz del repo: `../../README.md`.
