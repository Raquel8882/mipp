import { requireAnyRole } from '../../../../lib/authHelpers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req) {
  // permitir solo admin o dev
  const maybe = await requireAnyRole(req, ['admin', 'dev']);
  if (maybe instanceof Response) return maybe;

  const { data, error } = await supabaseAdmin.from('sessions').select('id,user_id,created_at,expires_at,revoked');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function DELETE(req) {
  // revocar sesión por id via body { id }
  const maybe = await requireAnyRole(req, ['admin', 'dev']);
  if (maybe instanceof Response) return maybe;
  try {
    const { id } = await req.json();
    if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });
    const { error } = await supabaseAdmin.from('sessions').update({ revoked: true }).eq('id', id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
