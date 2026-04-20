import type { APIRoute } from 'astro'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { productVariants, products } from '../../../../../../db/schema'

export const GET: APIRoute = async ({ params }) => {
  const { id: productId } = params
  const db = getDb()
  const rows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId!))
    .orderBy(asc(productVariants.createdAt))

  return Response.json(rows)
}

export const POST: APIRoute = async ({ params, request }) => {
  const { id: productId } = params
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
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId!))
    .limit(1)

  if (!product) return Response.json({ error: 'Producto no encontrado' }, { status: 404 })

  const [variant] = await db
    .insert(productVariants)
    .values({
      id: crypto.randomUUID(),
      productId: productId!,
      color: body.color?.trim() || null,
      size: body.size?.trim() || null,
      priceOverride: body.priceOverride != null && body.priceOverride > 0
        ? Math.round(body.priceOverride)
        : null,
      status: body.status ?? 'active',
    })
    .returning()

  return Response.json(variant, { status: 201 })
}
