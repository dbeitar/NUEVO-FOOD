# Manual de la Plataforma D28D GYM Virtual

**Versión:** 1.1 — Consolidación documental (Mayo 2026)
**Repositorio:** github.com/cesargomez-food/NUEVO-FOOD

---

> **Cómo leer este manual.** Este documento describe **qué hace** la plataforma y **cómo se opera** hoy. La estrategia, ICP y narrativa comercial viven en `VISION_Y_POSICIONAMIENTO_ECOSISTEMA.md`. La hoja de ruta y lo que **no** está disponible aún se describe en `ROADMAP_REALISTA_ECOSISTEMA.md`. La experiencia por rol está en `ARQUITECTURA_VISIBLE_EXPERIENCIA.md`.

> **Sobre la IA en esta plataforma.** La IA actúa como **asistencia operativa** (sugerencias nutricionales y sustituciones simples). No es un coach autónomo, no analiza biomecánica avanzada y no toma decisiones por el usuario. Si la IA falla o no está configurada, el sistema sigue funcionando con cálculos determinísticos. Ver `ROADMAP_REALISTA_ECOSISTEMA.md` para capacidades futuras.

---

## PARTE I — MANUAL DE USO Y FUNCIONES

---

### 1. Acceso a la Plataforma

| Entorno | URL |
|---------|-----|
| Frontend local | http://localhost:5175 |
| Backend local | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

**Inicio rápido:**
```bash
npm run dev:all
```
Esto levanta frontend (Vite) y backend (Express) simultáneamente.

**Credenciales de prueba:**
- Email: `demo@foodplan.com` / Password: configurado en variables de entorno
- El sistema crea usuarios demo automáticamente al arrancar

---

### 2. Pantalla de Inicio — Tus servicios

D28D Gimnasio Virtual es una **plataforma modular con un único registro**.
Un usuario hace una sola cuenta y puede tener uno o varios servicios activos
(por ejemplo: solo Food Plan, o Food Plan + Entrenamiento, o todos).

La pantalla de **Inicio** muestra siempre el saludo + las **tarjetas visuales
de los servicios que el usuario tiene activos**, con la marca de su gimnasio
arriba (white-label).

**Servicios disponibles (cada uno es un maestro independiente):**

| Servicio | Para usuario final | Para admin/coach |
|----------|--------------------|------------------|
| **Food Plan** | Mi plan nutricional, registro diario, equivalentes, recetas | Calculadora, configurar planes, maestro de alimentos, registro, equivalentes, recetas |
| **Entrenamiento** | Mi rutina del día, sustituciones asistidas | Maestro de rutinas, galería de videos, usuarios asignados |
| **D28D** | Acceso a clases en vivo de los programas Vital, Pancitas y Virtual | Programas (con sus ciclos), clases en vivo (Zoom + asistencia), galería de videos |
| **Mi gimnasio** | Información de su centro y contacto | Marca blanca: branding, equipo, usuarios, métricas básicas |

**Reglas de visibilidad de la tarjeta:**
- Si el usuario tiene `module_access` declarado, se respeta literalmente.
- Si no, se infiere por su rol (`super_admin` ve los 4; `entrenador` ve
  Entrenamiento + Food Plan; `admin_gimnasio` ve Mi gimnasio + Entrenamiento +
  Food Plan; `usuario_final` sin módulos declarados ve Food Plan + Entrenamiento).
- Si el usuario solo tiene un servicio, la pantalla simplifica el layout y
  muestra solo esa tarjeta (sin sensación de selector).

**Comportamiento al hacer clic en una tarjeta:**
- **Usuario final** → entra a su experiencia de consumo del servicio
  (Food Plan → Mi Plan; Entrenamiento → Mi Rutina; D28D → Clases; Mi gimnasio → Mi cuenta).
- **Admin / Coach** → entra al **maestro independiente** del servicio, con
  acceso solo a lo que su rol permite. Se incluye un botón “← Inicio” para
  regresar al hero.

**Navegación reducida (≤ 6 entradas):** la barra superior se adapta al rol.
El usuario final nunca ve la palabra “admin” ni accesos de gestión; el coach
ve “Mis usuarios”, “Rutinas”, “Planes”, “Seguimiento”; el admin de gym ve
“Mi marca”, “Usuarios”, “Rutinas”, “Clases”; el super_admin ve la versión
operacional global.

---

### 3. Módulo Food Plan

