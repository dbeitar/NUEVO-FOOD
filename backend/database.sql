CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50),
  fecha_nacimiento DATE,
  peso DECIMAL(10, 2),
  altura DECIMAL(10, 2),
  porcentaje_grasa DECIMAL(10, 2),
  objetivo VARCHAR(100),
  clave_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario_final',
  roles JSONB DEFAULT '[]',
  permissions JSONB DEFAULT '[]',
  module_access JSONB DEFAULT '{}',
  nivel_actividad DECIMAL(5, 3),
  tiene_restricciones BOOLEAN DEFAULT FALSE,
  restricciones_detalles TEXT,
  genero VARCHAR(20),
  id_entrenador INTEGER,
  id_gimnasio INTEGER,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol);

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

CREATE TABLE IF NOT EXISTS food_items (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  categoria VARCHAR(100),
  marca VARCHAR(100),
  cantidad DECIMAL(10, 2),
  unidad VARCHAR(50),
  calorias DECIMAL(10, 2),
  proteina DECIMAL(10, 2),
  carbohidratos DECIMAL(10, 2),
  grasas DECIMAL(10, 2),
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode);
CREATE INDEX IF NOT EXISTS idx_food_items_nombre ON food_items(nombre);
CREATE INDEX IF NOT EXISTS idx_food_items_categoria ON food_items(categoria);

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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol);
CREATE INDEX IF NOT EXISTS idx_daily_logs_usuario_fecha ON daily_logs(id_usuario, fecha);
CREATE INDEX IF NOT EXISTS idx_notifications_usuario ON notifications(id_usuario);

-- ==== MÓDULO DE ENTRENAMIENTO ====
ALTER TABLE users ADD COLUMN IF NOT EXISTS medidas_biomecanicas JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experiencia VARCHAR(50) DEFAULT 'principiante';
ALTER TABLE users ADD COLUMN IF NOT EXISTS metodo_entrenamiento VARCHAR(100);

-- Planes de Rutinas de Entrenamiento
CREATE TABLE IF NOT EXISTS training_routines (
  id SERIAL PRIMARY KEY,
  id_usuario INTEGER REFERENCES users(id),
  id_entrenador INTEGER REFERENCES users(id),
  metodo VARCHAR(100),
  objetivo VARCHAR(100),
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  dias_entrenamiento INTEGER,
  notas_entrenador TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Días individuales dentro de un plan (ej: Día 1 - Pecho y Triceps)
CREATE TABLE IF NOT EXISTS routine_days (
  id SERIAL PRIMARY KEY,
  id_rutina INTEGER REFERENCES training_routines(id) ON DELETE CASCADE,
  dia_numero INTEGER,
  nombre_dia VARCHAR(100),
  grupo_muscular_principal VARCHAR(100),
  completado BOOLEAN DEFAULT FALSE,
  fecha_completado DATE,
  feedback_usuario TEXT
);

-- Ejercicios específicos para un día
CREATE TABLE IF NOT EXISTS routine_exercises (
  id SERIAL PRIMARY KEY,
  id_routine_day INTEGER REFERENCES routine_days(id) ON DELETE CASCADE,
  orden INTEGER,
  nombre_ejercicio VARCHAR(255),
  series INTEGER,
  repeticiones VARCHAR(50),
  tiempo_descanso VARCHAR(50),
  peso_sugerido VARCHAR(50),
  peso_usado VARCHAR(50),
  modificado_por_ia BOOLEAN DEFAULT FALSE,
  sustitucion_id_original INTEGER,
  notas TEXT
);

-- Galería de Videos de Entrenamiento (YouTube)
CREATE TABLE IF NOT EXISTS exercises_gallery (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  muscle_group VARCHAR(100),
  youtube_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Planes de Suscripción (SaaS)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  precio_mensual DECIMAL(12, 2) NOT NULL,
  features JSONB DEFAULT '[]',
  max_usuarios INTEGER DEFAULT 0,
  usuarios_activos INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Suscripciones de Usuarios
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan_nombre VARCHAR(100) REFERENCES subscription_plans(nombre),
  gym_id INTEGER,
  trainer_id INTEGER,
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento TIMESTAMP,
  estado VARCHAR(50) DEFAULT 'activo',
  sesiones_restantes INTEGER DEFAULT 0,
  sesiones_totales INTEGER DEFAULT 0,
  precio_mensual DECIMAL(12, 2),
  metodo_pago VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(estado);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  plan_nombre VARCHAR(100),
  amount_cents INTEGER,
  currency VARCHAR(10) DEFAULT 'COP',
  status VARCHAR(50) DEFAULT 'pendiente',
  trace_id VARCHAR(100),
  gym_id INTEGER,
  trainer_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_trace ON payments(trace_id);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Tabla para Logging y Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER, -- Puede ser null para eventos públicos
  level VARCHAR(20), -- INFO, WARN, ERROR
  event VARCHAR(255),
  trace_id VARCHAR(100),
  metadata JSONB, -- IP, navegador, detalles del error
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_trace ON audit_logs(trace_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Semillas para Planes de Suscripción
INSERT INTO subscription_plans (nombre, descripcion, precio_mensual, features, max_usuarios, usuarios_activos)
VALUES 
  ('basico', 'Acceso a calculadora y food log', 99000, '["Calculadora Nutricional", "Food Log", "Historial de alimentos"]', 1000, 0),
  ('premium', 'Acceso completo + entrenador personal', 299000, '["Todos del plan básico", "Entrenador personal", "Recomendaciones IA", "2 sesiones/semana"]', 500, 0),
  ('elite', 'Plan completo personalizado', 499000, '["Todos del plan premium", "Nutricionista incluido", "4 sesiones/semana", "Análisis corporal"]', 100, 0)
ON CONFLICT (nombre) DO NOTHING;
