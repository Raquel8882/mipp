-- Add admin response metadata and estado to justificaciones
alter table if exists public.justificaciones
  add column if not exists estado text;

-- Define allowed values for justificaciones.estado
alter table if exists public.justificaciones
  drop constraint if exists justificaciones_estado_check;

alter table if exists public.justificaciones
  add constraint justificaciones_estado_check
  check (
    estado is null or estado in (
      'Pendiente', 'Aprobado', 'Rechazado',
      'Aceptado con rebajo parcial', 'Aceptado con rebajo total', 'Aceptado sin rebajo',
      'Denegado', 'Acoge convocatoria'
    )
  );

alter table if exists public.justificaciones
  add column if not exists respuesta_en timestamptz,
  add column if not exists respuesta_por text,
  add column if not exists respuesta_nombre text,
  add column if not exists respuesta_comentario text;

create index if not exists idx_justificaciones_estado on public.justificaciones (estado);
