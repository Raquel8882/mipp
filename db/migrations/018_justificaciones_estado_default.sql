-- Set default and backfill estado for justificaciones
alter table if exists public.justificaciones
  alter column estado set default 'Pendiente';

update public.justificaciones
   set estado = 'Pendiente'
 where estado is null;