#### 3.1 Calculadora Nutricional
- Calcula TMB (Tasa Metabólica Basal) y TDEE según datos personales
- Genera plan de macros personalizado (calorías, proteína, carbohidratos, grasas)
- Administración de conceptos de la calculadora (solo admins)

#### 3.2 Registro Diario (Food Log)
- Registro de alimentos consumidos por fecha
- Panel de resumen del día con barras de progreso vs. plan
- Totales automáticos de macronutrientes

#### 3.3 Recetas
- Biblioteca de recetas con búsqueda
- Detalle con escalado por porciones
- Importación masiva de recetas (admin)

#### 3.4 Catálogo de Alimentos
- Búsqueda por nombre y categoría
- Paginación: `?page=1&pageSize=25`
- Estadísticas por categoría
- CRUD completo + backup manual (admin)

#### 3.5 Equivalentes Nutricionales
- Sustituciones de alimentos por restricciones o preferencias.
- Motor **determinístico** por defecto (no requiere IA). Si hay un modelo local (Ollama) configurado, se usan sugerencias asistidas como complemento opcional.

#### 3.6 Asistente Nutricional (NutritionChat)
- Chat flotante para resolver dudas de plan y armar listas de compras.
- Genera recomendaciones a partir de los alimentos del catálogo y del registro diario del usuario.
- Permite exportar el plan o la lista a PDF.
- **Alcance:** asistencia conversacional simple. No reemplaza la prescripción del nutricionista ni del coach.

---

### 4. Módulo D28D — Programas y Clases en Vivo

#### 4.1 Programas D28D
Al entrar al servicio D28D, se muestran 3 programas:

| Programa | Descripción | Color | Cuenta Zoom |
|----------|-------------|-------|-------------|
| 🌸 **Vital D28D** | Bienestar integral y salud femenina | Rosa | D28dvital@gmail.com |
| 🤰 **Pancitas Fit** | Entrenamiento para embarazo | Indigo | Pancitasfitbyd28d@gmail.com |
| 🔥 **Virtual D28D** | Transformación clásica en 28 días | Verde | D28Dzoom1@gmail.com / d28dzoom2@gmail.com |

Al hacer clic en cualquier programa, se abre el **horario de clases en vivo** filtrado por ese programa.

#### 4.2 Horario Gráfico de Clases

Vista de tipo grilla semanal (Lunes a Sábado) con 5 franjas horarias:

| Franja | Color en UI |
|--------|-------------|
| 6:20 - 7:00 am | Púrpura |
| 8:20 - 9:00 am | Verde lima |
| 9:00 - 9:40 am | Cyan |
| 6:20 - 7:00 pm | Indigo |
| 7:00 - 7:40 pm | Esmeralda |

**Funcionalidades del horario:**
- **Inscripción directa:** Botón "Inscribirme" en cada celda con clase
- **Cupos enmascarados:** Muestra "X Disponibles" empezando en 20. Al llegar a 19 inscritos, se congela en "1 Disponible" pero permite inscripciones ilimitadas
- **Entrar a Zoom:** Una vez inscrito, aparece botón "Entrar a Zoom" que registra asistencia automáticamente antes de abrir el link
- **Indicador de inscripción:** Checkmark visual cuando el usuario ya está inscrito

**Vistas alternativas:** Además del horario gráfico, hay vistas de Calendario Mensual, Semanal, Diaria y Próximas.

#### 4.3 Estructura de 13 Ciclos Anuales

Cada año se divide en **13 ciclos de 28 días** (364 días exactos):

| Ciclo | Fecha de Inicio | Nota |
|-------|----------------|------|
| Ciclo 1 | 14 Diciembre | Vacacional |
| Ciclo 2 | 12 Enero | |
| Ciclo 3 | 9 Febrero | |
| Ciclo 4 | 9 Marzo | |
| Ciclo 5 | 6 Abril | |
| Ciclo 6 | 4 Mayo | |
| **Ciclo 7** | **1 Junio** | **Inicio fechas asignadas** |
| Ciclo 8 | 29 Junio | |
| Ciclo 9 | 27 Julio | |
| Ciclo 10 | 24 Agosto | |
| Ciclo 11 | 21 Septiembre | |
| Ciclo 12 | 19 Octubre | |
| Ciclo 13 | 16 Noviembre | |

El administrador puede seleccionar el ciclo activo por programa desde el **Maestro de Programas**.

#### 4.4 Administración de Clases en Vivo (Admin)
- Crear y editar clases con título, coach, horario, link de Zoom
- Asignar clases a programas específicos
- Configurar plantillas recurrentes

