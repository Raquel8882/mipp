"use client"

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from 'next/navigation';
import useCurrentUser from '../../lib/useCurrentUser';
import LoadingOverlay from '../../components/LoadingOverlay';

// Helper de fechas
const toDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const fmt2 = (n) => String(n).padStart(2, "0");

export default function SolicitudPermiso() {
  const router = useRouter();
  const { user: currentUser, roles, loading: authLoading } = useCurrentUser();
  const [user, setUser] = useState(null); // {cedula, nombre, apellidos, posicion, instancia}
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    tipoGeneral: "Salida", // Salida | Ausencia | Tardía | Incapacidad
    esRango: false,
    fecha: "",
    fechaFin: "",
    horaInicio: "",
    horaFin: "",
    jornada: "Media", // Media | Completa
    tipoSolicitud: "Cita medica personal",
    familiar: "",
    cantidad: "",
    unidad: "horas", // horas | lecciones
    observaciones: "",
    horaSalida: "",
    adjunto: null,
  });

  // Guardado temporal
  useEffect(() => {
    try { localStorage.setItem("permisoFormDraft", JSON.stringify(form)); } catch {}
  }, [form]);

  // Cargar borrador desde localStorage solo en cliente (evitar leer en el initializer)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("permisoFormDraft");
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);

  // Usar /api/me para rellenar usuario una vez autenticado
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("cedula,nombre,segundo_nombre,primer_apellido,segundo_apellido,posicion,instancia")
            .eq("cedula", currentUser.cedula)
            .maybeSingle();
          if (!error && data) setUser(data);
        } catch (err) {
          console.error('load user error', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading]);

  const nombreCompleto = useMemo(() => {
    if (!user) return "";
    const seg = user.segundo_nombre ? ` ${user.segundo_nombre}` : "";
    return `${user.nombre}${seg} ${user.primer_apellido} ${user.segundo_apellido}`.trim();
  }, [user]);

  const [hoyTxt, setHoyTxt] = useState({ dia: '', mes: '', anio: '', hora: '' });
  useEffect(() => {
    const now = new Date();
    const dia = fmt2(now.getDate());
    const mes = fmt2(now.getMonth() + 1);
    const anio = now.getFullYear();
    const hora = `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}`;
    setHoyTxt({ dia, mes, anio, hora });
  }, []);

  // UI helpers
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : files ? files[0] : value,
    }));
  };

  const toggleFechaModo = () => setForm((p) => ({ ...p, esRango: !p.esRango }));
  const toggleJornada = () => setForm((p) => ({
    ...p,
    jornada: p.jornada === "Media" ? "Completa" : "Media",
    horaSalida: p.jornada === "Media" ? "" : p.horaSalida,
  }));

  // Reglas anti-errores y helpers
  const validate = () => {
    const errors = [];
    const start = toDate(form.fecha);
    const end = form.esRango ? toDate(form.fechaFin) : start;
    const today = new Date();
    const in3Days = new Date(); in3Days.setDate(in3Days.getDate() + 3);
    const in1Year = new Date(); in1Year.setFullYear(in1Year.getFullYear() + 1);

    if (!start) errors.push("Selecciona la fecha de inicio");
    if (form.esRango && !end) errors.push("Selecciona la fecha fin");
    if (start && start < today.setHours(0,0,0,0)) errors.push("No se permite fecha pasada");
    if (start && start < in3Days.setHours(0,0,0,0)) errors.push("Debe solicitar con al menos 3 días de anticipación");
    if (start && start > in1Year) errors.push("La fecha no puede superar 1 año");
    if (end && end > in1Year) errors.push("La fecha fin no puede superar 1 año");
    if (start && end && end < start) errors.push("La fecha fin no puede ser anterior al inicio");

    // horas
    if (form.jornada === "Media") {
      if (!form.horaInicio || !form.horaFin) errors.push("Rango de horas requerido");
      const [hiH, hiM] = (form.horaInicio || "00:00").split(":").map(Number);
      const [hfH, hfM] = (form.horaFin || "00:00").split(":").map(Number);
      const startMin = hiH * 60 + hiM;
      const endMin = hfH * 60 + hfM;
      if (endMin <= startMin) errors.push("La hora fin debe ser mayor a inicio");
      if (endMin - startMin > 240) errors.push("Media jornada es hasta 4 horas");
    }

    // adjuntos según tipo
    if (form.tipoSolicitud === "Cita medica personal" || form.tipoSolicitud === "Asistencia a convocatoria") {
      if (!form.adjunto) errors.push("Debes adjuntar un documento de respaldo");
    }

    // familiar requerido cuando acompaña a familiar
    if (form.tipoSolicitud === "Acompañar a cita familiar" && !form.familiar) {
      errors.push("Selecciona el familiar");
    }

    // campos profesor/funcionario
    if (form.cantidad && Number(form.cantidad) <= 0) errors.push("Cantidad debe ser positiva");

    return errors;
  };

  const horaCompacta = () => {
    if (form.jornada === "Completa") return "JORNADA"; // <= 10 chars
    const raw = form.horaInicio ? (form.horaFin ? `${form.horaInicio}-${form.horaFin}` : form.horaInicio) : null;
    return raw ? raw.replace(/:/g, "") : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) { alert(errs.join("\n")); return; }
    setLoading(true);

    // Preparar payload compatible con `solicitudes_permiso`
    const fecha_inicio = form.fecha;
    const fecha_fin = form.esRango ? form.fechaFin : form.fecha;
    const horaValue = horaCompacta();
    if (horaValue && horaValue.length > 10) { setLoading(false); alert("Rango de horas demasiado largo"); return; }

    const cedula = user?.cedula || "";
    if (cedula && cedula.length > 20) { setLoading(false); alert("La cédula supera el límite de 20 caracteres para 'user_cedula'"); return; }

    // Subir adjunto si existe
  let adjunto_url = null;
  let adjunto_path = null;
    let adjunto_mime = null;
    try {
      if (form.adjunto) {
        const file = form.adjunto;
        adjunto_mime = file.type || null;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('cedula', cedula || 'anon');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'upload failed');
        }
  const j = await res.json();
  adjunto_url = j.publicUrl || null;
  adjunto_path = j.path || null;
      }
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      alert('No se pudo subir el adjunto. Error: ' + (uploadErr.message || String(uploadErr)));
      setLoading(false);
      return;
    }

    const payload = {
      user_cedula: cedula,
      nombre_solicitante: nombreCompleto,
      posicion: user?.posicion || '',
      instancia: user?.instancia || 'Propietario',
      tipo_general: form.tipoGeneral,
      tipo_solicitud: form.tipoSolicitud,
      familiar: form.tipoSolicitud === 'Acompañar a cita familiar' ? form.familiar || null : null,
      es_rango: !!form.esRango,
      fecha_inicio,
      fecha_fin,
      jornada: form.jornada,
      hora_inicio: form.jornada === 'Media' ? form.horaInicio : null,
      hora_fin: form.jornada === 'Media' ? form.horaFin : null,
      hora_compact: horaValue,
      cantidad: form.cantidad ? Number(form.cantidad) : null,
      unidad: form.cantidad ? (form.unidad === 'lecciones' ? 'lecciones' : 'horas') : null,
  observaciones: form.observaciones || null,
  hora_salida: form.jornada === 'Media' ? (form.horaSalida || null) : null,
      adjunto_url,
      adjunto_mime,
      adjunto_path,
    };

    try {
      // enviar al endpoint server que usará supabaseAdmin
      const res = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error en servidor');
      if (form.tipoSolicitud === "Atención de asuntos personales") {
        alert("Solicitud enviada. Recuerda hablar con Doña Laura.");
      } else {
        alert("Solicitud enviada");
      }
      try { localStorage.removeItem("permisoFormDraft"); } catch {}
      setForm({ tipoGeneral: "Salida", esRango:false, fecha:"", fechaFin:"", horaInicio:"", horaFin:"", jornada:"Media", tipoSolicitud:"Cita medica personal", familiar:"", cantidad:"", unidad:"horas", observaciones:"", horaSalida:"", adjunto:null });
    } catch (err) {
      console.error(err);
      alert("Error enviando la solicitud: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  // UI
  const isProfesor = useMemo(() => {
    const pos = (user?.posicion || "").toLowerCase();
    return pos.includes("profesor") || pos.includes("docente");
  }, [user]);

  useEffect(() => {
    setForm((p) => ({ ...p, unidad: isProfesor ? "lecciones" : "horas" }));
  }, [isProfesor]);

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: 24 }}>
  <LoadingOverlay show={authLoading || (!!currentUser && !user)} text="Cargando datos del usuario…" />
      {/* Breadcrumb simple (informativo) */}
      <nav style={{ marginBottom: 12, color: "#666" }} aria-label="breadcrumb">
        <span>Datos</span> <span>›</span> <span>Detalles</span> <span>›</span> <span>Adjuntos</span> <span>›</span> <span>Confirmación</span>
      </nav>

      <h2>Solicitud de permiso</h2>

      {/* Texto auto-rellenado del usuario */}
      <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 6, marginBottom: 16 }}>
        {user ? (
          <p>
            Quien se suscribe <strong>{nombreCompleto}</strong>, con cédula de identidad <strong>{user.cedula}</strong>, quien labora en la institución educativa CTP Mercedes Norte, en el puesto de <strong>{user.posicion}</strong>, en condición <strong>{user.instancia}</strong>.
          </p>
        ) : (
          <p>Inicia sesión para prellenar tus datos. <Link href="/login">Ir a login</Link></p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        {/* Tipo general */}
        <div style={{ marginBottom:12 }}>
          <label>Tipo <span style={{color:'red'}}>*</span>
            <select name="tipoGeneral" value={form.tipoGeneral} onChange={handleChange} style={{ display:'block' }}>
              <option>Salida</option>
              <option>Ausencia</option>
              <option>Tardía</option>
              <option>Incapacidad</option>
            </select>
          </label>
        </div>

        {/* Fecha o rango */}
        <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 12 }}>
          <div>
            <label title="Selecciona la fecha de inicio del permiso">Fecha inicio <span style={{color:'red'}}>*</span>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required style={{ display:'block' }} />
            </label>
          </div>
          {form.esRango && (
            <div>
              <label>Fecha fin <span style={{color:'red'}}>*</span>
                <input type="date" name="fechaFin" value={form.fechaFin} onChange={handleChange} required style={{ display:'block' }} />
              </label>
            </div>
          )}
          <button type="button" onClick={toggleFechaModo} title="Alterna entre una sola fecha o un rango">{form.esRango ? "Usar una sola fecha" : "Usar rango de fechas"}</button>
        </div>

        {/* Jornada y horas */}
        <div style={{ display:'flex', gap:12, alignItems:'end', marginBottom:12 }}>
          <div>
            <label title="Media jornada = hasta 4 horas">Jornada <span style={{color:'red'}}>*</span></label>
            <div>
              <button type="button" onClick={toggleJornada}>{form.jornada === "Media" ? "Cambiar a Jornada completa" : "Cambiar a Media jornada"}</button>
              <span style={{marginLeft:8}}>{form.jornada}</span>
            </div>
          </div>
          {form.jornada === "Media" && (
            <>
              <div>
                <label title="Hora de inicio">Hora inicio <span style={{color:'red'}}>*</span>
                  <input type="time" name="horaInicio" value={form.horaInicio} onChange={handleChange} required style={{ display:'block' }} />
                </label>
              </div>
              <div>
                <label title="Hora de fin">Hora fin <span style={{color:'red'}}>*</span>
                  <input type="time" name="horaFin" value={form.horaFin} onChange={handleChange} required style={{ display:'block' }} />
                </label>
              </div>
            </>
          )}

  </div>

        {/* Tipo de solicitud */}
        <div style={{ marginBottom:12 }}>
          <label>Tipo de solicitud <span style={{color:'red'}}>*</span>
            <select name="tipoSolicitud" value={form.tipoSolicitud} onChange={handleChange} style={{ display:'block' }}>
              <option>Cita medica personal</option>
              <option>Acompañar a cita familiar</option>
              <option>Asistencia a convocatoria</option>
              <option>Atención de asuntos personales</option>
            </select>
          </label>
        </div>

        {/* Dependiente del tipo */}
        {form.tipoSolicitud === "Acompañar a cita familiar" && (
          <div style={{ marginBottom:12 }}>
            <label>Familiar <span style={{color:'red'}}>*</span>
              <select name="familiar" value={form.familiar} onChange={handleChange} style={{ display:'block' }}>
                <option value="">Seleccione</option>
                <option>Padre</option>
                <option>Madre</option>
                <option>Hijos menores de edad</option>
                <option>Esposo/a</option>
                <option>Conyugue</option>
                <option>Hijos discapacitados</option>
              </select>
            </label>
          </div>
        )}

        {(form.tipoSolicitud === "Cita medica personal" || form.tipoSolicitud === "Asistencia a convocatoria") && (
          <div style={{ marginBottom:12 }}>
            <label>Adjuntar documento <span style={{color:'red'}}>*</span>
              <input type="file" name="adjunto" accept=".pdf,.doc,.docx,image/*" onChange={handleChange} style={{ display:'block' }} />
            </label>
            <span title="Se permiten imágenes (jpg, png), PDF y Word">¿Qué documentos? (?)</span>
          </div>
        )}

        {/* Cantidad según rol */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <label>{isProfesor ? "Cantidad de lecciones" : "Cantidad de horas"}
            <input type="number" name="cantidad" value={form.cantidad} onChange={handleChange} min={0} step={1} style={{ display:'block' }} />
          </label>
          <div>
            <label>Unidad</label>
            <input value={isProfesor ? "lecciones" : "horas"} readOnly style={{ display:'block', width:120 }} />
          </div>
        </div>

        {/* Observaciones y hora salida */}
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <label style={{ flex:1 }}>Observaciones
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} style={{ width:'100%' }} placeholder="Opcional" />
          </label>
          {form.jornada === 'Media' && (
            <label title="Hora de salida del centro educativo">Hora de salida
              <input type="time" name="horaSalida" value={form.horaSalida} onChange={handleChange} style={{ display:'block' }} />
            </label>
          )}
        </div>

        {/* Texto de presentación */}
        <div style={{ background:'#f7f7f7', padding:10, borderRadius:6, marginBottom:12 }}>
          <p>Presento la solicitud a las <strong>{hoyTxt.hora}</strong> del día <strong>{hoyTxt.dia}</strong> del mes <strong>{hoyTxt.mes}</strong> del año <strong>{hoyTxt.anio}</strong>.</p>
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button type="submit" disabled={loading} style={{ padding: 10, background: "#0070f3", color: "white", border: "none", borderRadius: 6 }} title="Envia tu solicitud">
            {loading ? "Enviando tu solicitud, esto puede tardar unos segundos..." : "Enviar formulario"}
          </button>
          <Link href="/login">Volver al menú</Link>
        </div>
      </form>
    </div>
  );
}
