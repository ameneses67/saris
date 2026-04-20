import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { products, productPhotos } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params
  const body = await request.json() as {
    name: string
    description: string
    categoryId: string
    subcategoryId: string
    brandId: string
    basePrice: number
    featured?: boolean
    status?: 'active' | 'inactive'
  }

  if (!body.name?.trim()) return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!body.description?.trim()) return Response.json({ error: 'La descripción es requerida' }, { status: 400 })
  if (!body.categoryId) return Response.json({ error: 'La categoría es requerida' }, { status: 400 })
  if (!body.subcategoryId) return Response.json({ error: 'La subcategoría es requerida' }, { status: 400 })
  if (!body.brandId) return Response.json({ error: 'La marca es requerida' }, { status: 400 })
  if (!body.basePrice || body.basePrice <= 0) return Response.json({ error: 'El precio debe ser mayor a 0' }, { status: 400 })

  const db = getDb()

  const [updated] = await db
    .update(products)
    .set({
      name: body.name.trim(),
      slug: slugify(body.name.trim()),
      description: body.description.trim(),
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId,
      brandId: body.brandId,
      basePrice: Math.round(body.basePrice),
      featured: body.featured ?? false,
      status: body.status ?? 'active',
      updatedAt: new Date(),
    })
    .where(eq(products.id, id!))
    .returning()

  if (!updated) return Response.json({ error: 'Producto no encontrado' }, { status: 404 })
  return Response.json(updated)
}

// Toggle rápido de estado desde el listado (3.6)
export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params
  const body = await request.json() as { status: 'active' | 'inactive' }

  if (!['active', 'inactive'].includes(body.status)) {
    return Response.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const db = getDb()
  const [updated] = await db
    .update(products)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(products.id, id!))
    .returning()

  if (!updated) return Response.json({ error: 'Producto no encontrado' }, { status: 404 })
  return Response.json(updated)
}

// Eliminar fotos de R2 antes de borrar el producto (3.7)
export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params
  const db = getDb()

  const photos = await db
    .select({ r2Key: productPhotos.r2Key })
    .from(productPhotos)
    .where(eq(productPhotos.productId, id!))

  if (photos.length > 0) {
    await Promise.all(photos.map((p) => env.R2.delete(p.r2Key)))
  }

  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id!))
    .returning()

  if (!deleted) return Response.json({ error: 'Producto no encontrado' }, { status: 404 })
  return new Response(null, { status: 204 })
}
