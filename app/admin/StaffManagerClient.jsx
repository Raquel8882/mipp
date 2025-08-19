"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffManagerClient({ initialUsers = [], initialTotal = 0, initialPage = 1, initialPageSize = 12, initialSearch = '' }){
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [search, setSearch] = useState(initialSearch)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    cedula: '',
    nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    posicion: '',
    categoria: 'Titulo I',
    instancia: 'Propietario',
  })

  async function fetchPage(p = page, s = search){
    setLoading(true)
    setError(null)
    try{
      const qp = new URLSearchParams({ page: String(p), pageSize: String(pageSize), search: s })
      const res = await fetch('/api/admin/staff?' + qp.toString())
      if(!res.ok) throw new Error((await res.json()).detail || 'Error fetching')
      const data = await res.json()
  setUsers(data.users || [])
      setTotal(data.total || 0)
      setPage(p)
      // update URL params for back/refresh
      router.replace(`/admin?${qp.toString()}`)
    }catch(err){
      setError(err.message || String(err))
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => {
    // Always fetch on mount to ensure roles are up-to-date
    fetchPage(1, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e){
    e.preventDefault()
    setCreating(true)
    setError(null)
    try{
      // client-side validation
      const collapseSpaces = (s) => (s ?? '').toString().replace(/\s+/g, ' ').trim()
      const onlyDigits = /^\d+$/
      const lettersAndSpaces = /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/
  const bodyPayload = {
        cedula: collapseSpaces(newUser.cedula),
        nombre: collapseSpaces(newUser.nombre),
        segundo_nombre: newUser.segundo_nombre ? collapseSpaces(newUser.segundo_nombre) : null,
        primer_apellido: collapseSpaces(newUser.primer_apellido),
        segundo_apellido: collapseSpaces(newUser.segundo_apellido),
        posicion: collapseSpaces(newUser.posicion),
        categoria: collapseSpaces(newUser.categoria),
        instancia: collapseSpaces(newUser.instancia),
      }
  if(!onlyDigits.test(bodyPayload.cedula)) throw new Error('La cédula debe contener solo dígitos')
      const check = (label, v, { allowNull=false }={}) => {
        if(allowNull && (v == null)) return
        if(!v) throw new Error(`${label} es obligatorio`)
        if(!lettersAndSpaces.test(v)) throw new Error(`${label} solo permite letras y espacios`)
      }
  check('Nombre', bodyPayload.nombre)
  check('Primer apellido', bodyPayload.primer_apellido)
  check('Segundo apellido', bodyPayload.segundo_apellido)
  check('Posición', bodyPayload.posicion)
  check('Segundo nombre', bodyPayload.segundo_nombre, { allowNull: true })

  const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(bodyPayload) })
  const resp = await res.json()
  if(!res.ok) throw new Error(resp.error || resp.detail || 'Create failed')
  // reload first page
  setNewUser({
    cedula: '',
    nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    posicion: '',
    categoria: 'Titulo I',
    instancia: 'Propietario',
  })
      fetchPage(1)
    }catch(err){
      setError(err.message || String(err))
    }finally{
      setCreating(false)
    }
  }

  async function handleDelete(id){
    if(!confirm('Eliminar usuario?')) return
    setError(null)
    try{
      const res = await fetch('/api/admin/staff/' + id, { method: 'DELETE' })
      if(!res.ok) throw new Error((await res.json()).error || 'Delete failed')
      fetchPage(1)
    }catch(err){
      setError(err.message || String(err))
    }
  }

  async function handleUpdate(id, patch){
    setError(null)
    try{
      const res = await fetch('/api/admin/staff/' + id, { method: 'PUT', headers: { 'content-type':'application/json' }, body: JSON.stringify(patch) })
      if(!res.ok) throw new Error((await res.json()).error || 'Update failed')
      fetchPage(page, search)
    }catch(err){
      setError(err.message || String(err))
    }
  }

  async function handleAssignRole(cedula, role_slug){
    setError(null)
    try{
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ cedula, role_slug }) })
      const payload = await res.json()
      if(!res.ok) throw new Error(payload.error || payload.detail || 'Assign role failed')
  // refresh current page to reflect new roles
  await fetchPage(page, search)
    }catch(err){
      setError(err.message || String(err))
    }
  }

  async function handleRemoveRole(cedula, role_slug){
    setError(null)
    try{
      const res = await fetch('/api/admin/roles', { method: 'DELETE', headers: { 'content-type':'application/json' }, body: JSON.stringify({ cedula, role_slug }) })
      const payload = await res.json().catch(()=>({}))
      if(!res.ok) throw new Error(payload.error || payload.detail || 'Remove role failed')
      await fetchPage(page, search)
    }catch(err){
      setError(err.message || String(err))
    }
  }

  const totalPages = Math.max(1, Math.ceil((total || users.length) / pageSize))

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Buscar por cédula o nombre" value={search} onChange={e=>setSearch(e.target.value)} style={{ padding: 8, width: 300 }} />
        <button onClick={()=>fetchPage(1, search)} style={{ marginLeft: 8, padding: '8px 12px' }}>Buscar</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? <p>Cargando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Cédula</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Nombre</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Segundo nombre</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Apellidos</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Posición</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Categoría</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Instancia</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Debe cambiar contraseña</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Roles</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>{u.cedula}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <InlineEdit value={u.nombre} onSave={(val)=>handleUpdate(u.id, { nombre: val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <InlineEdit value={u.segundo_nombre} onSave={(val)=>handleUpdate(u.id, { segundo_nombre: val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <InlineEdit value={u.primer_apellido} onSave={(val)=>handleUpdate(u.id, { primer_apellido: val })} />
                      <InlineEdit value={u.segundo_apellido} onSave={(val)=>handleUpdate(u.id, { segundo_apellido: val })} />
                    </span>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <InlineEdit value={u.posicion} onSave={(val)=>handleUpdate(u.id, { posicion: val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <SelectEdit value={u.categoria} options={["Titulo I","Titulo II"]} onSave={(val)=>handleUpdate(u.id, { categoria: val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <SelectEdit value={u.instancia} options={["Propietario","Interino"]} onSave={(val)=>handleUpdate(u.id, { instancia: val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <ToggleEdit checked={!!u.must_change_password} onSave={(val)=>handleUpdate(u.id, { must_change_password: !!val })} />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {((u.roles && u.roles.length) ? u.roles : ['normal_user']).map(r => (
                        <span key={r} style={{ border: '1px solid #ddd', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span>{r}</span>
                          {r !== 'normal_user' && (
                            <button onClick={()=>handleRemoveRole(u.cedula, r)} title="Quitar rol" style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>&times;</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <button onClick={()=>navigator.clipboard?.writeText(u.cedula)} style={{ marginRight: 8 }}>Copiar cédula</button>
                    <button onClick={()=>handleDelete(u.id)} style={{ color: 'red', marginRight: 8 }}>Eliminar</button>
                    <RoleAssigner cedula={u.cedula} onAssign={(role)=>handleAssignRole(u.cedula, role)} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => fetchPage(Math.max(1, page-1), search)} disabled={page<=1}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button onClick={() => fetchPage(Math.min(totalPages, page+1), search)} disabled={page>=totalPages}>Siguiente</button>
      </div>

      <hr style={{ margin: '16px 0' }} />

    <h3>Crear usuario</h3>
      <form onSubmit={handleCreate}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input placeholder="Cédula" inputMode="numeric" pattern="[0-9]*" value={newUser.cedula} onChange={e=>{
            const v = e.target.value.replace(/[^0-9]/g, '')
            setNewUser({...newUser, cedula: v})
          }} required />
          <input placeholder="Nombre" value={newUser.nombre} onChange={e=>{
            const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '')
            setNewUser({...newUser, nombre: v})
          }} onBlur={e=>setNewUser(s=>({...s, nombre: e.target.value.replace(/\s+/g,' ').trim()}))} required />
          <input placeholder="Segundo nombre (opcional)" value={newUser.segundo_nombre} onChange={e=>{
            const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '')
            setNewUser({...newUser, segundo_nombre: v})
          }} onBlur={e=>setNewUser(s=>({...s, segundo_nombre: e.target.value.replace(/\s+/g,' ').trim()}))} />
          <input placeholder="Primer apellido" value={newUser.primer_apellido} onChange={e=>{
            const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '')
            setNewUser({...newUser, primer_apellido: v})
          }} onBlur={e=>setNewUser(s=>({...s, primer_apellido: e.target.value.replace(/\s+/g,' ').trim()}))} required />
          <input placeholder="Segundo apellido" value={newUser.segundo_apellido} onChange={e=>{
            const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '')
            setNewUser({...newUser, segundo_apellido: v})
          }} onBlur={e=>setNewUser(s=>({...s, segundo_apellido: e.target.value.replace(/\s+/g,' ').trim()}))} required />
          <input placeholder="Posición" value={newUser.posicion} onChange={e=>{
            const v = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '')
            setNewUser({...newUser, posicion: v})
          }} onBlur={e=>setNewUser(s=>({...s, posicion: e.target.value.replace(/\s+/g,' ').trim()}))} required />
          <select value={newUser.categoria} onChange={e=>setNewUser({...newUser, categoria: e.target.value})}>
            <option value="Titulo I">Titulo I</option>
            <option value="Titulo II">Titulo II</option>
          </select>
          <select value={newUser.instancia} onChange={e=>setNewUser({...newUser, instancia: e.target.value})}>
            <option value="Propietario">Propietario</option>
            <option value="Interino">Interino</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>La contraseña predeterminada es <b>admin123</b></span>
          <button type="submit" disabled={creating}>{creating ? 'Creando...' : 'Crear'}</button>
        </div>
      </form>
    </div>
  )
}

function InlineEdit({ value, onSave }){
  const [editing, setEditing] = React.useState(false)
  const [v, setV] = React.useState(value || '')
  useEffect(()=>{ setV(value || '') }, [value])
  return editing ? (
    <span>
      <input value={v} onChange={e=>{
        setV(e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, ''))
      }} onBlur={e=>setV(e.target.value.replace(/\s+/g,' ').trim())} />
  <button onClick={()=>{ const vv = (v||'').trim(); if(!vv){ alert('El valor no puede estar vacío'); return; } setEditing(false); onSave(vv) }} style={{ marginLeft: 6 }}>Guardar</button>
      <button onClick={()=>{ setEditing(false); setV(value) }} style={{ marginLeft: 6 }}>Cancelar</button>
    </span>
  ) : (
    <span>
      {value}
      <button onClick={()=>setEditing(true)} style={{ marginLeft: 6 }}>Editar</button>
    </span>
  )
}

function SelectEdit({ value, onSave, options = [] }){
  const [editing, setEditing] = React.useState(false)
  const [v, setV] = React.useState(value || '')
  useEffect(()=>{ setV(value || '') }, [value])
  return editing ? (
    <span>
      <select value={v} onChange={e=>setV(e.target.value)}>
        {options.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
      <button onClick={()=>{ setEditing(false); onSave(v) }} style={{ marginLeft: 6 }}>Guardar</button>
      <button onClick={()=>{ setEditing(false); setV(value) }} style={{ marginLeft: 6 }}>Cancelar</button>
    </span>
  ) : (
    <span>
      {value}
      <button onClick={()=>setEditing(true)} style={{ marginLeft: 6 }}>Editar</button>
    </span>
  )
}

function ToggleEdit({ checked, onSave }){
  const [editing, setEditing] = React.useState(false)
  const [v, setV] = React.useState(!!checked)
  useEffect(()=>{ setV(!!checked) }, [checked])
  return editing ? (
    <span>
      <input type="checkbox" checked={v} onChange={e=>setV(e.target.checked)} />
      <button onClick={()=>{ setEditing(false); onSave(v) }} style={{ marginLeft: 6 }}>Guardar</button>
      <button onClick={()=>{ setEditing(false); setV(!!checked) }} style={{ marginLeft: 6 }}>Cancelar</button>
    </span>
  ) : (
    <span>
      {checked ? 'Sí' : 'No'}
      <button onClick={()=>setEditing(true)} style={{ marginLeft: 6 }}>Editar</button>
    </span>
  )
}

function RoleAssigner({ cedula, onAssign }){
  const [role, setRole] = React.useState('')
  const [options, setOptions] = React.useState([
    // Fallback list; will be replaced by API if available
    'admin', 'staff_manager', 'dev', 'normal_user', 'infra_manager'
  ])

  React.useEffect(() => {
    let ignore = false
    ;(async () => {
      try{
        const res = await fetch('/api/admin/roles')
        if(!res.ok) return // keep fallback on 401/403 or error
        const j = await res.json()
        const slugs = Array.isArray(j.data) ? j.data.map(r => r.slug).filter(Boolean) : []
        if(!ignore && slugs.length) setOptions(slugs)
      }catch{ /* ignore and keep fallback */ }
    })()
    return () => { ignore = true }
  }, [])

  return (
    <span>
      <select value={role} onChange={e=>setRole(e.target.value)}>
        <option value="">Asignar rol</option>
        {options.map(op => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
      <button onClick={()=>{ if(role) onAssign(role); setRole('') }} style={{ marginLeft: 6 }}>Asignar</button>
    </span>
  )
}
