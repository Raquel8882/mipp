import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const cedula = form.get('cedula') || 'anon';

    if (!file) return new Response(JSON.stringify({ error: 'no file provided' }), { status: 400 });

    const name = file.name || 'upload.bin';
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${cedula}/${Date.now()}_${name}`;

    const { error: upErr } = await supabaseAdmin.storage.from('permisos-adjuntos').upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) {
      console.error('upload error', upErr);
      return new Response(JSON.stringify({ error: upErr.message || String(upErr) }), { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from('permisos-adjuntos').getPublicUrl(path);

  return new Response(JSON.stringify({ publicUrl: pub?.publicUrl || null, path }), { status: 200 });
  } catch (err) {
    console.error('upload handler error', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
