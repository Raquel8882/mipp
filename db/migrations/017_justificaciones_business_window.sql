-- Enforce business-day (CR) window and server-side timestamp on justificaciones
-- - fecha_inicio/fecha_fin must be within the previous two business days in Costa Rica
-- - If linked_solicitud_id is provided, it must belong to the same user, its last date must be in the allowed set, and be within 48h
-- - Set justificacion_fecha/hora from server time in CR timezone

CREATE OR REPLACE FUNCTION justificaciones_validate_business_window()
RETURNS trigger AS $$
DECLARE
  now_cr timestamptz := now() AT TIME ZONE 'America/Costa_Rica';
  today_cr date := (now() AT TIME ZONE 'America/Costa_Rica')::date;
  allowed date[] := ARRAY[]::date[];
  cur date := today_cr;
  dow int;
  last_date date;
  diff_hours numeric;
  sol_rec record;
BEGIN
  -- Build allowed = previous two business days in CR (Mon-Fri)
  allowed := ARRAY[]::date[];
  cur := today_cr;
  WHILE COALESCE(array_length(allowed, 1), 0) < 2 LOOP
    cur := cur - INTERVAL '1 day';
    dow := EXTRACT(DOW FROM cur);
    IF dow BETWEEN 1 AND 5 THEN -- 1=Mon .. 5=Fri
      allowed := allowed || cur;
    END IF;
  END LOOP;

  -- Validate form dates are within allowed set
  IF NOT (NEW.fecha_inicio = ANY (allowed)) THEN
    RAISE EXCEPTION 'Fuera de plazo: fecha_inicio debe ser uno de los dos días hábiles anteriores (CR).' USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.es_rango, false) THEN
    IF NEW.fecha_fin IS NULL THEN
      RAISE EXCEPTION 'fecha_fin requerida cuando es_rango=true.' USING ERRCODE = '23502';
    END IF;
    IF NOT (NEW.fecha_fin = ANY (allowed)) THEN
      RAISE EXCEPTION 'Fuera de plazo: fecha_fin debe ser uno de los dos días hábiles anteriores (CR).' USING ERRCODE = '23514';
    END IF;
    IF NEW.fecha_fin < NEW.fecha_inicio THEN
      RAISE EXCEPTION 'La fecha fin no puede ser anterior a la fecha inicio.' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Validate linked solicitud rules
  IF NEW.linked_solicitud_id IS NOT NULL THEN
    SELECT id, user_cedula, es_rango, fecha_inicio, fecha_fin
      INTO sol_rec
      FROM solicitudes_permiso
     WHERE id = NEW.linked_solicitud_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Solicitud vinculada no encontrada.' USING ERRCODE = '23503';
    END IF;

    -- Ownership check (optional but safer)
    IF sol_rec.user_cedula IS NOT NULL AND NEW.user_cedula IS NOT NULL AND sol_rec.user_cedula <> NEW.user_cedula THEN
      RAISE EXCEPTION 'No autorizado para justificar esta solicitud.' USING ERRCODE = '42501';
    END IF;

    last_date := COALESCE(sol_rec.fecha_fin, sol_rec.fecha_inicio);
    IF NOT (last_date = ANY (allowed)) THEN
      RAISE EXCEPTION 'Fuera de plazo: la solicitud no corresponde a los dos días hábiles anteriores (CR).' USING ERRCODE = '23514';
    END IF;

    diff_hours := EXTRACT(EPOCH FROM (now_cr - (last_date::timestamp))) / 3600.0;
    IF diff_hours > 48 THEN
      RAISE EXCEPTION 'Fuera de plazo: han pasado más de 48 horas desde la fecha indicada en la solicitud.' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Server-side stamp for justification date/time (as strings for compatibility)
  NEW.justificacion_fecha := to_char(now_cr, 'YYYY-MM-DD');
  NEW.justificacion_hora  := to_char(now_cr, 'HH24:MI');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on justificaciones
DROP TRIGGER IF EXISTS trg_justificaciones_validate ON justificaciones;
CREATE TRIGGER trg_justificaciones_validate
BEFORE INSERT OR UPDATE ON justificaciones
FOR EACH ROW
EXECUTE FUNCTION justificaciones_validate_business_window();
