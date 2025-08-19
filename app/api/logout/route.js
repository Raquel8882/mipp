import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyToken } from '../../../lib/session';

export async function POST(req) {
  const headers = new Headers();
  try {
    // Leer token desde cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/session_token=([^;]+)/);
    const token = match ? match[1] : null;
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.session_id) {
        await supabaseAdmin.from('sessions').update({ revoked: true }).eq('id', payload.session_id);
      }
    }
  } catch (err) {
    console.error('logout revoke error', err);
  }

  // Expirar la cookie de sesión firmada
  headers.append('Set-Cookie', `session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
