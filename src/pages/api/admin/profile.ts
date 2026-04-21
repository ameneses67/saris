import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../db'
import { user, account } from '../../../db/schema'
import { hashPassword, verifyPassword } from 'better-auth/crypto'

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return Response.json({ error: 'Sin autorización' }, { status: 401 })
  }

  const body = await request.json() as {
    name?: string
    currentPassword?: string
    newPassword?: string
  }

  const db = getDb()
  const now = new Date()
  const userId = locals.user.id

  // Actualizar nombre
  if (body.name?.trim()) {
    await db
      .update(user)
      .set({ name: body.name.trim(), updatedAt: now })
      .where(eq(user.id, userId))
  }

  // Actualizar contraseña
  if (body.newPassword) {
    if (!body.currentPassword) {
      return Response.json({ error: 'Debes ingresar tu contraseña actual' }, { status: 400 })
    }
    if (body.newPassword.length < 8) {
      return Response.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const [acc] = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, userId))
      .limit(1)

    if (!acc?.password) {
      return Response.json({ error: 'No se pudo verificar la contraseña actual' }, { status: 400 })
    }

    const valid = await verifyPassword({ hash: acc.password, password: body.currentPassword })
    if (!valid) {
      return Response.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    const hashed = await hashPassword(body.newPassword)
    await db
      .update(account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(account.userId, userId))
  }

  const [updated] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return Response.json(updated)
}
