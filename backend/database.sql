-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  peso DECIMAL(5, 2),
  altura DECIMAL(5, 2),
  porcentaje_grasa DECIMAL(5, 2),
  objetivo VARCHAR(100),
  clave_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario_final',
  id_entrenador INTEGER,
  id_gimnasio INTEGER,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Gimnasios
CREATE TABLE IF NOT EXISTS gyms (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  direccion VARCHAR(500),
  telefono VARCHAR(20),
  email VARCHAR(255),
  plan_contratado VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Entrenadores
CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  id_gimnasio INTEGER REFERENCES gyms(id),
  especialidad VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Planes de Alimentación
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  duracion INTEGER,
  objetivos VARCHAR(500),
  creado_por INTEGER REFERENCES users(id),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Planes Asignados a Usuarios
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  id_plan INTEGER REFERENCES plans(id),
  id_usuario INTEGER REFERENCES users(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  calorias_diarias DECIMAL(7, 2),
  proteinas DECIMAL(7, 2),
  carbohidratos DECIMAL(7, 2),
  grasas DECIMAL(7, 2),
  configuracion_calculadora JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Alimentos
CREATE TABLE IF NOT EXISTS food_items (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  porcion VARCHAR(100),
  calorias DECIMAL(7, 2),
  proteinas DECIMAL(7, 2),
  carbohidratos DECIMAL(7, 2),
  grasas DECIMAL(7, 2),
  codigo_barras VARCHAR(20),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Registro Diario de Comidas
CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES users(id),
  fecha DATE NOT NULL,
  comida VARCHAR(100),
  calorias_consumidas DECIMAL(7, 2),
  proteinas DECIMAL(7, 2),
  carbohidratos DECIMAL(7, 2),
  grasas DECIMAL(7, 2),
  peso_del_dia DECIMAL(5, 2),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Recetas
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  instrucciones TEXT,
  url_video VARCHAR(500),
  ingredientes_json JSONB,
  nutricion_json JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES users(id),
  tipo VARCHAR(100),
  mensaje TEXT,
  leida BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Grupos
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  creado_por INTEGER REFERENCES users(id),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Miembros del Grupo
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  id_grupo INTEGER REFERENCES groups(id),
  id_usuario INTEGER REFERENCES users(id),
  UNIQUE(id_grupo, id_usuario)
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rol ON users(rol);
CREATE INDEX idx_daily_logs_usuario_fecha ON daily_logs(id_usuario, fecha);
CREATE INDEX idx_notifications_usuario ON notifications(id_usuario);
