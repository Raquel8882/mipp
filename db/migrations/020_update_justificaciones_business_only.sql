-- Switch to business-day-only rule (no 48-hour natural limit)
-- Allows justification for the previous two business days (Mon–Fri) regardless of weekend gaps.

create or replace function public.justificaciones_validate_business_window()
returns trigger as $$
declare
  now_cr timestamp := public.get_now_cr();
  today_cr date := public.get_today_cr();
  allowed date[] := array[]::date[];
  cur date := today_cr;
  dow int;
  last_date date;
  sol_rec record;
begin
  -- Build allowed = previous two business days in CR (Mon-Fri)
  allowed := array[]::date[];
  cur := today_cr;
  while coalesce(array_length(allowed, 1), 0) < 2 loop
    cur := cur - interval '1 day';
    dow := extract(dow from cur);
    if dow between 1 and 5 then -- 1=Mon .. 5=Fri
      allowed := allowed || cur;
    end if;
  end loop;

  -- Validate form dates are within allowed set
  if not (new.fecha_inicio = any (allowed)) then
    raise exception 'Fuera de plazo: fecha_inicio debe ser uno de los dos días hábiles anteriores (CR).' using errcode = '23514';
  end if;

  if coalesce(new.es_rango, false) then
    if new.fecha_fin is null then
      raise exception 'fecha_fin requerida cuando es_rango=true.' using errcode = '23502';
    end if;
    if not (new.fecha_fin = any (allowed)) then
      raise exception 'Fuera de plazo: fecha_fin debe ser uno de los dos días hábiles anteriores (CR).' using errcode = '23514';
    end if;
    if new.fecha_fin < new.fecha_inicio then
      raise exception 'La fecha fin no puede ser anterior a la fecha inicio.' using errcode = '23514';
    end if;
  end if;

  -- Validate linked solicitud
  if new.linked_solicitud_id is not null then
    select id, user_cedula, es_rango, fecha_inicio, fecha_fin
      into sol_rec
      from solicitudes_permiso
     where id = new.linked_solicitud_id;

    if not found then
      raise exception 'Solicitud vinculada no encontrada.' using errcode = '23503';
    end if;

    -- Ownership check
    if sol_rec.user_cedula is not null and new.user_cedula is not null and sol_rec.user_cedula <> new.user_cedula then
      raise exception 'No autorizado para justificar esta solicitud.' using errcode = '42501';
    end if;

    last_date := coalesce(sol_rec.fecha_fin, sol_rec.fecha_inicio);
    if not (last_date = any (allowed)) then
      raise exception 'Fuera de plazo: la solicitud no corresponde a los dos días hábiles anteriores (CR).' using errcode = '23514';
    end if;
  end if;

  -- Server-side stamp for justification date/time
  new.justificacion_fecha := to_char(now_cr, 'YYYY-MM-DD');
  new.justificacion_hora  := to_char(now_cr, 'HH24:MI');

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_justificaciones_validate on public.justificaciones;
create trigger trg_justificaciones_validate
before insert or update on public.justificaciones
for each row
execute function public.justificaciones_validate_business_window();
