-- Table to store omissions of time clock marks
create table if not exists public.omision_marca (
  id bigserial primary key,
  user_cedula text not null,
  nombre_suscriptor text,
  posicion text,
  instancia text,
  fecha_omision date not null,
  tipo_omision text not null, -- Entrada | Salida | Todo el dia | Salida anticipada
  justificacion text not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_omision_marca_user on public.omision_marca (user_cedula);
