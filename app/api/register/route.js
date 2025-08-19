import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const body = await req.json();

    // Validación mínima
    const required = ['cedula', 'nombre', 'primer_apellido', 'segundo_apellido', 'posicion', 'categoria', 'instancia'];
    for (const f of required) {
      if (!body[f]) return new Response(JSON.stringify({ error: `${f} es obligatorio` }), { status: 400 });
    }

    // Comprueba unicidad de cédula
    const { data: exists, error: selErr } = await supabase.from('users').select('id').eq('cedula', body.cedula).limit(1);
    if (selErr) throw selErr;
    if (exists && exists.length) return new Response(JSON.stringify({ error: 'Cédula ya registrada' }), { status: 409 });

    // Password por defecto
    const plainPassword = body.password || 'admin123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plainPassword, salt);

    const payload = {
      cedula: body.cedula,
      nombre: body.nombre,
      segundo_nombre: body.segundo_nombre || null,
      primer_apellido: body.primer_apellido,
      segundo_apellido: body.segundo_apellido,
      posicion: body.posicion,
      categoria: body.categoria,
      instancia: body.instancia,
      password_hash,
      must_change_password: true,
    };

    const { error: insertError } = await supabase.from('users').insert([payload]);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  } catch (err) {
    console.error('[api/register] error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
