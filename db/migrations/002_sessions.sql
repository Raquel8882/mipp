-- Migración: tabla sessions para sesiones server-side revocables

BEGIN;

-- Asegúrate de tener la extensión uuid-ossp o pgcrypto disponible en tu instancia.
-- En Supabase, normalmente puedes usar gen_random_uuid() si la extensión "pgcrypto" está activa.

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  revoked boolean DEFAULT false,
  last_active_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked);

COMMIT;

-- Ejemplo para insertar sesión manualmente (no necesario si el login la crea):
-- INSERT INTO sessions (user_id, expires_at) VALUES ((SELECT id FROM users WHERE cedula='CEDULA'), now() + interval '7 days');