#### 4.5 Maestro de Programas (Admin)
- Visualizar la estructura completa de 13 ciclos
- Editar credenciales Zoom por programa
- Seleccionar ciclo activo por programa
- Activar/desactivar programas

---

### 5. Módulo Entrenadores

| Función | Componente | Descripción |
|---------|-----------|-------------|
| Mi entrenamiento | `TrainingModule` | Vista de la rutina del usuario, prescripción por ejercicio y sustituciones asistidas. *(El seguimiento biomecánico en tiempo real está suspendido; ver Roadmap.)* |
| Maestro de Rutinas | `AdminTrainingManager` | Crear/editar plantillas de entrenamiento por usuario |
| Galería de Videos | `AdminTrainingGallery` | Videos de YouTube por ejercicio (referencia visual) |

---

### 6. Módulo Maestro Gym / Marca Blanca

- Crear y configurar gimnasios: nombre, logo, colores, slug único
- Configurar WhatsApp y mensaje de marca personalizado
- Cada gimnasio consume la plataforma D28D con su propia identidad visual
- Los usuarios se asignan a un gimnasio específico

---

### 7. Funciones Globales del Super Admin

Accesibles desde la barra de navegación superior:

| Botón | Vista | Función |
|-------|-------|---------|
| Usuarios | `AdminUsers` | Crear/editar usuarios, asignar roles y gimnasios |
| Empresas | `AdminCompanies` | Gestionar empresas y relaciones |
| Gyms | `AdminGyms` | Maestro Gym / Marca Blanca |
| Rutinas | `AdminTrainingManager` | Plantillas de entrenamiento |
| Galería | `AdminTrainingGallery` | Videos de ejercicios |
| Live | `AdminLiveClasses` | Clases en vivo y Zoom |
| Programas | `AdminProgramsManager` | Programas D28D + Ciclos |
| Planes | `AdminPlans` | Planes de suscripción |

---

### 8. Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `super_admin` | Todo. Barra rápida global, auditoría, configuración |
| `admin_d28d` | Programas D28D, clases en vivo, maestro de programas |
| `admin_gym` | Maestro Gym, empresas, usuarios, planes |
| `admin_marca` | Marca blanca, gimnasios, usuarios |
| `admin_gimnasio` | Gestión del gimnasio asignado |
| `entrenador` | Módulo entrenamiento, galería de videos |
| `nutricionista` | Food Plan, calculadora admin |
| `usuario_final` | Calculadora, food log, recetas, clases públicas, mi cuenta |

---

### 9. Mi Cuenta

- Ver y editar perfil personal
- Cambiar contraseña
- Ver rol asignado y gimnasio

---

## PARTE II — ESTRUCTURA E INFRAESTRUCTURA DEL PROYECTO

---

### 10. Arquitectura General

