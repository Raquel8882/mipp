"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, password }),
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        const msg = [data?.error || 'Error en servidor', data?.detail, data?.hint].filter(Boolean).join(' | ');
        throw new Error(msg);
      }
      if (data.must_change_password) {
        router.push('/change-password?cedula=' + encodeURIComponent(cedula));
      } else {
        router.push('/home');
      }
    } catch (err) {
      alert('Error en login: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Login</h2>
      <label style={{ display: 'block', marginBottom: 8 }}>Identificación (cédula):
        <input value={cedula} onChange={(e)=>setCedula(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4 }} />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>Contraseña:
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4 }} />
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button disabled={loading} type="submit">{loading ? 'Entrando...' : 'Entrar'}</button>
      </div>
    </form>
  );
}
