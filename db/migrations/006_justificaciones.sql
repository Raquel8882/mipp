-- Table to store justification forms
create table if not exists public.justificaciones (
  id bigserial primary key,
  linked_solicitud_id bigint,
  user_cedula text not null,
  nombre_suscriptor text,
  posicion text,
  instancia text,
  tipo_general text, -- Salida | Ausencia | Tardía | Incapacidad
  tipo_justificacion text not null, -- Cita medica personal | Acompañar a cita familiar | Asistencia a convocatoria | Atención de asuntos personales
  es_rango boolean default false,
  fecha_inicio date not null,
  fecha_fin date not null,
  jornada text, -- Media | Completa
  hora_inicio text,
  hora_fin text,
  cantidad int,
  unidad text, -- horas | lecciones
  hora_salida text,
  justificacion_fecha date,
  justificacion_hora text,
  observaciones text,
  familiar text,
  adjunto_url text,
  adjunto_mime text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_justificaciones_user on public.justificaciones (user_cedula);
create index if not exists idx_justificaciones_linked on public.justificaciones (linked_solicitud_id);

-- Attachments table for justificaciones
create table if not exists public.justificacion_adjuntos (
  id bigserial primary key,
  justificacion_id bigint not null,
  path text,
  public_url text,
  mime text,
  uploaded_by_cedula text,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_justif_adj_by_justif on public.justificacion_adjuntos (justificacion_id);
