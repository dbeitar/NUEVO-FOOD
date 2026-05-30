-- VIENTO RECIO V1 — Centro de Formación Espiritual

CREATE TABLE "spiritual_bible_versions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "language" VARCHAR(8) NOT NULL DEFAULT 'es',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imported_at" TIMESTAMP(3),
    "source_meta" JSONB,
    CONSTRAINT "spiritual_bible_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_bible_versions_code_key" ON "spiritual_bible_versions"("code");

CREATE TABLE "spiritual_bible_books" (
    "id" SERIAL NOT NULL,
    "version_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "testament" VARCHAR(4) NOT NULL,
    CONSTRAINT "spiritual_bible_books_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_bible_books_version_id_code_key" ON "spiritual_bible_books"("version_id", "code");
ALTER TABLE "spiritual_bible_books" ADD CONSTRAINT "spiritual_bible_books_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "spiritual_bible_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_bible_chapters" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    CONSTRAINT "spiritual_bible_chapters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_bible_chapters_book_id_chapter_number_key" ON "spiritual_bible_chapters"("book_id", "chapter_number");
ALTER TABLE "spiritual_bible_chapters" ADD CONSTRAINT "spiritual_bible_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "spiritual_bible_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_bible_verses" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "verse_number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "spiritual_bible_verses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_bible_verses_chapter_id_verse_number_key" ON "spiritual_bible_verses"("chapter_id", "verse_number");
CREATE INDEX "spiritual_bible_verses_text_idx" ON "spiritual_bible_verses"("text");
ALTER TABLE "spiritual_bible_verses" ADD CONSTRAINT "spiritual_bible_verses_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "spiritual_bible_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_user_favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "verse_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spiritual_user_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_user_favorites_user_id_verse_id_key" ON "spiritual_user_favorites"("user_id", "verse_id");
ALTER TABLE "spiritual_user_favorites" ADD CONSTRAINT "spiritual_user_favorites_verse_id_fkey" FOREIGN KEY ("verse_id") REFERENCES "spiritual_bible_verses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_user_bookmarks" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "label" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spiritual_user_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_user_bookmarks_user_id_chapter_id_key" ON "spiritual_user_bookmarks"("user_id", "chapter_id");
ALTER TABLE "spiritual_user_bookmarks" ADD CONSTRAINT "spiritual_user_bookmarks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "spiritual_bible_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_verse_of_day" (
    "id" SERIAL NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "verse_id" INTEGER,
    "custom_text" TEXT,
    "reflection" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by_id" INTEGER NOT NULL,
    "scope_type" VARCHAR(16) NOT NULL DEFAULT 'global',
    "scope_gym_id" INTEGER,
    "scope_trainer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spiritual_verse_of_day_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_verse_of_day_scheduled_date_scope_type_scope_gym_id_scope_trainer_id_key" ON "spiritual_verse_of_day"("scheduled_date", "scope_type", "scope_gym_id", "scope_trainer_id");

CREATE TABLE "spiritual_devotional_plans" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scope_type" VARCHAR(16) NOT NULL DEFAULT 'global',
    "scope_gym_id" INTEGER,
    "scope_trainer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spiritual_devotional_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "spiritual_devotional_days" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "day_index" INTEGER NOT NULL,
    "verse_id" INTEGER,
    "reflection" TEXT NOT NULL,
    "prayer" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    CONSTRAINT "spiritual_devotional_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_devotional_days_plan_id_day_index_key" ON "spiritual_devotional_days"("plan_id", "day_index");
ALTER TABLE "spiritual_devotional_days" ADD CONSTRAINT "spiritual_devotional_days_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "spiritual_devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_devotional_progress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "day_index" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spiritual_devotional_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_devotional_progress_user_id_plan_id_day_index_key" ON "spiritual_devotional_progress"("user_id", "plan_id", "day_index");
ALTER TABLE "spiritual_devotional_progress" ADD CONSTRAINT "spiritual_devotional_progress_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "spiritual_devotional_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_study_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "spiritual_study_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_study_categories_name_key" ON "spiritual_study_categories"("name");

CREATE TABLE "spiritual_study_authors" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "spiritual_study_authors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_study_authors_name_key" ON "spiritual_study_authors"("name");

CREATE TABLE "spiritual_studies" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "media_type" VARCHAR(24) NOT NULL,
    "media_url" VARCHAR(500) NOT NULL,
    "category_id" INTEGER,
    "author_id" INTEGER,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scope_type" VARCHAR(16) NOT NULL DEFAULT 'global',
    "scope_gym_id" INTEGER,
    "scope_trainer_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spiritual_studies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "spiritual_studies" ADD CONSTRAINT "spiritual_studies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "spiritual_study_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "spiritual_studies" ADD CONSTRAINT "spiritual_studies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "spiritual_study_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "spiritual_events" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "mode" VARCHAR(16) NOT NULL,
    "location" VARCHAR(200),
    "zoom_link" VARCHAR(500),
    "meet_link" VARCHAR(500),
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scope_type" VARCHAR(16) NOT NULL DEFAULT 'global',
    "scope_gym_id" INTEGER,
    "scope_trainer_id" INTEGER,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "spiritual_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "spiritual_event_registrations" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(16) NOT NULL DEFAULT 'registered',
    CONSTRAINT "spiritual_event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_event_registrations_event_id_user_id_key" ON "spiritual_event_registrations"("event_id", "user_id");
ALTER TABLE "spiritual_event_registrations" ADD CONSTRAINT "spiritual_event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "spiritual_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "spiritual_event_attendance" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "spiritual_event_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "spiritual_event_attendance_event_id_user_id_key" ON "spiritual_event_attendance"("event_id", "user_id");
ALTER TABLE "spiritual_event_attendance" ADD CONSTRAINT "spiritual_event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "spiritual_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
