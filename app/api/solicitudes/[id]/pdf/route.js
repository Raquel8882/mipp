export const runtime = 'nodejs';

import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';

export async function GET(req, { params }) {
  const { id } = params || {};
  if (!id) return new Response('Missing id', { status: 400 });

  const { getUserAndRolesFromRequest } = await import('../../../../../lib/authHelpers');
  const info = await getUserAndRolesFromRequest(req);
  if (!info) return new Response('No autenticado', { status: 401 });

  const { data: row, error } = await supabaseAdmin
    .from('solicitudes_permiso')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !row) return new Response('No encontrado', { status: 404 });

  const isPrivileged = (info.roles || []).some(r => ['admin', 'dev', 'staff_manager'].includes(r));
  if (!isPrivileged && row.user_cedula !== info.user.cedula) {
    return new Response('Prohibido', { status: 403 });
  }

  const { data: atts } = await supabaseAdmin
    .from('solicitud_adjuntos')
    .select('path, public_url, mime, uploaded_at')
    .eq('solicitud_id', row.id)
    .order('uploaded_at', { ascending: false });

  // Use pdf-lib for compatibility with Next/SWC
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 in points
  const { width } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 792; // top (842 - margin)
  const line = (x1, y1, x2, y2, color = rgb(0.06, 0.46, 0.43)) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color });
  };
  const text = (txt, x, yPos, size = 12, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(String(txt), { x, y: yPos, size, font: bold ? fontBold : fontRegular, color });
  };

  // Header
  text('CTP Mercedes Norte', margin, y, 18, true, rgb(0.07, 0.07, 0.07));
  y -= 20;
  text('Solicitud de Permiso', margin, y, 14, true, rgb(0.06, 0.46, 0.43));
  y -= 16;
  line(margin, y, margin + contentWidth, y);
  y -= 14;

  // Meta
  text(`Folio: ${row.id}`, margin, y, 10, false, rgb(0.26, 0.26, 0.26));
  y -= 12;
  text(`Estado: ${row.estado || 'Sin estado'}`, margin, y, 10, false, rgb(0.26, 0.26, 0.26));
  y -= 18;

  const section = (title) => {
    text(title, margin, y, 12, true);
    y -= 6;
    line(margin, y, margin + contentWidth, y, rgb(0.8, 0.8, 0.8));
    y -= 12;
  };

  const write = (label, value) => {
    text(`${label}:`, margin, y, 11, true);
    text(` ${value ?? '—'}`, margin + 60, y, 11);
    y -= 14;
  };

  // Resumen
  section('Resumen');
  write('Tipo general', row.tipo_general || '—');
  write('Motivo', row.tipo_solicitud || '—');
  write('Fecha(s)', `${row.fecha_inicio}${row.es_rango ? ` → ${row.fecha_fin}` : ''}`);
  const horas = (row.hora_inicio || row.hora_fin) ? `(${row.hora_inicio || ''}${row.hora_fin ? ' - ' + row.hora_fin : ''})` : '';
  write('Jornada', `${row.jornada || '—'} ${horas}`.trim());

  // Solicitante
  section('Solicitante');
  write('Nombre', row.nombre_solicitante || '—');
  write('Cédula', row.user_cedula || '—');
  write('Posición', row.posicion || '—');
  write('Instancia', row.instancia || '—');

  // Detalle
  section('Detalle');
  let hasDetail = false;
  if (row.familiar) { write('Familiar', row.familiar); hasDetail = true; }
  if (row.cantidad) { write('Cantidad', `${row.cantidad} ${row.unidad || ''}`); hasDetail = true; }
  if (row.hora_salida) { write('Hora de salida', row.hora_salida); hasDetail = true; }
  if (row.observaciones) { write('Observaciones', row.observaciones); hasDetail = true; }
  if (!hasDetail) { text('—', margin, y, 11); y -= 14; }

  // Adjuntos
  section('Adjuntos');
  if (!atts || atts.length === 0) {
    text('No hay archivos adjuntos.', margin, y, 11);
    y -= 14;
  } else {
    atts.forEach((a, idx) => {
      const name = a.path ? a.path.split('/').slice(-1)[0] : (a.public_url || `Adjunto ${idx + 1}`);
      const kind = a.mime?.includes('image/') ? 'Imagen' : (a.mime || 'Archivo');
      text(`• ${kind}: ${name}`, margin, y, 11);
      y -= 14;
    });
  }

  // Footer
  text('Generado por el sistema de permisos', margin, 40, 9, false, rgb(0.4, 0.4, 0.4));

  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="solicitud_${row.id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
