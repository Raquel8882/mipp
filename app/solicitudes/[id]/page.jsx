"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import useCurrentUser from '../../../lib/useCurrentUser';

export default function SolicitudDetalle() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, roles, loading: authLoading } = useCurrentUser();
  const isAdmin = Array.isArray(roles) && roles.includes('admin');
  const [row, setRow] = useState(null);
  const [adjuntos, setAdjuntos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Load solicitud (client-side filter to the current user)
        let q = supabase
          .from('solicitudes_permiso')
          .select('*')
          .eq('id', id)
          .limit(1);
        const { data, error } = await q;
        if (error) throw error;
        const item = data && data[0];
        if (!item) {
          setRow(null);
        } else {
          setRow(item);
          // Load attachments
          const { data: atts, error: attErr } = await supabase
            .from('solicitud_adjuntos')
            .select('*')
            .eq('solicitud_id', item.id)
            .order('uploaded_at', { ascending: false });
          if (!attErr) setAdjuntos(atts || []);
        }
      } catch (err) {
        console.error('detalle solicitud error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const nombreTipo = useMemo(() => row?.tipo_solicitud || 'Solicitud', [row]);

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/home">← Volver al historial</Link>
      </nav>

      {loading ? (
        <p>Cargando solicitud...</p>
      ) : !row ? (
        <p>No se encontró la solicitud.</p>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ margin:0 }}>Detalle de solicitud</h2>
            <a href={`/api/solicitudes/${id}/pdf`} target="_blank" rel="noreferrer" style={{ padding:'8px 12px', background:'#0f766e', color:'#fff', borderRadius:6, textDecoration:'none' }}>
              Descargar PDF
            </a>
          </div>

          {isAdmin && (
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', padding:12, borderRadius:6, marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <strong>Acción de administrador:</strong> Puedes responder esta solicitud.
                </div>
                <Link href={`/solicitudes/${id}/responder`} style={{ padding:'8px 12px', background:'#d97706', color:'#fff', borderRadius:6, textDecoration:'none' }}>Ir a Responder</Link>
              </div>
            </div>
          )}

          {/* Cabecera */}
          <section style={{ background: '#f7f7f7', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <p><strong>Tipo:</strong> {row.tipo_general || '—'} • <strong>Motivo:</strong> {nombreTipo}</p>
            <p><strong>Estado:</strong> {row.estado || 'Sin estado'}</p>
            <p><strong>Fecha(s):</strong> {row.fecha_inicio}{row.es_rango ? ` → ${row.fecha_fin}` : ''}</p>
            <p><strong>Jornada:</strong> {row.jornada || '—'}{row.hora_inicio || row.hora_fin ? ` (${row.hora_inicio || ''}${row.hora_fin ? ` - ${row.hora_fin}` : ''})` : ''}</p>
          </section>

          {/* Datos del solicitante */}
          <section style={{ marginBottom: 16 }}>
            <h3>Solicitante</h3>
            <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
              <p><strong>Nombre:</strong> {row.nombre_solicitante || '—'}</p>
              <p><strong>Cédula:</strong> {row.user_cedula || '—'}</p>
              <p><strong>Posición:</strong> {row.posicion || '—'}</p>
              <p><strong>Instancia:</strong> {row.instancia || '—'}</p>
            </div>
          </section>

          {/* Campos específicos */}
          <section style={{ marginBottom: 16 }}>
            <h3>Detalle</h3>
            <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
              {row.familiar && <p><strong>Familiar:</strong> {row.familiar}</p>}
              {row.cantidad && <p><strong>Cantidad:</strong> {row.cantidad} {row.unidad || ''}</p>}
              {row.hora_salida && <p><strong>Hora de salida:</strong> {row.hora_salida}</p>}
              {row.observaciones && <p><strong>Observaciones:</strong> {row.observaciones}</p>}
            </div>
          </section>

          {/* Resolución */}
          {(row.estado || row.respuesta_en || row.respuesta_comentario) && (
            <section style={{ marginBottom: 16 }}>
              <h3>Resolución</h3>
              <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
                <p><strong>Estado:</strong> {row.estado || '—'}</p>
                {row.respuesta_en && (
                  <p><strong>Fecha de decisión:</strong> {new Date(row.respuesta_en).toLocaleString()}</p>
                )}
                {row.respuesta_nombre && (
                  <p><strong>Decidido por:</strong> {row.respuesta_nombre}</p>
                )}
                {row.respuesta_comentario && (
                  <div>
                    <p><strong>Comentario:</strong></p>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{row.respuesta_comentario}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Adjuntos */}
          <section>
            <h3>Adjuntos</h3>
            {adjuntos.length === 0 ? (
              <p style={{ color: '#666' }}>No hay archivos adjuntos.</p>
            ) : (
              <ul>
                {adjuntos.map((a) => (
                  <li key={a.id}>
                    <a href={a.public_url || '#'} target="_blank" rel="noreferrer">
                      {a.mime?.includes('image/') ? 'Imagen' : a.mime || 'Archivo'}
                    </a>
                    {a.path ? <span style={{ color: '#777' }}> — {a.path.split('/').slice(-1)[0]}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
