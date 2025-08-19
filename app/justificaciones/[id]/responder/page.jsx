"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import useCurrentUser from '../../../../lib/useCurrentUser';

const fmt2 = (n) => String(n).padStart(2, '0');

export default function ResponderJustificacionPage(){
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, roles, loading: authLoading } = useCurrentUser();
  const isAdmin = Array.isArray(roles) && roles.includes('admin');
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState('Aceptar con rebajo salarial parcial');
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    if (!authLoading && (!currentUser || !isAdmin)) {
      router.push('/login');
      return;
    }
  }, [authLoading, currentUser, isAdmin, router]);

  useEffect(() => {
    const load = async () => {
      try{
        setLoading(true);
        const { data, error } = await supabase
          .from('justificaciones')
          .select('*')
          .eq('id', id)
          .limit(1);
        if(error) throw error;
        setRow((data && data[0]) || null);
      }catch(err){
        console.error('cargar justificación', err);
        setRow(null);
      }finally{
        setLoading(false);
      }
    };
    if (isAdmin && id) load();
  }, [isAdmin, id]);

  const now = useMemo(() => new Date(), []);
  const fechaTxt = useMemo(() => {
    const d = now;
    return `${fmt2(d.getDate())}/${fmt2(d.getMonth()+1)}/${d.getFullYear()} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
  }, [now]);

  const nombreAdmin = useMemo(() => {
    if (!currentUser) return '';
    const seg = currentUser.segundo_nombre ? ` ${currentUser.segundo_nombre}` : '';
    return `${currentUser.nombre}${seg} ${currentUser.primer_apellido} ${currentUser.segundo_apellido}`.trim();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      const res = await fetch(`/api/justificaciones/${id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comentario }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error en servidor');
      alert('Respuesta enviada');
      router.push(`/justificaciones/${id}`);
    }catch(err){
      console.error(err);
      alert('No se pudo enviar la respuesta: ' + (err.message || String(err)));
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 24 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href={`/justificaciones/${id}`}>← Volver a la justificación</Link>
      </nav>
      <h2>Responder justificación #{id}</h2>

      {loading || !row ? (
        <p>Cargando…</p>
      ) : (
        <>
          <div style={{ background:'#f7f7f7', padding:12, borderRadius:6, marginBottom:16 }}>
            <p><strong>Fecha y hora:</strong> {fechaTxt}</p>
            <p>
              Quien suscribe, <strong>{nombreAdmin}</strong> en calidad de <strong>Directora</strong>, con base en las leyes y reglamentos vigentes,
              responde a la justificación; bajo la resolución de:
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'grid', gap:12 }}>
            <label>
              Resolución
              <select value={decision} onChange={(e)=>setDecision(e.target.value)} style={{ display:'block' }}>
                <option>Aceptar con rebajo salarial parcial</option>
                <option>Aceptar con rebajo salarial total</option>
                <option>Aceptar sin rebajo salarial</option>
                <option>Denegar lo solicitado</option>
                <option>Acoger convocatioria</option>
              </select>
            </label>
            <label>
              Comentario adicional
              <textarea value={comentario} onChange={(e)=>setComentario(e.target.value)} rows={4} style={{ width:'100%' }} placeholder="Opcional" />
            </label>
            <div>
              <button type="submit" style={{ padding:'8px 12px', background:'#0f766e', color:'#fff', borderRadius:6 }}>Enviar respuesta</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
