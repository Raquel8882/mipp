import { NextResponse } from 'next/server'
import { requireAnyRole, requireRole } from '../../../../../lib/authHelpers'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export async function GET(req, { params }){
  const maybe = await requireAnyRole(req, ['staff_manager','admin'])
  if (maybe instanceof Response) return maybe

  const id = params.id
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,cedula,nombre,primer_apellido,segundo_apellido')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if(error) return NextResponse.json({ error: error.message }, { status: 500 })
  if(!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ user: data })
}

export async function PUT(req, { params }){
  // only admin can update via this endpoint
  const maybe = await requireRole(req, 'admin')
  if (maybe instanceof Response) return maybe

  try{
    const id = params.id
    const body = await req.json()
  const { nombre, segundo_nombre, primer_apellido, segundo_apellido, posicion, categoria, instancia, must_change_password } = body
  if(!nombre && !segundo_nombre && !primer_apellido && !segundo_apellido && !posicion && !categoria && !instancia && typeof must_change_password === 'undefined') {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
  }
    const payload = {}
  if(typeof nombre !== 'undefined') payload.nombre = nombre
  if(typeof segundo_nombre !== 'undefined') payload.segundo_nombre = segundo_nombre
  if(typeof primer_apellido !== 'undefined') payload.primer_apellido = primer_apellido
  if(typeof segundo_apellido !== 'undefined') payload.segundo_apellido = segundo_apellido
  if(typeof posicion !== 'undefined') payload.posicion = posicion
  if(typeof categoria !== 'undefined') payload.categoria = categoria
  if(typeof instancia !== 'undefined') payload.instancia = instancia
  if(typeof must_change_password !== 'undefined') payload.must_change_password = !!must_change_password
    const { data, error } = await supabaseAdmin.from('users').update(payload).eq('id', id).select('id').single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }catch(err){
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req, { params }){
  // only admin can delete
  const maybe = await requireRole(req, 'admin')
  if (maybe instanceof Response) return maybe
  const id = params.id
  const { error } = await supabaseAdmin.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if(error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
