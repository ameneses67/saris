import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { count, eq, max } from 'drizzle-orm'
import { getDb } from '../../../../../../db'
import { productPhotos, products } from '../../../../../../db/schema'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_PHOTOS = 3
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export const POST: APIRoute = async ({ params, request }) => {
  const { id: productId } = params

  const db = getDb()
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId!))
    .limit(1)

  if (!product) return Response.json({ error: 'Producto no encontrado' }, { status: 404 })

  // Verificar límite de 3 fotos (3.3)
  const [{ total }] = await db
    .select({ total: count() })
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId!))

  if (total >= MAX_PHOTOS) {
    return Response.json({ error: `El producto ya tiene el máximo de ${MAX_PHOTOS} fotos` }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const thumbFile = formData.get('thumb') as File | null

  if (!file) return Response.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o AVIF.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'El archivo supera el límite de 5 MB' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const photoId = crypto.randomUUID()
  const r2Key = `products/${productId}/${photoId}.${ext}`

  // Determinar sortOrder: siguiente al máximo existente
  const [agg] = await db
    .select({ maxOrder: max(productPhotos.sortOrder) })
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId!))

  const nextOrder = (agg?.maxOrder ?? -1) + 1

  // Subir imagen original a R2
  await env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  // Subir miniatura si se recibió
  let thumbKey: string | null = null
  if (thumbFile && thumbFile.size > 0) {
    thumbKey = `products/${productId}/${photoId}_thumb.jpg`
    await env.R2.put(thumbKey, await thumbFile.arrayBuffer(), {
      httpMetadata: { contentType: 'image/jpeg' },
    })
  }

  const [photo] = await db
    .insert(productPhotos)
    .values({
      id: photoId,
      productId: productId!,
      r2Key,
      thumbKey,
      altText: null,
      sortOrder: nextOrder,
    })
    .returning()

  return Response.json(photo, { status: 201 })
}
