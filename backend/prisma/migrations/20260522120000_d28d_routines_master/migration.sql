-- Maestro de Rutinas D28D

CREATE TABLE "d28d_routine_categories" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "d28d_routine_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "d28d_routine_categories_nombre_key" ON "d28d_routine_categories"("nombre");

CREATE TABLE "d28d_routines" (
    "id" SERIAL NOT NULL,
    "root_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "nombre" VARCHAR(255) NOT NULL,
    "categoria" VARCHAR(120) NOT NULL,
    "subcategoria" VARCHAR(120),
    "nivel" VARCHAR(64),
    "descripcion" TEXT,
    "estado" VARCHAR(32) NOT NULL DEFAULT 'activa',
    "scope" VARCHAR(64) NOT NULL DEFAULT 'd28d_platform',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "d28d_routines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "d28d_routines_root_id_is_current_idx" ON "d28d_routines"("root_id", "is_current");
CREATE INDEX "d28d_routines_categoria_estado_idx" ON "d28d_routines"("categoria", "estado");

CREATE TABLE "d28d_routine_blocks" (
    "id" SERIAL NOT NULL,
    "routine_id" INTEGER NOT NULL,
    "tipo" VARCHAR(32) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "nombre" VARCHAR(255),
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "d28d_routine_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "d28d_routine_blocks_routine_id_idx" ON "d28d_routine_blocks"("routine_id");

ALTER TABLE "d28d_routine_blocks" ADD CONSTRAINT "d28d_routine_blocks_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "d28d_routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "d28d_routine_exercises" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "repeticiones" VARCHAR(64),
    "duracion" VARCHAR(64),
    "descanso" VARCHAR(64),
    "observaciones" TEXT,
    "video_url" VARCHAR(512),
    "imagen_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "d28d_routine_exercises_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "d28d_routine_exercises_block_id_idx" ON "d28d_routine_exercises"("block_id");

ALTER TABLE "d28d_routine_exercises" ADD CONSTRAINT "d28d_routine_exercises_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "d28d_routine_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "d28d_routine_host_notes" (
    "id" SERIAL NOT NULL,
    "routine_id" INTEGER NOT NULL,
    "live_class_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "d28d_routine_host_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "d28d_routine_host_notes_routine_id_idx" ON "d28d_routine_host_notes"("routine_id");
CREATE INDEX "d28d_routine_host_notes_live_class_id_idx" ON "d28d_routine_host_notes"("live_class_id");

ALTER TABLE "d28d_routine_host_notes" ADD CONSTRAINT "d28d_routine_host_notes_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "d28d_routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
