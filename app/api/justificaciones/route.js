import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserAndRolesFromRequest } from '../../../lib/authHelpers';

// Helpers: fechas para Costa Rica y días hábiles
const crYMD = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d)
    .reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const crHM = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d)
    .reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  return `${parts.hour}:${parts.minute}`;
};
const shiftYMD = (ymd, days) => {
  const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};
const dayOfWeek = (ymd) => { // 0=Dom..6=Sáb
  const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay();
};
const previousBusinessDaysCR = (todayYMD, count = 2) => {
  const res = [];
  let cur = todayYMD;
  while (res.length < count) {
    cur = shiftYMD(cur, -1);
    const dow = dayOfWeek(cur);
    if (dow >= 1 && dow <= 5) res.push(cur);
  }
  return res; // más reciente primero
};

export async function POST(req) {
  try {
    const info = await getUserAndRolesFromRequest(req);
    if (!info) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });

    const body = await req.json();
    // minimal validation
    if (!body.fecha_inicio) return new Response(JSON.stringify({ error: 'fecha_inicio requerida' }), { status: 400 });
    if (!body.tipo_justificacion) return new Response(JSON.stringify({ error: 'tipo_justificacion requerido' }), { status: 400 });

  // Server-authoritative ventana: dos días hábiles previos en CR
  // Use DB-controlled clock for tests when available
  let todayCR = null;
  try {
    const { data: todayData } = await supabaseAdmin.rpc('get_today_cr');
    if (todayData) todayCR = String(todayData);
  } catch {}
  if (!todayCR) todayCR = crYMD();
  const allowed = previousBusinessDaysCR(todayCR, 2);
  const allowedSet = new Set(allowed);

    // If linked to a solicitud, enforce 48h rule from last date of the solicitud
    if (body.linked_solicitud_id) {
      const { data: sol, error: solErr } = await supabaseAdmin
        .from('solicitudes_permiso')
        .select('id,user_cedula,es_rango,fecha_inicio,fecha_fin')
        .eq('id', body.linked_solicitud_id)
        .maybeSingle();
      if (solErr) return new Response(JSON.stringify({ error: solErr.message }), { status: 500 });
      if (!sol) return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 404 });
      // Optional: Ensure the user is justifying their own solicitud
      if (sol.user_cedula && sol.user_cedula !== info.user.cedula) {
        return new Response(JSON.stringify({ error: 'No autorizado para justificar esta solicitud' }), { status: 403 });
      }
      const lastDateStr = sol.es_rango ? (sol.fecha_fin || sol.fecha_inicio) : sol.fecha_inicio;
      const parseYMD = (s) => {
        if (!s) return null;
        const [y, m, d] = String(s).split('-').map(n => parseInt(n, 10));
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      };
      const lastDate = parseYMD(lastDateStr);
      if (!lastDate) return new Response(JSON.stringify({ error: 'Fecha inválida en la solicitud vinculada' }), { status: 400 });
  // Reglas: debe ser uno de los dos días hábiles previos (CR)
      if (!allowedSet.has(String(lastDateStr))) {
        return new Response(JSON.stringify({ error: 'Fuera de plazo: la solicitud no corresponde a los dos días hábiles anteriores (CR).' }), { status: 409 });
      }
  // Nota: Ya no se aplica límite de 48 horas naturales; se usan días hábiles.
    }

    // Validar que las fechas justificadas estén dentro de los dos días hábiles previos (CR)
    const fi = String(body.fecha_inicio);
    const ff = String(body.es_rango ? (body.fecha_fin || body.fecha_inicio) : body.fecha_inicio);
    if (!allowedSet.has(fi) || !allowedSet.has(ff)) {
      return new Response(JSON.stringify({ error: 'Las fechas justificadas deben ser uno de los dos días hábiles anteriores (CR).' }), { status: 409 });
    }

    // Timestamp de justificación desde el servidor (ignorar valores del cliente)
    const payload = {
      linked_solicitud_id: body.linked_solicitud_id || null,
      user_cedula: info.user.cedula,
      nombre_suscriptor: body.nombre_suscriptor || null,
      posicion: body.posicion || null,
      instancia: body.instancia || null,
      tipo_general: body.tipo_general || null,
      tipo_justificacion: body.tipo_justificacion,
  estado: 'Pendiente',
      es_rango: !!body.es_rango,
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin || body.fecha_inicio,
      jornada: body.jornada || null,
      hora_inicio: body.hora_inicio || null,
      hora_fin: body.hora_fin || null,
      cantidad: body.cantidad || null,
      unidad: body.unidad || null,
      hora_salida: body.hora_salida || null,
      justificacion_fecha: crYMD(),
      justificacion_hora: crHM(),
      observaciones: body.observaciones || null,
      familiar: body.familiar || null,
      adjunto_url: body.adjunto_url || null,
      adjunto_mime: body.adjunto_mime || null,
    };

    const { data, error } = await supabaseAdmin.from('justificaciones').insert([payload]).select('id');
    if (error) throw error;
    const id = data?.[0]?.id;

    // Persist attachment link if path provided
    if (id && (body.adjunto_url || body.adjunto_path)) {
      await supabaseAdmin.from('justificacion_adjuntos').insert([{ 
        justificacion_id: id,
        path: body.adjunto_path || null,
        public_url: body.adjunto_url || null,
        mime: body.adjunto_mime || null,
        uploaded_by_cedula: info.user.cedula,
      }]);
    }

    return new Response(JSON.stringify({ ok: true, id }), { status: 201 });
  } catch (err) {
    console.error('/api/justificaciones error', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
