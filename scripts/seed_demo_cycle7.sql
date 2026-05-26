-- Seed Demo Ciclo 7 — D28D GYM Virtual
-- Ejecutar con USE_DB_AUTH=true en PostgreSQL/MySQL
-- Generado: 2026-05-07T21:46:11.264Z

-- Gimnasio PowerFit
INSERT INTO gyms (id,nombre,ciudad,slug,activo) VALUES (10,'PowerFit','Bogotá','powerfit',true) ON CONFLICT (id) DO NOTHING;

-- Usuarios Demo (password: Demo!2026)
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (100,'PowerFit Admin','admin@powerfit.gym','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','admin_gimnasio','["admin_gimnasio","admin_gym"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (101,'María Fitness (Híbrido)','maria@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (102,'Carlos Entrenador-Nutri','carlos@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','entrenador','["entrenador","nutricionista","admin_training"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (103,'Laura Vital','laura@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (104,'Andrés D28D','andres@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (105,'Sofia Pancitas','sofia@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (106,'Demo User 6','user6@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (107,'Demo User 7','user7@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (108,'Demo User 8','user8@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (109,'Demo User 9','user9@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (110,'Demo User 10','user10@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (111,'Demo User 11','user11@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (112,'Demo User 12','user12@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (113,'Demo User 13','user13@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (114,'Demo User 14','user14@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (115,'Demo User 15','user15@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (116,'Demo User 16','user16@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (117,'Demo User 17','user17@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (118,'Demo User 18','user18@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (119,'Demo User 19','user19@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id,nombre,email,clave_hash,rol,roles,gym_id) VALUES (120,'Demo User 20','user20@demo.d28d.com','$2b$10$yI5t4mMVIy8QliBjnDiQjuZQ0AV8FWzTMi7LtwNa/2FmI8wRTiruO','usuario_final','["usuario_final"]',10) ON CONFLICT (id) DO NOTHING;

-- Clases en Vivo (primeras 5 como ejemplo)
INSERT INTO live_classes (id,title,program_id,coach,capacity,start_time,end_time,active) VALUES (1000,'CARDIO HIT — 6:20-7:00 am','vital','Alejo',20,'2026-06-01T11:20:00.000Z','2026-06-01T12:00:00.000Z',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO live_classes (id,title,program_id,coach,capacity,start_time,end_time,active) VALUES (1001,'FUERZA TOTAL — 8:20-9:00 am','pancitas','Tatiana',20,'2026-06-01T13:20:00.000Z','2026-06-01T14:00:00.000Z',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO live_classes (id,title,program_id,coach,capacity,start_time,end_time,active) VALUES (1002,'FUNCIONAL — 9:00-9:40 am','virtual_d28d','Carlos',20,'2026-06-01T14:00:00.000Z','2026-06-01T14:40:00.000Z',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO live_classes (id,title,program_id,coach,capacity,start_time,end_time,active) VALUES (1003,'METODO D28D — 6:20-7:00 pm','vital','Diana',20,'2026-06-01T23:20:00.000Z','2026-06-02T00:00:00.000Z',true) ON CONFLICT (id) DO NOTHING;
INSERT INTO live_classes (id,title,program_id,coach,capacity,start_time,end_time,active) VALUES (1004,'STRETCHING — 7:00-7:40 pm','pancitas','Pipe',20,'2026-06-02T00:00:00.000Z','2026-06-02T00:40:00.000Z',true) ON CONFLICT (id) DO NOTHING;
-- ... 115 clases más omitidas por brevedad
