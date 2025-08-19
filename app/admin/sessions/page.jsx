"use client";

import React, { useEffect, useState } from 'react';
import useCurrentUser from '../../../lib/useCurrentUser';

export default function AdminSessionsPage() {
  const { user, roles, loading } = useCurrentUser();
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (!user || !(roles || []).some(r => ['admin','dev'].includes(r)))) {
      setMessage('No autorizado');
      return;
    }
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roles, loading]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/sessions');
      const j = await res.json();
      if (res.ok) setSessions(j.data || []);
    } catch (err) { console.error(err); }
  };

  const revoke = async (id) => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/sessions', { method: 'DELETE', headers: { 'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setMessage('Sesión revocada');
      fetchSessions();
    } catch (err) { setMessage('Error: ' + (err.message || String(err))); }
  };

  if (message === 'No autorizado') return <div style={{ padding: 20 }}><h3>No autorizado</h3></div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Sesiones activas</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>ID</th><th>User ID</th><th>Created</th><th>Expires</th><th>Revoked</th><th></th></tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} style={{ borderTop: '1px solid #ddd' }}>
              <td style={{ padding: 8 }}>{s.id}</td>
              <td style={{ padding: 8 }}>{s.user_id}</td>
              <td style={{ padding: 8 }}>{new Date(s.created_at).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{s.expires_at ? new Date(s.expires_at).toLocaleString() : ''}</td>
              <td style={{ padding: 8 }}>{s.revoked ? 'Sí' : 'No'}</td>
              <td style={{ padding: 8 }}><button onClick={() => revoke(s.id)}>Revocar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {message && <p>{message}</p>}
    </div>
  );
}
