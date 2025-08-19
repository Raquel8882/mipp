"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import useCurrentUser from '../../lib/useCurrentUser';

export default function GestionarMarcaPage(){
  const router = useRouter();
  const { user: currentUser, roles, loading: authLoading } = useCurrentUser();
  const isAdmin = Array.isArray(roles) && roles.includes('admin');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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
          .from('omision_marca')
          .select('*')
          .or('estado.is.null,estado.eq.Pendiente,estado.eq.pendiente')
          .order('creado_en', { ascending: false });
        if(error) throw error;
        setRows(data || []);
      }catch(err){
        console.error('listar pendientes omision_marca', err);
        setRows([]);
      }finally{
        setLoading(false);
      }
    };
    if (isAdmin) load();
  }, [isAdmin]);

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: 24 }}>
      <nav style={{ marginBottom: 12 }}>
        <Link href="/home">← Volver</Link>
      </nav>
      <h2>Gestionar omisiones de marca (Pendientes)</h2>
      {loading ? <p>Cargando…</p> : (
        rows.length === 0 ? <p>No hay omisiones pendientes.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f3f4f6' }}>
                  <th style={{ textAlign:'left', padding:8 }}>#</th>
                  <th style={{ textAlign:'left', padding:8 }}>Ingresado</th>
                  <th style={{ textAlign:'left', padding:8 }}>Funcionario</th>
                  <th style={{ textAlign:'left', padding:8 }}>Tipo</th>
                  <th style={{ textAlign:'left', padding:8 }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const dt = r.creado_en ? new Date(r.creado_en) : null;
                  const fecha = dt ? dt.toLocaleDateString() : '—';
                  const hora = dt ? dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
                  return (
                    <tr key={r.id} style={{ borderBottom:'1px solid #eee' }}>
                      <td style={{ padding:8 }}>#{r.id}</td>
                      <td style={{ padding:8 }}>{fecha} {hora && `• ${hora}`}</td>
                      <td style={{ padding:8 }}>{r.nombre_suscriptor || '—'}</td>
                      <td style={{ padding:8 }}>{r.tipo_omision || 'Omisión'}</td>
                      <td style={{ padding:8 }}>
                        <Link href={`/omisionmarca/${r.id}`}>Abrir</Link>
                        {' '}|{' '}
                        <Link href={`/omisionmarca/${r.id}/responder`} style={{ color:'#2563eb' }}>Responder</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
