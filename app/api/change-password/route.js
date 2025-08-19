import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const { cedula, newPassword } = await req.json();
    if (!cedula || !newPassword) return new Response(JSON.stringify({ error: 'cedula and newPassword required' }), { status: 400 });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const { error } = await supabase.from('users').update({ password_hash, must_change_password: false }).eq('cedula', cedula);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('[api/change-password] error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
