-- Migración: roles y asignaciones de roles a usuarios
-- Crea tablas roles y user_roles y datos iniciales

BEGIN;

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Insertar roles base (ajusta nombres/slug según prefieras)
INSERT INTO roles (slug, name, description) VALUES
('dev', 'Dev (superuser)', 'Acceso total y privilegios de superusuario') ON CONFLICT DO NOTHING;
INSERT INTO roles (slug, name, description) VALUES
('admin', 'Admin (Doña Laura)', 'Autorizar/rechazar permisos; administrar personal; ver y manipular solicitudes') ON CONFLICT DO NOTHING;
INSERT INTO roles (slug, name, description) VALUES
('viewer', 'Viewer (Don Oscar)', 'Puede ver solicitudes y pedir permisos como usuario') ON CONFLICT DO NOTHING;
INSERT INTO roles (slug, name, description) VALUES
('staff_manager', 'Staff Manager (Katherine)', 'Administrar personal (CRUD)') ON CONFLICT DO NOTHING;
INSERT INTO roles (slug, name, description) VALUES
('infra_manager', 'Infrastructure Manager (Sandino/Don Manuel)', 'Ver y manipular reportes de infraestructura') ON CONFLICT DO NOTHING;
INSERT INTO roles (slug, name, description) VALUES
('normal_user', 'Usuario normal', 'Puede pedir permisos/justificaciones/reportes') ON CONFLICT DO NOTHING;

COMMIT;

-- Ejemplo: asignar roles a usuarios existentes (reemplaza cedulas por las reales)
-- INSERT INTO user_roles (user_id, role_id)
-- VALUES (
--   (SELECT id FROM users WHERE cedula = 'CEDULA_DE_LAURA'),
--   (SELECT id FROM roles WHERE slug = 'admin')
-- );

-- Para asignar múltiples roles a un usuario basta insertar varias filas
-- Ejemplo real para Doña Laura (reemplazar '12345678' por su cédula):
-- INSERT INTO user_roles (user_id, role_id)
-- VALUES (
--   (SELECT id FROM users WHERE cedula = '12345678'),
--   (SELECT id FROM roles WHERE slug = 'admin')
-- );

-- Asignar Dev (superuser) a un usuario:
-- INSERT INTO user_roles (user_id, role_id)
-- VALUES (
--   (SELECT id FROM users WHERE cedula = 'CEDULA_DEL_DEV'),
--   (SELECT id FROM roles WHERE slug = 'dev')
-- );

-- Nota: ejecuta este SQL en Supabase SQL editor o mediante migraciones para crear las tablas y los roles.
