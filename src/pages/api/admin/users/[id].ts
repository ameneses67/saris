import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { user, account } from '../../../../db/schema'
import { hashPassword } from 'better-auth/crypto'

export const PUT: APIRoute = async ({ request, locals, params }) => {
  if (locals.user?.role !== 'admin') {
    return Response.json({ error: 'Sin autorización' }, { status: 403 })
  }

  const { id } = params
  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 })

  const body = await request.json() as {
    name?: string
    role?: 'admin' | 'editor'
    password?: string
  }

  const db = getDb()
  const now = new Date()

  const updates: Record<string, unknown> = { updatedAt: now }
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.role === 'admin' || body.role === 'editor') updates.role = body.role

  if (Object.keys(updates).length > 1) {
    await db.update(user).set(updates).where(eq(user.id, id))
  }

  // Actualizar contraseña si se proporcionó
  if (body.password?.trim()) {
    if (body.password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    const hashed = await hashPassword(body.password)
    await db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.userId, id))
  }

  const updated = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  if (!updated.length) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  return Response.json(updated[0])
}

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (locals.user?.role !== 'admin') {
    return Response.json({ error: 'Sin autorización' }, { status: 403 })
  }

  const { id } = params
  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 })

  // No permitir eliminar su propia cuenta
  if (id === locals.user.id) {
    return Response.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  const db = getDb()
  await db.delete(user).where(eq(user.id, id))

  return Response.json({ ok: true })
}
