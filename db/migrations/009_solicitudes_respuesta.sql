-- Add resolution fields to solicitudes_permiso
alter table if exists public.solicitudes_permiso
  add column if not exists respuesta_en timestamptz,
  add column if not exists respuesta_por text,
  add column if not exists respuesta_nombre text,
  add column if not exists respuesta_comentario text;

-- Optional index to query by pending/accepted/denied quickly
create index if not exists idx_solicitudes_estado on public.solicitudes_permiso (estado);
