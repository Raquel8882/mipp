"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { supabase } from "../../lib/supabaseClient";
import useCurrentUser from "../../lib/useCurrentUser";
import LoadingOverlay from '../../components/LoadingOverlay';

const fmt2 = (n) => String(n).padStart(2, "0");
const todayParts = () => {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${fmt2(now.getMonth()+1)}-${fmt2(now.getDate())}`,
    time: `${fmt2(now.getHours())}:${fmt2(now.getMinutes())}`,
  };
};

export default function FormJustificacion() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useCurrentUser();
  const [user, setUser] = useState(null); // users row
  const [loading, setLoading] = useState(false);
  const [misSolicitudes, setMisSolicitudes] = useState([]);

  const [conSolicitud, setConSolicitud] = useState(false);
  const [solicitudSel, setSolicitudSel] = useState("");

  const [form, setForm] = useState({
    tipoGeneral: "Salida", // Ausencia | Tardía | Salida | Incapacidad
    esRango: false,
    fecha: "",
    fechaFin: "",
    jornada: "Media", // Media | Completa
    horaInicio: "",
    horaFin: "",
    cantidad: "",
    unidad: "horas",
    horaSalida: "",
    tipoJustificacion: "Cita medica personal",
    familiar: "",
    observaciones: "",
    adjunto: null,
    // fecha/hora en que se justifica
    justFecha: todayParts().date,
    justHora: todayParts().time,
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }
  }, [authLoading, currentUser, router]);

  // Load user profile
  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      const { data } = await supabase
        .from('users')
        .select('cedula,nombre,segundo_nombre,primer_apellido,segundo_apellido,posicion,instancia')
        .eq('cedula', currentUser.cedula)
        .maybeSingle();
      if (data) setUser(data);
    })();
  }, [currentUser]);

  // Load my solicitudes for autofill when conSolicitud
  useEffect(() => {
    (async () => {
      if (!currentUser || !conSolicitud) return;
      const { data, error } = await supabase
        .from('solicitudes_permiso')
        .select('id, tipo_general, tipo_solicitud, es_rango, fecha_inicio, fecha_fin, jornada, hora_inicio, hora_fin, cantidad, unidad, hora_salida')
        .eq('user_cedula', currentUser.cedula)
        .order('id', { ascending: false })
        .limit(100);
      if (!error) setMisSolicitudes(data || []);
    })();
  }, [currentUser, conSolicitud]);

  const nombreCompleto = useMemo(() => {
    if (!user) return "";
    const seg = user.segundo_nombre ? ` ${user.segundo_nombre}` : "";
    return `${user.nombre}${seg} ${user.primer_apellido} ${user.segundo_apellido}`.trim();
  }, [user]);

  const isProfesor = useMemo(() => {
    const pos = (user?.posicion || '').toLowerCase();
    return pos.includes('profesor') || pos.includes('docente');
  }, [user]);

  useEffect(() => {
    setForm((p) => ({ ...p, unidad: isProfesor ? 'lecciones' : 'horas' }));
  }, [isProfesor]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : files ? files[0] : value,
    }));
  };

  const toggleFechaModo = () => setForm((p) => ({ ...p, esRango: !p.esRango }));
  const toggleJornada = () => setForm((p) => ({ ...p, jornada: p.jornada === 'Media' ? 'Completa' : 'Media' }));

  // When selecting a solicitud to justify, autofill fields
  const handleSelectSolicitud = (e) => {
    const val = e.target.value;
    setSolicitudSel(val);
    // If user resets to default option, clear previously auto-filled fields
    if (!val) {
      setForm((p) => ({
        ...p,
        tipoGeneral: 'Salida',
        esRango: false,
        fecha: '',
        fechaFin: '',
        jornada: 'Media',
        horaInicio: '',
        horaFin: '',
        cantidad: '',
        unidad: (isProfesor ? 'lecciones' : 'horas'),
        horaSalida: '',
        tipoJustificacion: 'Cita medica personal',
      }));
      return;
    }
    const s = misSolicitudes.find(r => String(r.id) === String(val));
    if (!s) return;
    setForm((p) => ({
      ...p,
      tipoGeneral: s.tipo_general || p.tipoGeneral,
      esRango: !!s.es_rango,
      fecha: s.fecha_inicio || p.fecha,
      fechaFin: s.fecha_fin || p.fechaFin,
      jornada: s.jornada || p.jornada,
      horaInicio: s.hora_inicio || p.horaInicio,
      horaFin: s.hora_fin || p.horaFin,
      cantidad: s.cantidad != null ? String(s.cantidad) : p.cantidad,
      unidad: s.unidad || p.unidad,
      horaSalida: s.hora_salida || p.horaSalida,
      tipoJustificacion: [
        'Cita medica personal',
        'Acompañar a cita familiar',
        'Asistencia a convocatoria',
        'Atención de asuntos personales'
      ].includes(s.tipo_solicitud) ? s.tipo_solicitud : p.tipoJustificacion,
    }));
  };

  const validate = () => {
    const errors = [];
    if (!form.fecha) errors.push('Selecciona la fecha inicio que justificas');
    if (form.esRango && !form.fechaFin) errors.push('Selecciona la fecha fin que justificas');
    if (form.jornada === 'Media') {
      if (!form.horaInicio || !form.horaFin) errors.push('Rango de horas requerido para media jornada');
    }
    if (!form.justFecha) errors.push('Fecha en que se justifica requerida');
    if (!form.justHora) errors.push('Hora en que se justifica requerida');
    if (['Cita medica personal','Asistencia a convocatoria','Acompañar a cita familiar'].includes(form.tipoJustificacion)) {
      if (!form.adjunto) errors.push('Debes adjuntar un documento de respaldo');
    }
    if (form.tipoJustificacion === 'Acompañar a cita familiar' && !form.familiar) {
      errors.push('Selecciona el familiar');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) { alert(errs.join('\n')); return; }
    setLoading(true);

    // Upload file if exists
    let adjunto_url = null, adjunto_path = null, adjunto_mime = null;
    try {
      if (form.adjunto) {
        const file = form.adjunto;
        adjunto_mime = file.type || null;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('cedula', user?.cedula || 'anon');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        const j = await res.json();
        adjunto_url = j.publicUrl || null;
        adjunto_path = j.path || null;
      }
    } catch (err) {
      console.error('upload error', err);
      alert('No se pudo subir el adjunto: ' + (err.message || String(err)));
      setLoading(false);
      return;
    }

    const payload = {
      linked_solicitud_id: conSolicitud && solicitudSel ? Number(solicitudSel) : null,
      user_cedula: user?.cedula || null,
      nombre_suscriptor: nombreCompleto || null,
      posicion: user?.posicion || null,
      instancia: user?.instancia || null,
      tipo_general: form.tipoGeneral,
      tipo_justificacion: form.tipoJustificacion,
      es_rango: !!form.esRango,
      fecha_inicio: form.fecha,
      fecha_fin: form.esRango ? form.fechaFin : form.fecha,
      jornada: form.jornada,
      hora_inicio: form.jornada === 'Media' ? form.horaInicio : null,
      hora_fin: form.jornada === 'Media' ? form.horaFin : null,
      cantidad: form.cantidad ? Number(form.cantidad) : null,
      unidad: form.cantidad ? (form.unidad === 'lecciones' ? 'lecciones' : 'horas') : null,
      hora_salida: form.horaSalida || null,
      justificacion_fecha: form.justFecha,
      justificacion_hora: form.justHora,
      observaciones: form.observaciones || null,
      familiar: form.tipoJustificacion === 'Acompañar a cita familiar' ? form.familiar || null : null,
      adjunto_url, adjunto_path, adjunto_mime,
    };

    try {
      const res = await fetch('/api/justificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error en servidor');
      if (form.tipoJustificacion === 'Atención de asuntos personales') {
        alert('Justificación enviada. Recuerda hablar con Doña Laura.');
      } else {
        alert('Justificación enviada.');
      }
      router.push('/home');
    } catch (err) {
      console.error(err);
      alert('Error enviando la justificación: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '2rem auto', padding: 24 }}>
  <LoadingOverlay show={authLoading || (!!currentUser && !user)} text="Cargando datos del usuario…" />
      <nav style={{ marginBottom: 12 }}>
        <Link href="/home">← Volver al menú</Link>
      </nav>
      <h2>Formulario de justificación</h2>

      <div style={{ background:'#f7f7f7', padding:12, borderRadius:6, marginBottom:16 }}>
        {user ? (
          <p>
            Quien se suscribe <strong>{nombreCompleto}</strong>, con cédula de identidad <strong>{user.cedula}</strong>, quien labora en la institución educativa CTP Mercedes Norte, en el puesto de <strong>{user.posicion}</strong>, en condición <strong>{user.instancia}</strong>.
          </p>
        ) : (
          <p>Inicia sesión para prellenar tus datos.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ border:'1px solid #ddd', padding:16, borderRadius:8 }}>
        {/* Con o sin solicitud */}
        <div style={{ marginBottom:12 }}>
          <label>¿Justifica una solicitud existente?</label>
          <div style={{ display:'flex', gap:16, alignItems:'center', marginTop:6 }}>
            <label><input type="radio" name="conSolicitud" checked={conSolicitud} onChange={() => setConSolicitud(true)} /> Sí</label>
            <label><input type="radio" name="conSolicitud" checked={!conSolicitud} onChange={() => setConSolicitud(false)} /> No</label>
          </div>
          {conSolicitud && (
            <div style={{ marginTop:8 }}>
              <label>Selecciona la solicitud
                <select value={solicitudSel} onChange={handleSelectSolicitud} style={{ display:'block', marginTop:6 }}>
                  <option value="">-- Selecciona --</option>
                  {misSolicitudes.map(s => (
                    <option key={s.id} value={s.id}>#{s.id} • {s.fecha_inicio}{s.es_rango ? ` → ${s.fecha_fin}` : ''} • {s.jornada}{s.hora_inicio ? ` (${s.hora_inicio}${s.hora_fin ? ` - ${s.hora_fin}` : ''})` : ''}</option>
                  ))}
                </select>
              </label>
              <small>Al seleccionar, se autorellenan los campos.</small>
            </div>
          )}
        </div>

        {/* Tipo general */}
        <div style={{ marginBottom:12 }}>
          <label>Tipo
            <select name="tipoGeneral" value={form.tipoGeneral} onChange={handleChange} style={{ display:'block' }}>
              <option>Salida</option>
              <option>Ausencia</option>
              <option>Tardía</option>
              <option>Incapacidad</option>
            </select>
          </label>
        </div>

        {/* Fecha o rango */}
        <div style={{ display:'flex', gap:12, alignItems:'end', marginBottom:12 }}>
          <div>
            <label>Fecha inicio <span style={{color:'red'}}>*</span>
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
          <button type="button" onClick={toggleFechaModo}>{form.esRango ? 'Usar una sola fecha' : 'Usar rango de fechas'}</button>
        </div>

        {/* Jornada y horas */}
        <div style={{ display:'flex', gap:12, alignItems:'end', marginBottom:12 }}>
          <div>
            <label>Jornada</label>
            <div>
              <button type="button" onClick={toggleJornada}>{form.jornada === 'Media' ? 'Cambiar a Jornada completa' : 'Cambiar a Media jornada'}</button>
              <span style={{ marginLeft:8 }}>{form.jornada}</span>
            </div>
          </div>
          {form.jornada === 'Media' && (
            <>
              <div>
                <label>Hora inicio <span style={{color:'red'}}>*</span>
                  <input type="time" name="horaInicio" value={form.horaInicio} onChange={handleChange} required style={{ display:'block' }} />
                </label>
              </div>
              <div>
                <label>Hora fin <span style={{color:'red'}}>*</span>
                  <input type="time" name="horaFin" value={form.horaFin} onChange={handleChange} required style={{ display:'block' }} />
                </label>
              </div>
            </>
          )}
          <div>
            <label>Hora de salida
              <input type="time" name="horaSalida" value={form.horaSalida} onChange={handleChange} style={{ display:'block' }} />
            </label>
          </div>
        </div>

        {/* Cantidad */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <label>{isProfesor ? 'Cantidad de lecciones' : 'Cantidad de horas'}
            <input type="number" name="cantidad" value={form.cantidad} onChange={handleChange} min={0} step={1} style={{ display:'block' }} />
          </label>
          <div>
            <label>Unidad</label>
            <input value={isProfesor ? 'lecciones' : 'horas'} readOnly style={{ display:'block', width:120 }} />
          </div>
        </div>

        {/* Tipo de justificación */}
        <div style={{ marginBottom:12 }}>
          <label>Tipo de justificación
            <select name="tipoJustificacion" value={form.tipoJustificacion} onChange={handleChange} style={{ display:'block' }}>
              <option>Cita medica personal</option>
              <option>Acompañar a cita familiar</option>
              <option>Asistencia a convocatoria</option>
              <option>Atención de asuntos personales</option>
            </select>
          </label>
        </div>

        {/* Dependiente del tipo */}
        {form.tipoJustificacion === 'Acompañar a cita familiar' && (
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

        {['Cita medica personal','Asistencia a convocatoria','Acompañar a cita familiar'].includes(form.tipoJustificacion) && (
          <div style={{ marginBottom:12 }}>
            <label>Adjuntar documento <span style={{color:'red'}}>*</span>
              <input type="file" name="adjunto" accept=".pdf,.doc,.docx,image/*" onChange={handleChange} style={{ display:'block' }} />
            </label>
          </div>
        )}

        {/* Observaciones */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block' }}>Observaciones (opcional)
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} style={{ width:'100%' }} />
          </label>
        </div>

        {/* Fecha/hora de justificación */}
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <label>Fecha en que se justifica <span style={{color:'red'}}>*</span>
            <input type="date" name="justFecha" value={form.justFecha} onChange={handleChange} required style={{ display:'block' }} />
          </label>
          <label>Hora en que se justifica <span style={{color:'red'}}>*</span>
            <input type="time" name="justHora" value={form.justHora} onChange={handleChange} required style={{ display:'block' }} />
          </label>
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button type="submit" disabled={loading} style={{ padding: 10, background: '#0f766e', color: 'white', border: 'none', borderRadius: 6 }}>
            {loading ? 'Enviando…' : 'Enviar formulario'}
          </button>
          <Link href="/home">Volver al menú</Link>
        </div>
      </form>
    </div>
  );
}
