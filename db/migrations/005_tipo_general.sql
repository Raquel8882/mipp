-- Add enum and column for tipo_general on solicitudes_permiso
DO $$ BEGIN
  CREATE TYPE public.tipo_general AS ENUM ('Salida', 'Ausencia', 'Tardía', 'Incapacidad');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.solicitudes_permiso
  ADD COLUMN IF NOT EXISTS tipo_general public.tipo_general;

-- Optional: default new entries to 'Salida' if not provided
ALTER TABLE public.solicitudes_permiso
  ALTER COLUMN tipo_general SET DEFAULT 'Salida';
