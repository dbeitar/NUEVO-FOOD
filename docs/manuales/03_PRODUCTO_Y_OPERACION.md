# Producto y operación — D28D Gimnasio Virtual

**Documento maestro 3/5**

---

## 1. Core actual (vendible y demostrable hoy)

Usar **solo esto** en demos, propuestas y piloto.

| Área | Capacidades |
|------|-------------|
| **Coaching** | Alta de coaches, asignación de usuarios, plantillas de rutinas, logs de sesión |
| **Rutinas** | CRUD planes, editor por día/ejercicio, generador básico, sustitución, galería YouTube |
| **Food** | Calculadora TMB/TDEE, catálogo, registro diario, recetas, equivalentes, chat nutricional (IA opcional) |
| **Seguimiento** | Adherencia, resumen diario, asistencia real al entrar a Zoom |
| **White-label** | Logo, colores, mensaje, WhatsApp, slug por gym |
| **D28D / Live** | 3 programas (Vital, Pancitas, Virtual), 13 ciclos × 28 días, calendario, inscripción, Zoom por programa |
| **Roles** | super_admin, admin_*, entrenador, nutricionista, usuario_final con permisos en backend |
| **Registro** | Flujo 3 pasos + códigos invite + `module_access` por usuario |
| **Plataforma** | Frontend React + API Express + Postgres/Prisma (recomendado) o JSON (solo dev) |

---

## 2. Roadmap futuro (no vender como disponible)

- Marketplace de coaches/programas  
- IA avanzada (periodización automática, memoria conversacional)  
- Visión computacional / coach en tiempo real (código suspendido)  
- Analytics multi-marca avanzados  
- Pagos integrados, automatizaciones complejas  

**Criterio para promover a Core:** validado en piloto, documentado, sin romper arquitectura multi-tenant.

---

## 3. Experiencia por rol (inicio)

Orden fijo de tarjetas: **D28D → Plan alimentación → Entrenadores → Clases en vivo**.

| Rol | Ve en inicio |
|-----|-------------|
| super_admin | Las 4 |
| admin_d28d | D28D + Clases en vivo |
| admin_food | Solo Plan |
| admin_entrenador | Solo Entrenadores |
| admin_gimnasio | D28D + Clases en vivo |
| usuario_final | Lo definido en `module_access` |

**Gimnasios** no son tarjeta aparte: viven **dentro de D28D** (marca blanca).

---

## 4. Registro e invitaciones

1. Datos personales + contraseña (mín. 8 caracteres) + género obligatorio  
2. Código de invitación (gym / coach / D28D)  
3. Plan opcional → confirmar  

| Código ejemplo | Efecto |
|----------------|--------|
| `D28D-PILOTO` | D28D + food + training + live |
| `GYM-D28D-004` | D28D + live |
| `COACH-CARLOS-001` | training + food + live |

Los códigos se gestionan en **Maestros → Usuarios / Empresas / Gimnasios** (editables en admin).

---

## 5. Credenciales y usuarios de prueba

Contraseña semilla: **`Demo!2026`**

```bash
node scripts/seed_production_verify.cjs 'Demo!2026'
```

| Email | Uso |
|-------|-----|
| admin@d28d.local | Super admin |
| final.d28d@d28d.local | Usuario con los 4 módulos |
| final.gym@d28d.local | Solo D28D + live |
| final.coach@d28d.local | training + food + live |

---

## 6. Checklist smoke (piloto — resumen)

**Pre-vuelo:** `npm install`, `.env` completos, `npm run build`, backend health OK, semilla aplicada.

**Auth:** login por rol; rate limit tras intentos fallidos; token inválido → vuelve a login.

**Multi-tenant:** admin gym solo ve su gym; no puede asignar super_admin.

**Food:** usuario registra comida; progreso con KPIs; PDF con marca correcta.

**Training:** sin “coach virtual” en UI; sustitución sin jerga biomecánica fake.

**Live:** calendario por programa; asistencia al entrar a Zoom.

**D28D:** admin programa + clases; usuario inscribe y entra.

Lista completa de casos: ejecutar manualmente siguiendo los roles del §5 (tablas detalladas archivadas en el repo bajo `docs/testing/` si se necesitan).

---

## 7. Módulos — referencia rápida

### D28D
- Programas Vital / Pancitas / Virtual con Zoom en `.env`
- 13 ciclos de 28 días (364 días/año)
- Plantillas de clases + calendario gráfico

### Plan alimentación
- Calculadora, catálogo admin, registro diario, recetas, equivalentes
- Chat nutricional (Ollama opcional; fallback sin IA)

### Entrenamiento
- Rutinas, galería, usuarios asignados
- Realtime coach con cámara: **desactivado** (`ENABLE_REALTIME_COACH = false`)

---

## 8. Pendientes conocidos (no bloquean piloto si se documentan)

- UI para asignar `program_id` a usuarios (hoy vía seed/admin)
- Audit logs en modo JSON sin Postgres
- Documentación antigua que menciona solo JsonStore — usar doc 04 para infra actual
