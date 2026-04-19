import type { APIRoute } from 'astro'
import { asc } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { brands } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name))
  return Response.json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as { name: string; sortOrder?: number }

  if (!body.name?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const db = getDb()
  const [brand] = await db
    .insert(brands)
    .values({
      id: crypto.randomUUID(),
      name: body.name.trim(),
      slug: slugify(body.name.trim()),
      sortOrder: body.sortOrder ?? 0,
    })
    .returning()

  return Response.json(brand, { status: 201 })
}
