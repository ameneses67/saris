import type { APIRoute } from 'astro'
import { asc } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { categories } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))
  return Response.json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as { name: string; description?: string; sortOrder?: number }

  if (!body.name?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const db = getDb()
  const [category] = await db
    .insert(categories)
    .values({
      id: crypto.randomUUID(),
      name: body.name.trim(),
      slug: slugify(body.name.trim()),
      description: body.description?.trim() ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning()

  return Response.json(category, { status: 201 })
}
