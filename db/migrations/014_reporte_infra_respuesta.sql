-- Add admin resolution to reporte_infraestructura
alter table if exists public.reporte_infraestructura
  add column if not exists estado text;

alter table if exists public.reporte_infraestructura
  drop constraint if exists reporte_infra_estado_check;

alter table if exists public.reporte_infraestructura
  add constraint reporte_infra_estado_check
  check (
    estado is null or estado in ('Pendiente', 'Solucionado', 'No solucionado')
  );

alter table if exists public.reporte_infraestructura
  add column if not exists respuesta_en timestamptz,
  add column if not exists respuesta_por text,
  add column if not exists respuesta_nombre text,
  add column if not exists respuesta_comentario text;

create index if not exists idx_reporte_infra_estado on public.reporte_infraestructura (estado);
