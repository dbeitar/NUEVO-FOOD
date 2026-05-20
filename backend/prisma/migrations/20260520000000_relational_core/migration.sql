-- Modelo relacional MVPFOOD (reemplaza json_collections como fuente principal)

CREATE TABLE IF NOT EXISTS "gyms" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "pais" TEXT DEFAULT 'Colombia',
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "capacidad_usuarios" INTEGER DEFAULT 50,
    "logo_url" TEXT,
    "brand_name" TEXT,
    "brand_slug" TEXT,
    "white_label_enabled" BOOLEAN NOT NULL DEFAULT false,
    "welcome_message" TEXT,
    "support_whatsapp" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan_id" TEXT,
    "invite_code" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gyms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "gyms_invite_code_key" ON "gyms"("invite_code");

CREATE TABLE IF NOT EXISTS "trainers" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "especialidad" TEXT,
    "certificaciones" JSONB NOT NULL DEFAULT '[]',
    "experiencia_anos" INTEGER,
    "gym_id" INTEGER,
    "horario_disponible" TEXT,
    "tarifa_sesion" INTEGER,
    "capacidad_usuarios" INTEGER DEFAULT 50,
    "plan_id" TEXT,
    "invite_code" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainers_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "trainers_email_key" ON "trainers"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "trainers_invite_code_key" ON "trainers"("invite_code");

CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha_nacimiento" DATE,
    "peso" DECIMAL(10,2),
    "altura" DECIMAL(10,2),
    "objetivo" TEXT,
    "clave_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'usuario_final',
    "roles" JSONB NOT NULL DEFAULT '[]',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "module_access" JSONB NOT NULL DEFAULT '{}',
    "genero" TEXT,
    "tiene_restricciones" BOOLEAN NOT NULL DEFAULT false,
    "restricciones_detalles" TEXT,
    "medidas_biomecanicas" JSONB,
    "experiencia" TEXT DEFAULT 'principiante',
    "metodo_entrenamiento" TEXT,
    "gym_id" INTEGER,
    "trainer_id" INTEGER,
    "plan_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "cycles" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" VARCHAR(10) NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "program_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "active_cycle_id" INTEGER NOT NULL DEFAULT 1,
    "zoom_email" TEXT,
    "zoom_accounts" JSONB,
    CONSTRAINT "program_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "nombre" TEXT NOT NULL,
    "program_id" TEXT NOT NULL DEFAULT 'virtual_d28d',
    "descripcion" TEXT,
    "precio_mensual" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '[]',
    "max_usuarios" INTEGER NOT NULL DEFAULT 0,
    "usuarios_activos" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("nombre")
);

CREATE TABLE IF NOT EXISTS "user_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_nombre" TEXT NOT NULL,
    "gym_id" INTEGER,
    "trainer_id" INTEGER,
    "fecha_inicio" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMPTZ(3),
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "sesiones_restantes" INTEGER NOT NULL DEFAULT 0,
    "sesiones_totales" INTEGER NOT NULL DEFAULT 0,
    "precio_mensual" INTEGER NOT NULL DEFAULT 0,
    "metodo_pago" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_accounts_plan_nombre_fkey" FOREIGN KEY ("plan_nombre") REFERENCES "subscription_plans"("nombre") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "live_classes" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "zoom_link" TEXT,
    "gym_id" INTEGER,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "day_label" TEXT,
    "program_id" TEXT,
    "class_type" TEXT,
    "coach" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "enrolled_user_ids" JSONB NOT NULL DEFAULT '[]',
    "attendance_user_ids" JSONB NOT NULL DEFAULT '[]',
    "attendance_events" JSONB NOT NULL DEFAULT '[]',
    "source_module" TEXT NOT NULL DEFAULT 'd28d',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMPTZ(3) NOT NULL,
    "end_time" TIMESTAMPTZ(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "live_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "food_items" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "barcode" TEXT,
    "categoria" TEXT,
    "marca" TEXT,
    "cantidad" DECIMAL(10,2),
    "unidad" TEXT,
    "calorias" DECIMAL(10,2),
    "proteina" DECIMAL(10,2),
    "carbohidratos" DECIMAL(10,2),
    "grasas" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "food_items_barcode_key" ON "food_items"("barcode");

CREATE TABLE IF NOT EXISTS "user_plans" (
    "user_id" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "domain_documents" (
    "id" SERIAL NOT NULL,
    "collection" VARCHAR(64) NOT NULL,
    "doc_key" VARCHAR(128) NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "domain_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "domain_documents_collection_doc_key_key" ON "domain_documents"("collection", "doc_key");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "level" VARCHAR(20),
    "event" VARCHAR(255),
    "trace_id" VARCHAR(100),
    "metadata" JSONB,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
