# 🚀 Backend Food Plan

Backend del proyecto Food Plan construido con Node.js + Express + PostgreSQL

## 📋 Configuración Inicial

### 1. Instalar PostgreSQL
```bash
# macOS con Homebrew
brew install postgresql
brew services start postgresql

# Verificar instalación
psql --version
```

### 2. Crear Base de Datos
```bash
# Acceder a PostgreSQL
psql -U postgres

# En la terminal de psql, ejecutar:
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

### 3. Crear Tablas
```bash
# Desde la carpeta backend
psql -U foodplan_user -d foodplan_db -f database.sql
```

### 4. Configurar Variables de Entorno
Editar `.env` con tus credenciales:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodplan_db
DB_USER=foodplan_user
DB_PASSWORD=foodplan_password
JWT_SECRET=your_super_secret_key
```

## 🚀 Ejecutar el Servidor

```bash
# Instalar dependencias (ya hecho)
npm install

# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: **http://localhost:5000**

## 📡 Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/profile` - Obtener perfil (requiere token)

### Health Check
- `GET /api/health` - Verificar que el servidor está activo

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/       # Configuración (base de datos)
│   ├── controllers/  # Lógica de negocio
│   ├── middleware/   # Middleware (auth, etc)
│   ├── models/       # Modelos de datos
│   └── routes/       # Rutas de API
├── server.js         # Entrada principal
├── database.sql      # Script de base de datos
├── package.json
└── .env              # Variables de entorno
```

## 🔧 Próximos Pasos

1. ✅ Backend inicial creado
2. 🔄 Integrar con Frontend React
3. 🔄 Crear Módulo 2: Maestros y Administración
4. 🔄 Implementar Calculadora Nutricional
5. 🔄 Agregar Food Log y estadísticas
