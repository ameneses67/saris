import type { APIRoute } from 'astro'
import { getDb } from '../../../../db'
import { settings } from '../../../../db/schema'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db.select().from(settings).orderBy(settings.key)
  return Response.json(rows)
}

export const PUT: APIRoute = async ({ request }) => {
  const body = await request.json() as { key: string; value: string; description?: string }[]

  if (!Array.isArray(body) || body.length === 0) {
    return Response.json({ error: 'Se requiere un arreglo de ajustes' }, { status: 400 })
  }

  const db = getDb()
  const now = new Date()

  const updated = await Promise.all(
    body.map(({ key, value, description }) =>
      db
        .insert(settings)
        .values({
          id: crypto.randomUUID(),
          key,
          value: value ?? null,
          description: description ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: value ?? null,
            ...(description !== undefined ? { description } : {}),
            updatedAt: now,
          },
        })
        .returning()
        .then((rows) => rows[0]),
    ),
  )

  return Response.json(updated)
}
