"use client"

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from 'next/navigation';
import useCurrentUser from '../../lib/useCurrentUser';
import LoadingOverlay from '../../components/LoadingOverlay';
import dayjs from 'dayjs';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Helper de fechas
const toDate = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const fmt2 = (n) => String(n).padStart(2, "0");
// Rango horario permitido
const TIME_MIN = '07:00';
const TIME_MAX = '16:30';
const STEP_MINUTES = 5; // salto mínimo entre horas
const toMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};
const fmtHHMM = (mins) => `${fmt2(Math.floor(mins / 60))}:${fmt2(mins % 60)}`;
// 12h label helper (for potential aria/labels)
const fmt12 = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  const am = h < 12;
  const h12 = ((h % 12) || 12);
  return `${h12}:${fmt2(m)} ${am ? 'AM' : 'PM'}`;
};
const clampTime = (hhmm) => {
  const v = toMin(hhmm);
  if (v == null) return TIME_MIN;
  return fmtHHMM(Math.min(Math.max(v, toMin(TIME_MIN)), toMin(TIME_MAX)));
};
const addMin = (hhmm, delta) => fmtHHMM(Math.min(Math.max(toMin(hhmm) + delta, toMin(TIME_MIN)), toMin(TIME_MAX)));
const normalizeTimes = (start, end) => {
  let s = clampTime(start);
  let e = clampTime(end);
  const sMin = toMin(s);
  let eMin = toMin(e);
  if (eMin <= sMin) {
    // forzar fin a ser posterior al inicio
    e = addMin(s, STEP_MINUTES);
    eMin = toMin(e);
    if (eMin <= sMin) {
      // si no se puede (p.ej. inicio en MAX), retrocede inicio
      s = addMin(e, -STEP_MINUTES);
    }
  }
  return { s, e };
};
const addDaysYMD = (ymd, days) => {
  if (!ymd) return '';
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${fmt2(dt.getUTCMonth() + 1)}-${fmt2(dt.getUTCDate())}`;
};

// Dayjs helpers to map HH:MM strings to picker values and back
const toDayjsFromHHMM = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return dayjs().hour(h).minute(m).second(0).millisecond(0);
};
const toHHMMFromDayjs = (d) => {
  if (!d || !dayjs.isDayjs(d)) return '';
  return `${fmt2(d.hour())}:${fmt2(d.minute())}`;
};
const minTimeDJ = () => dayjs().hour(7).minute(0).second(0).millisecond(0);
const maxTimeDJ = () => dayjs().hour(16).minute(30).second(0).millisecond(0);

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

  // YYYY-MM-DD de hoy para min en inputs de fecha
  const todayYMD = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${fmt2(n.getMonth() + 1)}-${fmt2(n.getDate())}`;
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
  const toggleJornada = () => setForm((p) => {
    const next = { ...p };
    next.jornada = p.jornada === 'Media' ? 'Completa' : 'Media';
    if (next.jornada === 'Media') {
      // set defaults if missing and ensure start < end
      next.horaInicio = next.horaInicio || TIME_MIN;
      next.horaFin = next.horaFin || addMin(next.horaInicio, STEP_MINUTES);
      const { s, e } = normalizeTimes(next.horaInicio, next.horaFin);
      next.horaInicio = s; next.horaFin = e;
    } else {
      next.horaSalida = '';
    }
    return next;
  });

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
  if (form.esRango && start && end && end <= start) errors.push("La fecha fin debe ser posterior a la fecha inicio");
  else if (start && end && end < start) errors.push("La fecha fin no puede ser anterior al inicio");

    // horas
    if (form.jornada === "Media") {
      if (!form.horaInicio || !form.horaFin) errors.push("Rango de horas requerido");
      const startMin = toMin(form.horaInicio || TIME_MIN);
      const endMin = toMin(form.horaFin || TIME_MIN);
      // dentro del rango permitido
      if (startMin < toMin(TIME_MIN) || startMin > toMin(TIME_MAX) || endMin < toMin(TIME_MIN) || endMin > toMin(TIME_MAX)) {
        errors.push(`Las horas deben estar entre ${TIME_MIN} y ${TIME_MAX}`);
      }
      // orden y diferencia mínima
      if (endMin <= startMin) errors.push(`La hora fin debe ser posterior a inicio (mínimo ${STEP_MINUTES} min)`);
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
  // No longer needed: timeOptions for select

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
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required style={{ display:'block' }} min={todayYMD} />
            </label>
          </div>
      {form.esRango && (
            <div>
      <label>Fecha fin <span style={{color:'red'}}>*</span>
    <input type="date" name="fechaFin" value={form.fechaFin} onChange={handleChange} required style={{ display:'block' }} min={form.esRango && form.fecha ? addDaysYMD(form.fecha, 1) : (form.fecha || todayYMD)} />
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div style={{ display:'flex', gap:12 }}>
                <div>
                  <label title="Hora de inicio">Hora inicio <span style={{color:'red'}}>*</span></label>
                  <TimePicker
                    ampm
                    minutesStep={STEP_MINUTES}
                    value={toDayjsFromHHMM(form.horaInicio) || null}
                    onChange={(newVal) => {
                      setForm((prev) => {
                        let nextStart = toHHMMFromDayjs(newVal);
                        // clamp to min/max
                        nextStart = clampTime(nextStart || TIME_MIN);
                        // if end missing, set to start + step; else normalize to ensure end > start
                        const currentEnd = prev.horaFin || addMin(nextStart, STEP_MINUTES);
                        const { s, e } = normalizeTimes(nextStart, currentEnd);
                        return { ...prev, horaInicio: s, horaFin: e };
                      });
                    }}
                    minTime={minTimeDJ()}
                    maxTime={maxTimeDJ()}
                    slotProps={{ textField: { required: true, inputProps: { 'aria-label': 'Hora de inicio' } } }}
                  />
                </div>
                <div>
                  <label title="Hora de fin">Hora fin <span style={{color:'red'}}>*</span></label>
                  <TimePicker
                    ampm
                    minutesStep={STEP_MINUTES}
                    value={toDayjsFromHHMM(form.horaFin) || null}
                    onChange={(newVal) => {
                      setForm((prev) => {
                        let nextEnd = toHHMMFromDayjs(newVal);
                        nextEnd = clampTime(nextEnd || addMin(prev.horaInicio || TIME_MIN, STEP_MINUTES));
                        const { s, e } = normalizeTimes(prev.horaInicio || TIME_MIN, nextEnd);
                        return { ...prev, horaInicio: s, horaFin: e };
                      });
                    }}
                    minTime={toDayjsFromHHMM(form.horaInicio || TIME_MIN) || minTimeDJ()}
                    maxTime={maxTimeDJ()}
                    slotProps={{ textField: { required: true, inputProps: { 'aria-label': 'Hora fin' } } }}
                  />
                </div>
              </div>
            </LocalizationProvider>
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div>
                <label title="Hora de salida del centro educativo">Hora de salida</label>
                <TimePicker
                  ampm
                  minutesStep={STEP_MINUTES}
                  value={toDayjsFromHHMM(form.horaSalida) || null}
                  onChange={(newVal) => {
                    const v = clampTime(toHHMMFromDayjs(newVal));
                    setForm((p) => ({ ...p, horaSalida: v || '' }));
                  }}
                  minTime={minTimeDJ()}
                  maxTime={maxTimeDJ()}
                  slotProps={{ textField: { inputProps: { 'aria-label': 'Hora de salida' } } }}
                />
              </div>
            </LocalizationProvider>
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
