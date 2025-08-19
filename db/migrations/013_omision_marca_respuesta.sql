-- Add admin response metadata and estado to omision_marca
alter table if exists public.omision_marca
  add column if not exists estado text;

alter table if exists public.omision_marca
  drop constraint if exists omision_marca_estado_check;

alter table if exists public.omision_marca
  add constraint omision_marca_estado_check
  check (
    estado is null or estado in (
      'Pendiente', 'Aceptado', 'Denegado'
    )
  );

alter table if exists public.omision_marca
  add column if not exists respuesta_en timestamptz,
  add column if not exists respuesta_por text,
  add column if not exists respuesta_nombre text,
  add column if not exists respuesta_comentario text;

create index if not exists idx_omision_marca_estado on public.omision_marca (estado);
