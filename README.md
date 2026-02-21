# 🍽️ Food Plan - Plataforma de Gestión Nutricional

Aplicación Web Progresiva (PWA) para gestionar planes de alimentación personalizados con inteligencia artificial.

## 📁 Estructura del Proyecto

```
PROYECTOFOOD PLAN/
├── src/                    # Frontend (React)
│   ├── components/         # Componentes React
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   └── Auth.css
│   ├── context/            # Context API para estado global
│   │   └── AuthContext.jsx
│   ├── services/           # Servicios de API
│   │   └── api.js
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── backend/                # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Configuración (base de datos)
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── middleware/     # Middleware (autenticación)
│   │   ├── models/         # Modelos de datos
│   │   └── routes/         # Rutas de API
│   ├── server.js
│   ├── database.sql
│   ├── .env
│   └── package.json
├── .git/                   # Repositorio Git
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🚀 Configuración Inicial

### Paso 1: Instalar PostgreSQL

```bash
# macOS con Homebrew
brew install postgresql
brew services start postgresql
```

### Paso 2: Crear Base de Datos

```bash
psql -U postgres

# En la terminal psql:
CREATE DATABASE foodplan_db;
CREATE USER foodplan_user WITH PASSWORD 'foodplan_password';
ALTER ROLE foodplan_user SET client_encoding TO 'utf8';
ALTER ROLE foodplan_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE foodplan_user SET default_transaction_deferrable TO on;
ALTER ROLE foodplan_user SET default_transaction_read_only TO off;
ALTER ROLE foodplan_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE foodplan_db TO foodplan_user;
\connect foodplan_db
GRANT ALL PRIVILEGES ON SCHEMA public TO foodplan_user;
\q
```

### Paso 3: Crear Tablas

```bash
psql -U foodplan_user -d foodplan_db -f backend/database.sql
```

## 🔧 Ejecutar el Proyecto

### Terminal 1: Backend (Puerto 5000)

```bash
cd backend
npm install  # Solo la primera vez
npm run dev
```

### Terminal 2: Frontend (Puerto 5173)

```bash
npm install  # Solo la primera vez
npm run dev
```

El servidor estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## 📊 Funcionalidades Implementadas (Fase 1)

### ✅ Módulo 1: Autenticación y Registro
- Sistema de registro con formulario
- Login con JWT
- Gestión de sesiones
- Perfil de usuario

### 🔄 Próximas Fases

- [ ] Módulo 2: Maestros y Administración
- [ ] Módulo 3: Calculadora Nutricional
- [ ] Módulo 4: Food Log y Banco de Alimentos
- [ ] Módulo 5: Estadísticas y Dashboards
- [ ] Módulo 6: IA para Sustituciones
- [ ] Módulo 7: Biblioteca de Recetas

## 🔑 Variables de Entorno

**Backend (.env)**
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodplan_db
DB_USER=foodplan_user
DB_PASSWORD=foodplan_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere token)

### Health Check
- `GET /api/health` - Verificar estado del servidor

## 🎨 Tecnologías Utilizadas

### Frontend
- React.js
- Vite
- Axios
- Context API

### Backend
- Node.js
- Express
- PostgreSQL
- JWT
- bcryptjs

## 📝 Notas Importantes

1. Asegúrate de que PostgreSQL esté ejecutándose
2. Las contraseñas son hasheadas con bcryptjs
3. Los tokens JWT expiran en 7 días (configurable)
4. El CORS está configurado para http://localhost:5173

## 🐛 Troubleshooting

**Error: connect ECONNREFUSED**
- PostgreSQL no está ejecutándose
- Solución: `brew services start postgresql`

**Error: Port already in use**
- Puerto 5000 o 5173 en uso
- Solución: Cambiar puerto en `.env` o `vite.config.js`

**Error: Database does not exist**
- Base de datos no fue creada
- Solución: Ejecutar los pasos de configuración inicial

## 📧 Contacto y Soporte

Para preguntas o reportar problemas, abre un issue en el repositorio.

---

**Última actualización**: 20 de Febrero de 2026