```
┌──────────────────────────────────────────────┐
│              FRONTEND (React + Vite)          │
│         Puerto: 5175 (desarrollo)            │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │Dashboard│ │LiveClass│ │ AdminPrograms │  │
│  │  .jsx   │ │Schedule │ │   Manager     │  │
│  └────┬────┘ └────┬────┘ └──────┬────────┘  │
│       └───────────┼─────────────┘            │
│                   │ Axios + JWT              │
└───────────────────┼──────────────────────────┘
                    │ HTTP /api/*
┌───────────────────┼──────────────────────────┐
│              BACKEND (Express)               │
│         Puerto: 3001                         │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │Controllers│ │Middleware│ │   Routes    │  │
│  │          │ │  (JWT)   │ │  /api/*     │  │
│  └────┬─────┘ └──────────┘ └─────────────┘  │
│       │                                      │
│  ┌────┴─────────────────────────────────┐    │
│  │         Models (JsonStore)           │    │
│  │  users.json  foods.json  recipes.json│    │
│  │  live_classes.json  program_settings │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

### 11. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 19 |
| Bundler | Vite | 7 |
| CSS | Tailwind CSS | 4 |
| Router | React Router | 7 |
| HTTP Client | Axios | 1.x |
| Iconos | Lucide React | — |
| Backend | Express | 5.2 |
| Auth | JWT (jsonwebtoken) | 9.x |
| Hashing | bcryptjs | 3.x |
| Persistencia DEV | JSON (JsonStore) | Custom |
| Persistencia PROD | PostgreSQL / MySQL | pg 8.x |
| IA (opcional) | Ollama | Local HTTP |
| Runtime | Node.js | 20 |
| Deploy Frontend | Vercel | SPA |
| Deploy Backend | Docker / Koyeb | Node Alpine |

---

### 12. Estructura de Carpetas

```
MVPFOOD/
├── backend/
│   ├── data/                    # JSON de persistencia (dev)
│   │   ├── users.json
│   │   ├── foods.json
│   │   ├── live_classes.json
│   │   └── program_settings.json
│   ├── src/
│   │   ├── controllers/         # Lógica de negocio
│   │   ├── middleware/          # JWT auth
│   │   ├── models/              # Modelos JsonStore
│   │   ├── routes/              # Endpoints API
│   │   └── utils/               # JsonStore, logger
│   └── server.js                # Arranque Express
│
├── src/
│   ├── components/              # 25+ componentes React
│   ├── context/                 # Auth, I18n, Toast
│   ├── services/api.js          # Axios config
│   └── utils/
│       ├── nutrition.js         # Cálculos nutricionales
│       └── cycleUtils.js        # 13 ciclos de 28 días
│
├── docs/                        # Documentación
├── scripts/                     # Utilidades y migración
└── package.json                 # Scripts: dev:all, build
```

---

### 13. Persistencia Dual

**Modo DEV (por defecto):**
- Archivos JSON en `backend/data/`
- Clase `JsonStore` con backups automáticos con timestamp
- No requiere base de datos externa

**Modo DB (producción):**
- Activar con `USE_DB_AUTH=true`
- Soporte para PostgreSQL (`pg`) o MySQL (`mysql2`)
- Configuración SSL opcional con CA
- Abstracción via `dbClient.js`

---

### 14. Autenticación y Seguridad

- **JWT** con firma `JWT_SECRET` y expiración configurable (`JWT_EXPIRES_IN`)
- Middleware en `backend/src/middleware/auth.js` valida `Authorization: Bearer <token>`
- Frontend inyecta token automáticamente via interceptor Axios
- Hashing de contraseñas con `bcryptjs`
- CORS estricto por lista blanca (`CORS_ORIGIN`)

---

### 15. API — Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/profile` | Perfil del usuario autenticado |
| GET | `/api/foods` | Listado de alimentos (paginado) |
| GET | `/api/foods/search?q=` | Búsqueda de alimentos |
| GET | `/api/foods/stats` | Estadísticas por categoría |
| GET | `/api/recipes` | Listado de recetas |
| GET | `/api/food-log/totals?fecha=` | Totales nutricionales del día |
| GET | `/api/live-classes` | Clases en vivo (filtro por program_id) |
| POST | `/api/live-classes/:id/enroll` | Inscripción a clase |
| POST | `/api/live-classes/:id/join` | Registrar asistencia (abre Zoom) |
| GET | `/api/programs` | Programas D28D |
| PUT | `/api/programs/:id` | Actualizar programa (Zoom, ciclo) |
| GET | `/api/gyms` | Listado de gimnasios |
| POST | `/api/ai/suggest` | Sugerencia IA nutricional |

---

### 16. Variables de Entorno

**Backend:**
```env
PORT=3001
CORS_ORIGIN=http://localhost:5175
USE_DB_AUTH=false
JWT_SECRET=tu_secreto_aqui
JWT_EXPIRES_IN=7d
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodplan
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

**Frontend:**
```env
VITE_API_BASE_URL=https://tu-backend.com/api
```
En local siempre usa `http://localhost:3001/api` automáticamente.

---

### 17. Despliegue

**Frontend (Vercel):**
- Build: `npm run build`
- SPA con rewrites en `vercel.json`
- Definir `VITE_API_BASE_URL` apuntando al backend

**Backend (Docker/Koyeb):**
- Imagen: `backend/Dockerfile` (Node 20 Alpine)
- Exponer `PORT=3001`
- Configurar `JWT_SECRET`, `CORS_ORIGIN` y variables de DB
- Red privada hacia la base de datos si aplica

---

### 18. Scripts Disponibles

| Comando | Ubicación | Descripción |
|---------|-----------|-------------|
| `npm run dev:all` | Raíz | Frontend + Backend en paralelo |
| `npm run build` | Raíz | Build de producción (Vite) |
| `npm run preview` | Raíz | Preview estático en puerto 10000 |
| `npm run dev` | Backend | Solo backend con nodemon |
| `npm start` | Backend | Backend en producción |

---

*Documento generado automáticamente. Para detalles de implementación, consultar `DOCUMENTO_TECNICO_FOOD_PLAN.md` en la raíz del proyecto.*
