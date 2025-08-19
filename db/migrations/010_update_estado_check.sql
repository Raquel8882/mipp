-- Broaden allowed values for solicitudes_permiso.estado to include new admin decisions
alter table if exists public.solicitudes_permiso
  drop constraint if exists solicitudes_permiso_estado_check;

alter table if exists public.solicitudes_permiso
  add constraint solicitudes_permiso_estado_check
  check (
    estado is null or estado in (
      'Pendiente', 'Aprobado', 'Rechazado',
      'Aceptado', 'Denegado', 'Acoge convocatoria'
    )
  );
