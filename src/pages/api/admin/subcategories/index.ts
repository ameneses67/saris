import type { APIRoute } from 'astro'
import { asc } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { subcategories } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db
    .select()
    .from(subcategories)
    .orderBy(asc(subcategories.sortOrder), asc(subcategories.name))
  return Response.json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as { name: string; categoryId: string; sortOrder?: number }

  if (!body.name?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!body.categoryId) {
    return Response.json({ error: 'La categoría es requerida' }, { status: 400 })
  }

  const db = getDb()
  const [subcategory] = await db
    .insert(subcategories)
    .values({
      id: crypto.randomUUID(),
      name: body.name.trim(),
      slug: slugify(body.name.trim()),
      categoryId: body.categoryId,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning()

  return Response.json(subcategory, { status: 201 })
}
