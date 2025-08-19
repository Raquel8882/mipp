-- Table to store Infra reports
create table if not exists public.reporte_infraestructura (
  id bigserial primary key,
  user_cedula text not null,
  nombre_suscriptor text,
  posicion text,
  instancia text,
  tipo_reporte text not null, -- No urgente | Normal | Muy urgente
  reporte text not null,
  lugar text not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_reporte_infra_user on public.reporte_infraestructura (user_cedula);
