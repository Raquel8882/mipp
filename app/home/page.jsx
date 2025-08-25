"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import useCurrentUser from "../../lib/useCurrentUser"
import LoadingOverlay from "../../components/LoadingOverlay"
import styles from "./styles/home.module.css"

export default function HomePage() {
  const router = useRouter()
  const { user, roles, loading: authLoading } = useCurrentUser()
  const [cedula, setCedula] = useState(null)
  const [userName, setUserName] = useState("")
  const [items, setItems] = useState([]) // permisos + justificaciones + omisiones + infraestructura
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [filterTipo, setFilterTipo] = useState("Todos")
  const [showAll, setShowAll] = useState(false)

  const isAdmin = Array.isArray(roles) && roles.includes("admin")
  const isInfraManager = Array.isArray(roles) && roles.includes("infra_manager")
  const isViewer = Array.isArray(roles) && roles.includes("viewer")
  const isAdminOrViewer = isAdmin || isViewer
  const [adminOrder, setAdminOrder] = useState("newest")
  const [viewerPersonal, setViewerPersonal] = useState(false)

  // Auth redirect + cédula
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
    if (user) setCedula(user.cedula || null)
  }, [authLoading, user, router])

  // Cargar nombre del usuario
  useEffect(() => {
    if (!cedula) return
    ;(async () => {
      const { data, error } = await supabase
        .from("users")
        .select("nombre,segundo_nombre,primer_apellido,segundo_apellido")
        .eq("cedula", cedula)
        .maybeSingle()
      if (!error && data) {
        const seg = data.segundo_nombre ? ` ${data.segundo_nombre}` : ""
        setUserName(`${data.nombre}${seg} ${data.primer_apellido} ${data.segundo_apellido}`.trim())
      }
    })()
  }, [cedula])

  const fetchSolicitudes = async () => {
    // Evita cargar historial antes de conocer cédula cuando es vista personal
    if (!showAll && !cedula) return

    setLoadingSolicitudes(true)
    try {
      // Permisos
      let qPerm = supabase.from("solicitudes_permiso").select("*").order("created_at", { ascending: false })
      if (!isAdminOrViewer && cedula) qPerm = qPerm.eq("user_cedula", cedula)

      // Justificaciones
      let qJust = supabase.from("justificaciones").select("*").order("creado_en", { ascending: false })
      if (!isAdminOrViewer && cedula) qJust = qJust.eq("user_cedula", cedula)

      // Omisión de marca
      let qOmis = supabase.from("omision_marca").select("*").order("creado_en", { ascending: false })
      if (!isAdminOrViewer && cedula) qOmis = qOmis.eq("user_cedula", cedula)

      // Infraestructura
      let qInfra = supabase.from("reporte_infraestructura").select("*").order("creado_en", { ascending: false })
      if (!isAdminOrViewer && cedula) qInfra = qInfra.eq("user_cedula", cedula)

      const [permRes, justRes, omisRes, infraRes] = await Promise.all([qPerm, qJust, qOmis, qInfra])
      if (permRes.error) throw permRes.error
      if (justRes.error) throw justRes.error
      if (omisRes.error) throw omisRes.error
      if (infraRes.error) throw infraRes.error

      const perms = (permRes.data || []).map((r) => ({
        kind: "Permiso",
        id: r.id,
        userCedula: r.user_cedula || null,
        tipo_display: r.tipo_solicitud || "Solicitud",
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        es_rango: r.es_rango,
        jornada: r.jornada,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        observaciones: r.observaciones,
        estado: r.estado,
        createdAt: r.created_at || null,
        solicitante: r.nombre_solicitante || null,
      }))

      const justs = (justRes.data || []).map((r) => ({
        kind: "Justificación",
        id: r.id,
        userCedula: r.user_cedula || null,
        tipo_display: r.tipo_justificacion || "Justificación",
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        es_rango: r.es_rango,
        jornada: r.jornada,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        observaciones: r.observaciones,
        estado: r.estado || "Pendiente",
        createdAt: r.creado_en || null,
        solicitante: r.nombre_suscriptor || null,
      }))

      const omisiones = (omisRes.data || []).map((r) => ({
        kind: "Omisión de marca",
        id: r.id,
        userCedula: r.user_cedula || null,
        tipo_display: "Omisión de marca",
        fecha_inicio: r.fecha_omision,
        fecha_fin: null,
        es_rango: false,
        jornada: r.tipo_omision,
        hora_inicio: null,
        hora_fin: null,
        observaciones: r.justificacion,
        estado: r.estado || null,
        createdAt: r.creado_en || null,
        solicitante: r.nombre_suscriptor || null,
      }))

      const infra = (infraRes.data || []).map((r) => ({
        kind: "Infraestructura",
        id: r.id,
        userCedula: r.user_cedula || null,
        tipo_display: "Reporte de infraestructura",
        fecha_inicio: r.creado_en ? new Date(r.creado_en).toISOString().slice(0, 10) : "",
        fecha_fin: null,
        es_rango: false,
        jornada: r.tipo_reporte,
        hora_inicio: null,
        hora_fin: null,
        observaciones: (r.lugar ? `${r.lugar}: ` : "") + (r.reporte || ""),
        estado: r.estado || null,
        createdAt: r.creado_en || null,
        solicitante: r.nombre_suscriptor || null,
      }))

      const merged = [...perms, ...justs, ...omisiones, ...infra].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      setItems(merged)
    } catch (err) {
      console.error("fetch solicitudes error", err)
      setItems([])
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  useEffect(() => {
    fetchSolicitudes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula, showAll, isAdminOrViewer])

  const statusColor = (estado) => {
    if (!estado) return "#999"
    const s = String(estado).toLowerCase()
    if (s.includes("aprob") || s.includes("acept") || s.includes("solucion")) return "#16a34a"
    if (s.includes("pend")) return "#f59e0b"
    if (s.includes("rech") || s.includes("deneg") || s.includes("no solucion")) return "#ef4444"
    return "#6b7280"
  }

  const tipos = useMemo(() => ["Todos", "Permiso", "Justificación", "Omisión de marca", "Infraestructura"], [])

  const filtered = items.filter((row) => {
    if (filterTipo === "Todos") return true
    if (
      filterTipo === "Permiso" ||
      filterTipo === "Justificación" ||
      filterTipo === "Omisión de marca" ||
      filterTipo === "Infraestructura"
    ) {
      return row.kind === filterTipo
    }
    return String(row.tipo_display || "")
      .toLowerCase()
      .includes(filterTipo.toLowerCase())
  })

  const sortedForView = useMemo(() => {
    if (!isAdminOrViewer) return filtered
    // Mostrar solo pendientes
    const arr = filtered.filter((r) => {
      const s = (r.estado ?? "").toString().toLowerCase()
      return !r.estado || s.includes("pend")
    })
    const getT = (r) => (r?.createdAt ? new Date(r.createdAt).getTime() : 0)
    arr.sort((a, b) => {
      const ta = getT(a),
        tb = getT(b)
      return adminOrder === "newest" ? tb - ta : ta - tb
    })
    return arr
  }, [filtered, isAdminOrViewer, adminOrder])

  const myHistoryForViewer = useMemo(() => {
    if (!isViewer) return []
    const own = filtered.filter((r) => r.userCedula && cedula && String(r.userCedula) === String(cedula))
    // sort by createdAt desc
    own.sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    return own
  }, [filtered, isViewer, cedula])

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" })
    } catch (err) {
      console.error("logout error", err)
    }
    router.push("/login")
  }

  const globalLoading = authLoading || loadingSolicitudes || (!showAll && (!cedula || authLoading))

  if (globalLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingOverlay show={true} text="Cargando datos..." />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Bienvenido{userName ? `, ${userName}` : ""}</h2>
          <p className={styles.cedulaText}>{cedula ? `Cédula: ${cedula}` : "No has iniciado sesión"}</p>
        </div>
        <div className={styles.buttonGroup}>
          <Link
            href={isAdmin ? "/gestionarsolicitudes" : "/formulariopermiso"}
            className={styles.linkButton}
            style={{ background: "#0ea5e9" }}
          >
            {isAdmin ? "Gestionar solicitud de permisos" : "Crear solicitud de permiso"}
          </Link>
          <Link
            href={isAdmin ? "/gestionarjustificaciones" : "/formjustificacion"}
            className={styles.linkButton}
            style={{ background: "#7c3aed" }}
          >
            {isAdmin ? "Gestionar justificaciones" : "Crear justificación"}
          </Link>
          <Link
            href={isAdmin ? "/gestionarmarca" : "/omisionmarca"}
            className={styles.linkButton}
            style={{ background: "#059669" }}
          >
            {isAdmin ? "Gestionar justificaciones de omision de marca" : "Justificar omision de marca"}
          </Link>

          {isAdmin && (
            <Link href="/gestionarinfra" className={styles.linkButton} style={{ background: "#f97316" }}>
              Gestionar reportes de infraestructura
            </Link>
          )}
          {!isAdmin && isInfraManager && (
            <>
              <Link href="/gestionarinfra" className={styles.linkButton} style={{ background: "#f97316" }}>
                Gestionar reportes de infraestructura
              </Link>
              <Link href="/reporteinf" className={styles.linkButton} style={{ background: "#fb923c" }}>
                Reportar daño de infraestructura
              </Link>
            </>
          )}
          {!isAdmin && !isInfraManager && (
            <Link href="/reporteinf" className={styles.linkButton} style={{ background: "#f97316" }}>
              Reporte infraestructura
            </Link>
          )}

          {isAdminOrViewer && (
            <Link href="/solicitudesresueltas" className={styles.linkButton} style={{ background: "#334155" }}>
              Solicitudes resueltas
            </Link>
          )}

          {/* Historial para usuario normal */}
          {!isAdminOrViewer && (
            <button
              onClick={() => {
                setShowAll(true)
                fetchSolicitudes()
              }}
              className={styles.button}
            >
              Historial de mis solicitudes
            </button>
          )}

          {/* Toggle de viewer: pendientes globales <-> historial personal */}
          {isViewer &&
            (!viewerPersonal ? (
              <button
                onClick={() => {
                  setViewerPersonal(true)
                  setShowAll(true)
                }}
                className={styles.button}
              >
                Historial de mis solicitudes
              </button>
            ) : (
              <button onClick={() => setViewerPersonal(false)} className={styles.button}>
                Ver pendientes
              </button>
            ))}

          {/* Administrar personal: staff_manager o admin */}
          {Array.isArray(roles) && (roles.includes("staff_manager") || roles.includes("admin")) && (
            <Link href="/admin" className={styles.linkButton} style={{ background: "#06b6d4" }}>
              Administrar personal
            </Link>
          )}

          <button onClick={handleLogout} className={styles.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className={styles.filterSection}>
        <label>
          Filtro por tipo:
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className={styles.select}>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label>
            Ordenar:
            <select value={adminOrder} onChange={(e) => setAdminOrder(e.target.value)} className={styles.select}>
              <option value="newest">Más nuevos</option>
              <option value="oldest">Más antiguos</option>
            </select>
          </label>
        )}
        <label className={styles.statusLabel}>
          Mostrar: <strong>{showAll ? "Historial de mis solicitudes" : "Mis solicitudes"}</strong>
        </label>
        <button
          onClick={() => {
            setShowAll(false)
            fetchSolicitudes()
          }}
          className={styles.refreshButton}
        >
          Refrescar
        </button>
      </section>

      <main>
        {false ? (
          <p />
        ) : isAdminOrViewer ? (
          viewerPersonal && isViewer ? (
            <div className={styles.cardGrid}>
              {myHistoryForViewer.length === 0 ? (
                <p className={styles.noRecords}>No hay solicitudes.</p>
              ) : (
                myHistoryForViewer.map((s) => {
                  const Card = (
                    <article className={styles.card}>
                      <div>
                        <div className={styles.cardTitle}>{s.tipo_display}</div>
                        <div className={styles.cardSubtitle}>
                          {s.fecha_inicio}
                          {s.es_rango ? ` → ${s.fecha_fin}` : ""} • {s.jornada || ""} {s.kind ? `• ${s.kind}` : ""}
                        </div>
                        <div className={styles.cardDescription}>{s.observaciones || ""}</div>
                      </div>
                      <div className={styles.cardStatus}>
                        <div
                          className={styles.statusDot}
                          style={{ background: statusColor(s.estado) }}
                          title={s.estado || "Estado desconocido"}
                        />
                        <div className={styles.statusText}>{s.estado || "Sin estado"}</div>
                      </div>
                    </article>
                  )
                  let href = `/justificaciones/${s.id}`
                  if (s.kind === "Permiso") href = `/solicitudes/${s.id}`
                  if (s.kind === "Omisión de marca") href = `/omisionmarca/${s.id}`
                  if (s.kind === "Infraestructura") href = `/reporteinf/${s.id}`
                  return (
                    <Link key={`${s.kind}-${s.id}`} href={href} className={styles.cardLink}>
                      {Card}
                    </Link>
                  )
                })
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Tipo</th>
                    <th className={styles.tableHeaderCell}>Ingresado</th>
                    <th className={styles.tableHeaderCell}>Funcionario</th>
                    <th className={styles.tableHeaderCell}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedForView.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.noRecordsCell}>
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    sortedForView.map((s) => {
                      const dt = s.createdAt ? new Date(s.createdAt) : null
                      const fecha = dt ? dt.toLocaleDateString() : "—"
                      const hora = dt ? dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
                      let href = `/justificaciones/${s.id}`
                      if (s.kind === "Permiso") href = `/solicitudes/${s.id}`
                      if (s.kind === "Omisión de marca") href = `/omisionmarca/${s.id}`
                      if (s.kind === "Infraestructura") href = `/reporteinf/${s.id}`
                      return (
                        <tr key={`${s.kind}-${s.id}`} className={styles.tableRow}>
                          <td className={styles.tableCell}>{s.kind}</td>
                          <td className={styles.tableCell}>
                            {fecha} {hora && `• ${hora}`}
                          </td>
                          <td className={styles.tableCell}>{s.solicitante || "—"}</td>
                          <td className={styles.tableCell}>
                            <Link href={href} className={styles.tableLink}>
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className={styles.cardGrid}>
            {filtered.length === 0 ? (
              <p className={styles.noRecords}>No hay solicitudes.</p>
            ) : (
              filtered.map((s) => {
                const Card = (
                  <article className={styles.card}>
                    <div>
                      <div className={styles.cardTitle}>{s.tipo_display}</div>
                      <div className={styles.cardSubtitle}>
                        {s.fecha_inicio}
                        {s.es_rango ? ` → ${s.fecha_fin}` : ""} • {s.jornada || ""} {s.kind ? `• ${s.kind}` : ""}
                      </div>
                      <div className={styles.cardDescription}>{s.observaciones || ""}</div>
                    </div>
                    <div className={styles.cardStatus}>
                      <div
                        className={styles.statusDot}
                        style={{ background: statusColor(s.estado) }}
                        title={s.estado || "Estado desconocido"}
                      />
                      <div className={styles.statusText}>{s.estado || "Sin estado"}</div>
                    </div>
                  </article>
                )
                let href = `/justificaciones/${s.id}`
                if (s.kind === "Permiso") href = `/solicitudes/${s.id}`
                if (s.kind === "Omisión de marca") href = `/omisionmarca/${s.id}`
                if (s.kind === "Infraestructura") href = `/reporteinf/${s.id}`
                return (
                  <Link key={`${s.kind}-${s.id}`} href={href} className={styles.cardLink}>
                    {Card}
                  </Link>
                )
              })
            )}
          </div>
        )}
      </main>
    </div>
  )
}

