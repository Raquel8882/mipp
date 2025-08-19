-- Create table to associate attachments with a solicitud de permiso
create table if not exists public.solicitud_adjuntos (
  id bigserial primary key,
  solicitud_id bigint not null,
  path text,
  public_url text,
  mime text,
  uploaded_by_cedula text,
  uploaded_at timestamptz not null default now()
);

-- Basic index to query attachments by solicitud
create index if not exists idx_solicitud_adjuntos_solicitud_id on public.solicitud_adjuntos (solicitud_id);

-- Optional: index to query by uploader
create index if not exists idx_solicitud_adjuntos_uploader on public.solicitud_adjuntos (uploaded_by_cedula);
