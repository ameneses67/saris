import type { APIRoute } from 'astro'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { productVariants } from '../../../../../../db/schema'

export const PUT: APIRoute = async ({ params, request }) => {
  const { variantId } = params
  const body = await request.json() as {
    color?: string
    size?: string
    priceOverride?: number | null
    status?: 'active' | 'inactive'
  }

  if (!body.color?.trim() && !body.size?.trim()) {
    return Response.json({ error: 'Se requiere al menos color o talla' }, { status: 400 })
  }

  const db = getDb()
  const [updated] = await db
    .update(productVariants)
    .set({
      color: body.color?.trim() || null,
      size: body.size?.trim() || null,
      priceOverride: body.priceOverride != null && body.priceOverride > 0
        ? Math.round(body.priceOverride)
        : null,
      status: body.status ?? 'active',
      updatedAt: new Date(),
    })
    .where(eq(productVariants.id, variantId!))
    .returning()

  if (!updated) return Response.json({ error: 'Variante no encontrada' }, { status: 404 })
  return Response.json(updated)
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id: productId, variantId } = params
  const db = getDb()

  const [deleted] = await db
    .delete(productVariants)
    .where(and(eq(productVariants.id, variantId!), eq(productVariants.productId, productId!)))
    .returning()

  if (!deleted) return Response.json({ error: 'Variante no encontrada' }, { status: 404 })
  return new Response(null, { status: 204 })
}
