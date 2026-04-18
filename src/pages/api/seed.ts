import type { APIRoute } from 'astro'
import { getAuth } from '../../lib/auth'
import { getDb } from '../../db'

// Endpoint temporal — eliminar después de crear el primer admin
export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env
  const db = getDb(env)
  const auth = getAuth(env)

  // Solo funciona si no existen usuarios
  const existing = await db.query.user.findFirst()
  if (existing) {
    return new Response(JSON.stringify({ error: 'Ya existen usuarios' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await context.request.json() as { name: string; email: string; password: string }

  const result = await auth.api.signUpEmail({
    body: { name: body.name, email: body.email, password: body.password },
  })

  // Promover a admin directamente en la BD
  await db
    .update((await import('../../db/schema')).user)
    .set({ role: 'admin' })
    .where((await import('drizzle-orm')).eq((await import('../../db/schema')).user.id, result.user.id))

  return new Response(JSON.stringify({ ok: true, email: result.user.email }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}
