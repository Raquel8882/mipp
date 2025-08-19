-- Normalize existing values in solicitudes_permiso.estado so the check constraint can be applied safely
-- 1) Drop the constraint if it exists (in case 010 failed halfway or was partially applied)
alter table if exists public.solicitudes_permiso
  drop constraint if exists solicitudes_permiso_estado_check;

-- 2) Clean obvious invalids / variants
update public.solicitudes_permiso
  set estado = null
  where estado is null or btrim(estado) = '' or estado ilike 'sin estado%';

-- Map common variants to canonical values
update public.solicitudes_permiso set estado = 'Pendiente' where estado ilike 'pend%';
update public.solicitudes_permiso set estado = 'Aprobado' where estado ilike 'aprob%';
update public.solicitudes_permiso set estado = 'Rechazado' where estado ilike 'rech%';
update public.solicitudes_permiso set estado = 'Aceptado' where estado ilike 'acept%';
update public.solicitudes_permiso set estado = 'Denegado' where estado ilike 'deneg%';
update public.solicitudes_permiso set estado = 'Acoge convocatoria'
  where lower(btrim(estado)) in ('acoge convocatoria','acoge_convocatoria')
     or (estado ilike 'acoge%' and estado ilike '%convocatoria%');

-- 3) Re-add the broadened check constraint
alter table if exists public.solicitudes_permiso
  add constraint solicitudes_permiso_estado_check
  check (
    estado is null or estado in (
      'Pendiente', 'Aprobado', 'Rechazado',
      'Aceptado', 'Denegado', 'Acoge convocatoria'
    )
  );
