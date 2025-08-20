import { requireAnyRole } from '../../../../lib/authHelpers';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(req) {
  const maybe = await requireAnyRole(req, ['admin', 'dev']);
  if (maybe instanceof Response) return maybe;
  try {
    const { data: row, error } = await supabaseAdmin
      .from('time_control')
      .select('offset_minutes, updated_at')
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    let nowCR = null, todayCR = null;
    try {
      const { data: n } = await supabaseAdmin.rpc('get_now_cr');
      const { data: t } = await supabaseAdmin.rpc('get_today_cr');
      nowCR = n || null;
      todayCR = t || null;
    } catch {}
    return new Response(
      JSON.stringify({
        offset_minutes: row?.offset_minutes ?? 0,
        updated_at: row?.updated_at || null,
        now_cr: nowCR,
        today_cr: todayCR,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}

export async function PUT(req) {
  const maybe = await requireAnyRole(req, ['admin', 'dev']);
  if (maybe instanceof Response) return maybe;
  try {
    const body = await req.json();
    let minutes = 0;
    if (typeof body.offset_minutes === 'number') {
      minutes = Math.trunc(body.offset_minutes);
    } else {
      const d = Math.trunc(body.days || 0);
      const h = Math.trunc(body.hours || 0);
      const m = Math.trunc(body.minutes || 0);
      minutes = d * 24 * 60 + h * 60 + m;
    }
    // clamp to +/- 3 years worth of minutes as a sanity bound
    const max = 3 * 365 * 24 * 60;
    if (minutes > max) minutes = max;
    if (minutes < -max) minutes = -max;

    const { error } = await supabaseAdmin
      .from('time_control')
      .update({ offset_minutes: minutes })
      .eq('id', true);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    // return the new state
    const { data: row } = await supabaseAdmin
      .from('time_control')
      .select('offset_minutes, updated_at')
      .maybeSingle();
    return new Response(JSON.stringify({ ok: true, offset_minutes: row?.offset_minutes ?? minutes, updated_at: row?.updated_at || null }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}

export async function DELETE(req) {
  const maybe = await requireAnyRole(req, ['admin', 'dev']);
  if (maybe instanceof Response) return maybe;
  try {
    const { error } = await supabaseAdmin
      .from('time_control')
      .update({ offset_minutes: 0 })
      .eq('id', true);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ ok: true, offset_minutes: 0 }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}
