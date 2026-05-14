# Arquitectura Visible — Experiencia por Rol

**Versión:** 1.0
**Audiencia:** Diseño, producto, frontend, coaches piloto
**Relación:** consume las decisiones de `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md` y `ECOSISTEMA_MODULAR_MARCA_BLANCA.md`

---

## 1. Para qué sirve este documento

Define **cómo se siente el producto** para cada rol, no cómo está construido por dentro.
Es la guía que cualquier diseño, copy o decisión de UX debe respetar para que la plataforma se sienta *humana, simple y operativa* (no como un ERP fitness).

Tres roles principales en producto:

1. **Usuario final** (quien entrena y/o se alimenta).
2. **Coach / Entrenador** (quien acompaña a usuarios).
3. **Gym / Marca** (quien opera con su identidad).

Existen otros roles administrativos (super_admin, admin_d28d, nutricionista) que se derivan del rol Coach o del rol Gym/Marca.

---

## 2. Principios de experiencia (transversales)

- **Una sola plataforma por fuera.** El usuario no debería percibir que hay módulos. Debería percibir que hay *su plan, sus clases, su coach*.
- **Marca del cliente siempre arriba.** El logo y los colores que ve el usuario final son los del coach o gym, no los nuestros.
- **Pantallas con propósito único.** Cada vista responde a una pregunta clara (“¿qué hago hoy?”, “¿cómo voy?”, “¿qué viene esta semana?”).
- **Lenguaje humano.** Nada de “endpoints”, “tracking_logic” o “DTOs” en pantallas de usuario.
- **Estado siempre visible.** Si algo cargó, falló, está pendiente o vacío, hay que decirlo en lenguaje plano.
- **IA invisible.** Cuando exista asistencia inteligente, se muestra como una sugerencia, no como una alerta tecnológica.

---

## 3. Usuario Final

### 3.1 Cómo debe sentirse

> *“Sé qué hacer hoy, sé cómo voy, y siento que mi coach está cerca.”*

Acompañado, guiado, simple, progresivo.
**No** debe sentir un panel técnico ni un ERP fitness.

### 3.2 Experiencia unificada propuesta: **Mi Plan / Mi Progreso**

Toda su vida en una sola navegación, no en módulos sueltos:

| Sección visible | Qué reúne hoy | Pregunta que responde |
| --- | --- | --- |
| **Inicio** | Saludo, marca del coach/gym, “qué tengo hoy” | ¿Qué hago hoy? |
| **Mi Plan** | Rutina del día + plan alimenticio + clases en vivo del día | ¿Qué tengo asignado? |
| **Mi Progreso** | Adherencia, registros, cumplimiento de metas | ¿Cómo voy? |
| **Clases** | Calendario en vivo + grabadas | ¿Cuándo y cómo entro? |
| **Mensajes / Coach** | Canal directo (WhatsApp del gym/coach) | ¿Cómo le pregunto a mi coach? |
| **Mi cuenta** | Perfil, restricciones, contacto | Mis datos básicos |

### 3.3 Reglas duras del usuario final

- **Nunca** ver la palabra “admin” o pantallas de gestión.
- **Nunca** elegir entre módulos (no debe saber que existen módulos).
- **Nunca** ser obligado a configurar antes de poder hacer algo (defaults sensatos).
- **Siempre** poder llegar a su coach en 1 clic (botón persistente de WhatsApp).
- **Siempre** ver su progreso del día en el primer pantallazo.

### 3.4 Lo que NO va en la experiencia del usuario final

- Calculadora avanzada de macros como pantalla principal.
- Análisis biomecánico ni cámara en tiempo real (suspendido).
- Selectores técnicos (RPE/RIR detallado en primera vista, métodos de entrenamiento, modelos de IA, etc.). Estos quedan en pantallas internas y *progressive disclosure*.

---

## 4. Coach / Entrenador

### 4.1 Cómo debe sentirse

> *“Veo a mis usuarios, sé quién está bien y quién no, y puedo actuar rápido.”*

Es un **panel operacional**, no un dashboard analítico.

### 4.2 Prioridades de su panel

| Prioridad | Descripción |
| --- | --- |
| **Seguimiento** | ¿Quién entrenó esta semana? ¿Quién falló? ¿Quién mejoró? |
| **Adherencia** | Indicadores simples por usuario (verde / amarillo / rojo). |
| **Asignación** | Asignar plan, ajustar, sustituir ejercicios sin fricción. |
| **Reutilización** | Plantillas reutilizables (rutinas, planes alimenticios, mensajes). |
| **Conversación** | Acceso al canal del usuario (WhatsApp / mensajes). |
| **Progreso** | Vista clara por usuario (no necesariamente analítica). |

