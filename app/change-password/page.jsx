"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const [cedula, setCedula] = React.useState('');
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const c = sp.get('cedula');
      if (c) setCedula(c);
    } catch (e) {}
  }, []);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return alert('La contraseña debe tener al menos 8 caracteres');
    setLoading(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ cedula, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      alert('Contraseña cambiada correctamente');
      router.push('/login');
    } catch (err) {
      alert('Error cambiando contraseña: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth:400, margin:'2rem auto' }}>
      <h2>Cambiar contraseña</h2>
      <p>Usuario: <strong>{cedula}</strong></p>
      <label>Nueva contraseña:<input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required /></label>
      <button disabled={loading} type="submit">{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</button>
    </form>
  );
}
