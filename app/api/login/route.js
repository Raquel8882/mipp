import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/session';
import { buildSessionCookie } from '../../../lib/cookies';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req) {
  try {
    // Validate environment for server-side Supabase
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean).join(', ');
      return new Response(
        JSON.stringify({ error: 'Configuración faltante', detail: `Faltan variables de entorno: ${missing}` }),
        { status: 500 }
      );
    }

    const { cedula, password } = await req.json();
    if (!cedula || !password) {
      return new Response(JSON.stringify({ error: 'cedula and password required' }), { status: 400 });
    }

    // Buscar usuario por cédula (usar supabaseAdmin en server)
    const { data: user, error: selErr } = await supabaseAdmin
      .from('users')
      .select('id, password_hash, must_change_password')
      .eq('cedula', cedula)
      .limit(1)
      .maybeSingle();
    if (selErr) {
      console.error('DB select error /users', selErr);
      return new Response(JSON.stringify({ error: 'Error consultando usuarios' }), { status: 500 });
    }
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
    }

    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) {
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), { status: 401 });
    }

    // Crear fila de sesión en DB (revocable)
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      const { data: sessionData, error: sessErr } = await supabaseAdmin
        .from('sessions')
        .insert([{ user_id: user.id, expires_at: expiresAt }])
        .select('id')
        .single();
      if (sessErr) {
        console.error('Sessions insert error', sessErr);
        const hint = sessErr?.message?.includes('relation') ? 'Ejecuta la migración 002_sessions.sql en Supabase.' : undefined;
        return new Response(
          JSON.stringify({ error: 'Error creando la sesión', detail: sessErr.message, hint }),
          { status: 500 }
        );
      }

      const sessionId = sessionData.id;
      // Autenticación exitosa: crear token firmado con user_id y session_id
  const token = createToken({ user_id: user.id, session_id: sessionId }, 60 * 60 * 24 * 7);
  const headers = new Headers();
  headers.append('Set-Cookie', buildSessionCookie(token, 60 * 60 * 24 * 7));
      return new Response(
        JSON.stringify({ ok: true, must_change_password: !!user.must_change_password, cedula }),
        { status: 200, headers }
      );
    } catch (err) {
      console.error('login session create fatal error', err);
      return new Response(JSON.stringify({ error: 'Error creando la sesión' }), { status: 500 });
    }
  } catch (err) {
    console.error('[api/login] error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
