-- Migración: agregar columna deleted_at para soft-delete en users

BEGIN;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

COMMIT;

-- Después de aplicar esta migración, las operaciones de borrado deberían marcar deleted_at = now() en lugar de eliminar filas.
