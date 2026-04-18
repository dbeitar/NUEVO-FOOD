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
  categoria VARCHAR(50),
  calorias DECIMAL(7, 2),
  proteinas DECIMAL(7, 2),
  carbohidratos DECIMAL(7, 2),
  grasas DECIMAL(7, 2),
  codigo_barras VARCHAR(50),
  marca VARCHAR(100),
  cantidad DECIMAL(7, 2),
  unidad VARCHAR(30),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas nuevas si la tabla ya existe
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS cantidad DECIMAL(7, 2);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS unidad VARCHAR(30);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
ALTER TABLE food_items ALTER COLUMN codigo_barras TYPE VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_food_items_nombre ON food_items(nombre);
CREATE INDEX IF NOT EXISTS idx_food_items_categoria ON food_items(categoria);

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
  codigo VARCHAR(50),
  descripcion TEXT,
  instrucciones TEXT,
  url_video VARCHAR(500),
  ingredientes_json JSONB,
  nutricion_json JSONB,
  tiempo_preparacion VARCHAR(50),
  dificultad VARCHAR(50),
  tags JSONB,
  imagen VARCHAR(500),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar columnas nuevas si la tabla ya existe
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS codigo VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tiempo_preparacion VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dificultad VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS imagen VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_recipes_titulo ON recipes(titulo);
CREATE INDEX IF NOT EXISTS idx_recipes_codigo ON recipes(codigo);

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