### 4.3 Reglas duras del coach

- **Una sola lista de “Mis usuarios”** como puerta principal.
- **Acción rápida** sobre cada usuario en 1–2 clics (asignar plan, abrir chat, ver progreso).
- **Sin overhead administrativo.** Nada de gestionar gimnasios, planes de suscripción ni branding (eso es Gym/Marca).
- **Plantillas siempre a mano** para no rehacer trabajo.
- **Datos suficientes, no exhaustivos.** Mostrar lo que permite decidir, no todo lo que el sistema sabe.

### 4.4 Lo que NO va en la experiencia del coach

- Configuración de marca blanca (logo, colores, dominio).
- Reportes financieros del gimnasio.
- Configuración de roles del sistema.
- Auditoría de logs.

---

## 5. Gym / Marca

### 5.1 Cómo debe sentirse

> *“Tengo mi marca corriendo, mis coaches operando y veo cómo va el negocio en simple.”*

**Operacional**, no enterprise.

### 5.2 Prioridades de su panel

| Prioridad | Descripción |
| --- | --- |
| **Branding** | Logo, colores, mensaje y WhatsApp configurables. |
| **Coaches** | Alta/baja de coaches, asignación de usuarios. |
| **Usuarios** | Vista global con filtros simples (activos, inactivos, por coach). |
| **Métricas simples** | Cuántos activos, adherencia agregada, clases del mes. |
| **Control básico** | Pausar/activar marca, ver plan contratado, soporte. |

### 5.3 Reglas duras del Gym/Marca

- **Branding en una sola pantalla**, sin saltos.
- **Métricas a nivel de marca**, no a nivel ejercicio. Si quiere bajar al detalle, navega a un usuario específico.
- **No hay BI complejo** en esta etapa. Tres números bien presentados > dashboards densos.
- **Separación visible** entre lo que es contenido **propio** (rutinas del coach) y lo que es contenido **bloqueado** (plantillas D28D).

### 5.4 Lo que NO va en la experiencia del Gym/Marca

- Edición de plantillas D28D (bloqueadas; ver `ECOSISTEMA_MODULAR_MARCA_BLANCA.md`).
- Acceso al backend de otras marcas.
- Configuración de modelos de IA.
- Gestión de infraestructura (despliegues, claves, secretos).

---

## 6. Roles administrativos (vista corta)

| Rol | Vive como extensión de | Puede |
| --- | --- | --- |
| `super_admin` | Equipo plataforma | Todo, incluido gobierno multi-marca y auditoría. |
| `admin_d28d` | Dueño del método D28D | Editar plantillas, clases y ciclos D28D. |
| `admin_marca` / `admin_gym` | Gym/Marca | Gestionar su propia marca, coaches y usuarios. |
| `admin_gimnasio` | Operación del local | Asignar usuarios a coaches y monitorear adherencia. |
| `nutricionista` | Coach especializado | Planes alimenticios y catálogos. |

Cada uno **solo ve lo suyo**. Nadie ve datos de otra marca por defecto.

---

## 7. Cómo se aplica esto al producto actual

- `Dashboard.jsx` → debe converger hacia **Inicio + Mi Plan + Mi Progreso** para usuario final.
- Pantallas que hoy se ven “admin” en producción no deben aparecer al usuario final, ni siquiera deshabilitadas.
- Cualquier copy que diga “endpoint”, “controller”, “tracking”, “module” se reemplaza por lenguaje humano antes de salir a piloto.
- El componente `TrainingRealtimeCoach` permanece **oculto** (feature flag) y la copy del módulo no debe mencionarlo en pantallas de usuario.

---

## 8. Criterios de aceptación visual (mínimos)

Una pantalla está “lista” cuando cumple **todo** lo siguiente:

1. Un coach puede explicarla a un cliente nuevo en menos de 30 segundos.
2. No usa términos técnicos en lenguaje visible.
3. Muestra la marca del cliente, no la nuestra.
4. Si está vacía, dice qué hacer (no aparece en blanco).
5. Si falla, muestra un mensaje humano y una acción siguiente.
6. No exige scroll para ver “qué hago hoy”.

---

## 9. Lo que este documento NO hace

- No define paleta de colores, tipografías o componentes específicos. Eso vive en el sistema de diseño (futuro).
- No reemplaza al backlog de UX. Es la **constitución** que ese backlog debe respetar.
