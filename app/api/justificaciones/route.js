import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserAndRolesFromRequest } from '../../../lib/authHelpers';

export async function POST(req) {
  try {
    const info = await getUserAndRolesFromRequest(req);
    if (!info) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });

    const body = await req.json();
    // minimal validation
    if (!body.fecha_inicio) return new Response(JSON.stringify({ error: 'fecha_inicio requerida' }), { status: 400 });
    if (!body.tipo_justificacion) return new Response(JSON.stringify({ error: 'tipo_justificacion requerido' }), { status: 400 });

    const payload = {
      linked_solicitud_id: body.linked_solicitud_id || null,
      user_cedula: info.user.cedula,
      nombre_suscriptor: body.nombre_suscriptor || null,
      posicion: body.posicion || null,
      instancia: body.instancia || null,
      tipo_general: body.tipo_general || null,
      tipo_justificacion: body.tipo_justificacion,
      es_rango: !!body.es_rango,
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin || body.fecha_inicio,
      jornada: body.jornada || null,
      hora_inicio: body.hora_inicio || null,
      hora_fin: body.hora_fin || null,
      cantidad: body.cantidad || null,
      unidad: body.unidad || null,
      hora_salida: body.hora_salida || null,
      justificacion_fecha: body.justificacion_fecha || null,
      justificacion_hora: body.justificacion_hora || null,
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
