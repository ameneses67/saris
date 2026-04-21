import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { user, account } from '../../../../db/schema'
import { hashPassword } from 'better-auth/crypto'

export const GET: APIRoute = async ({ locals }) => {
  if (locals.user?.role !== 'admin') {
    return Response.json({ error: 'Sin autorización' }, { status: 403 })
  }

  const db = getDb()
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt)

  return Response.json(users)
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') {
    return Response.json({ error: 'Sin autorización' }, { status: 403 })
  }

  const body = await request.json() as {
    name: string
    email: string
    password: string
    role: 'admin' | 'editor'
  }

  const { name, email, password, role } = body

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return Response.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const db = getDb()
  const now = new Date()

  // Verificar si el email ya existe
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase().trim())).limit(1)
  if (existing.length > 0) {
    return Response.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const userId = crypto.randomUUID()
  const hashed = await hashPassword(password)

  await db.insert(user).values({
    id: userId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role: role === 'admin' ? 'admin' : 'editor',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: 'credential',
    password: hashed,
    createdAt: now,
    updatedAt: now,
  })

  const created = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return Response.json(created[0], { status: 201 })
}
