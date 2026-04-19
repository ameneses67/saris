import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { categories } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params
  const body = await request.json() as { name: string; sortOrder?: number }

  if (!body.name?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const db = getDb()
  const [updated] = await db
    .update(categories)
    .set({
      name: body.name.trim(),
      slug: slugify(body.name.trim()),
      sortOrder: body.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id!))
    .returning()

  if (!updated) {
    return Response.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  return Response.json(updated)
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params
  const db = getDb()

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id!))
    .returning()

  if (!deleted) {
    return Response.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  return new Response(null, { status: 204 })
}
