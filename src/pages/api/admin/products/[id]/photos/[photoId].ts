import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { productPhotos } from '../../../../../../db/schema'

// PUT: hacer foto principal (sortOrder = 0)
export const PUT: APIRoute = async ({ params }) => {
  const { id: productId, photoId } = params
  const db = getDb()

  const allPhotos = await db
    .select()
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId!))

  const target = allPhotos.find((p) => p.id === photoId)
  if (!target) return Response.json({ error: 'Foto no encontrada' }, { status: 404 })

  // Re-asignar sortOrders: target → 0, resto en orden actual sin el target
  const others = allPhotos
    .filter((p) => p.id !== photoId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  await Promise.all([
    db
      .update(productPhotos)
      .set({ sortOrder: 0 })
      .where(eq(productPhotos.id, photoId!)),
    ...others.map((p, i) =>
      db
        .update(productPhotos)
        .set({ sortOrder: i + 1 })
        .where(eq(productPhotos.id, p.id))
    ),
  ])

  const [updated] = await db
    .select()
    .from(productPhotos)
    .where(eq(productPhotos.id, photoId!))
    .limit(1)

  return Response.json(updated)
}

// DELETE: eliminar foto de DB y R2
export const DELETE: APIRoute = async ({ params }) => {
  const { id: productId, photoId } = params
  const db = getDb()

  const [photo] = await db
    .select()
    .from(productPhotos)
    .where(and(eq(productPhotos.id, photoId!), eq(productPhotos.productId, productId!)))
    .limit(1)

  if (!photo) return Response.json({ error: 'Foto no encontrada' }, { status: 404 })

  await env.R2.delete(photo.r2Key)
  await db.delete(productPhotos).where(eq(productPhotos.id, photoId!))

  return new Response(null, { status: 204 })
}
