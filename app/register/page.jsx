"use client"

import React, { useState } from "react";
// Enviaremos los datos al endpoint server-side /api/register

export default function RegisterPage() {
  const [form, setForm] = useState({
    cedula: "",
    nombre: "",
    segundo_nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    posicion: "",
    categoria: "Titulo I",
    instancia: "Propietario",
  // password fields removed per request
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  // Basic client-side validation
  if (!form.cedula || !form.nombre || !form.primer_apellido || !form.segundo_apellido || !form.posicion) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const body = {
        cedula: form.cedula,
        nombre: form.nombre,
        segundo_nombre: form.segundo_nombre || null,
        primer_apellido: form.primer_apellido,
        segundo_apellido: form.segundo_apellido,
        posicion: form.posicion,
        categoria: form.categoria,
        instancia: form.instancia,
        // no enviar password: el servidor usará admin123 por defecto
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error en el servidor');
      alert('Usuario creado correctamente');
      setForm({ cedula: '', nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', posicion: '', categoria: 'Titulo I', instancia: 'Propietario' });
    } catch (err) {
      console.error(err);
      alert('Error creando el usuario: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "2rem auto", padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2>Registrar usuario</h2>

      <label>
        Cédula (identificación)*:
        <input name="cedula" value={form.cedula} onChange={handleChange} required style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Nombre*:
        <input name="nombre" value={form.nombre} onChange={handleChange} required style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Segundo nombre:
        <input name="segundo_nombre" value={form.segundo_nombre} onChange={handleChange} style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Primer apellido*:
        <input name="primer_apellido" value={form.primer_apellido} onChange={handleChange} required style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Segundo apellido*:
        <input name="segundo_apellido" value={form.segundo_apellido} onChange={handleChange} required style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Posición*:
        <input name="posicion" value={form.posicion} onChange={handleChange} required style={{ width: "100%", marginBottom: 8 }} />
      </label>

      <label>
        Categoría*:
        <select name="categoria" value={form.categoria} onChange={handleChange} style={{ width: "100%", marginBottom: 8 }}>
          <option value="Titulo I">Titulo I</option>
          <option value="Titulo II">Titulo II</option>
        </select>
      </label>

      <label>
        Instancia*:
        <select name="instancia" value={form.instancia} onChange={handleChange} style={{ width: "100%", marginBottom: 8 }}>
          <option value="Propietario">Propietario</option>
          <option value="Interino">Interino</option>
        </select>
      </label>

  <p>La contraseña por defecto para el usuario será <strong>admin123</strong>. El usuario deberá cambiarla al iniciar sesión.</p>

      <button type="submit" disabled={loading} style={{ padding: 10, background: "#0070f3", color: "white", border: "none", borderRadius: 6 }}>
        {loading ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
