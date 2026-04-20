import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../db'
import { categories } from '../../../../../db/schema'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params
  const db = getDb()

  const [category] = await db
    .select({ id: categories.id, photoKey: categories.photoKey })
    .from(categories)
    .where(eq(categories.id, id!))
    .limit(1)

  if (!category) return Response.json({ error: 'Categoría no encontrada' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o AVIF.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'El archivo supera el límite de 5 MB' }, { status: 400 })
  }

  // Eliminar foto anterior de R2 si existe
  if (category.photoKey) {
    await env.R2.delete(category.photoKey)
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const photoId = crypto.randomUUID()
  const r2Key = `categories/${id}/${photoId}.${ext}`

  await env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  const [updated] = await db
    .update(categories)
    .set({ photoKey: r2Key, updatedAt: new Date() })
    .where(eq(categories.id, id!))
    .returning()

  return Response.json(updated)
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params
  const db = getDb()

  const [category] = await db
    .select({ id: categories.id, photoKey: categories.photoKey })
    .from(categories)
    .where(eq(categories.id, id!))
    .limit(1)

  if (!category) return Response.json({ error: 'Categoría no encontrada' }, { status: 404 })

  if (category.photoKey) {
    await env.R2.delete(category.photoKey)
  }

  const [updated] = await db
    .update(categories)
    .set({ photoKey: null, updatedAt: new Date() })
    .where(eq(categories.id, id!))
    .returning()

  return Response.json(updated)
}
