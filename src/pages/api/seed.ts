import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db'
import { user } from '../../db/schema'
import { getAuth } from '../../lib/auth'

// Endpoint temporal — eliminar después de crear el primer admin
export const POST: APIRoute = async (context) => {
  try {
    const db = getDb()
    const auth = getAuth()

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

    await db.update(user).set({ role: 'admin' }).where(eq(user.id, result.user.id))

    return new Response(JSON.stringify({ ok: true, email: result.user.email }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
