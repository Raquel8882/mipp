"use client";

import React, { useEffect, useState } from 'react';
import useCurrentUser from '../../../lib/useCurrentUser';

export default function AdminRolesPage() {
  const { user, roles, loading } = useCurrentUser();
  const [roleList, setRoleList] = useState([]);
  const [cedula, setCedula] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (!user || !(roles || []).some(r => ['admin','dev'].includes(r)))) {
      setMessage('No autorizado');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/admin/roles');
        const j = await res.json();
        if (res.ok) setRoleList(j.data || []);
      } catch (err) { console.error(err); }
    })();
  }, [user, roles, loading]);

  const assignRole = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify({ cedula, role_slug: selectedRole }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setMessage('Rol asignado');
    } catch (err) { setMessage('Error: ' + (err.message || String(err))); }
  };

  const removeRole = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/roles', { method: 'DELETE', headers: { 'Content-Type':'application/json'}, body: JSON.stringify({ cedula, role_slug: selectedRole }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setMessage('Rol removido');
    } catch (err) { setMessage('Error: ' + (err.message || String(err))); }
  };

  if (message === 'No autorizado') return <div style={{ padding: 20 }}><h3>No autorizado</h3></div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Administrar roles</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Cédula del usuario: <input value={cedula} onChange={(e)=>setCedula(e.target.value)} /></label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Rol: <select value={selectedRole} onChange={(e)=>setSelectedRole(e.target.value)}>
          <option value="">Seleccione</option>
          {roleList.map(r => <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>)}
        </select></label>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={assignRole}>Asignar rol</button>
        <button onClick={removeRole}>Remover rol</button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
