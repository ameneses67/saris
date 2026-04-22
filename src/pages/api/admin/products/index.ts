import type { APIRoute } from 'astro'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { products, categories, subcategories, brands, productPhotos, productVariants } from '../../../../db/schema'
import { slugify } from '../../../../lib/slugify'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      subcategoryId: products.subcategoryId,
      subcategoryName: subcategories.name,
      brandId: products.brandId,
      brandName: brands.name,
      basePrice: products.basePrice,
      featured: products.featured,
      status: products.status,
      createdAt: products.createdAt,
      mainPhotoKey: productPhotos.r2Key,
      mainThumbKey: productPhotos.thumbKey,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(
      productPhotos,
      and(eq(productPhotos.productId, products.id), eq(productPhotos.sortOrder, 0))
    )
    .orderBy(desc(products.createdAt))

  return Response.json(rows)
}

export const POST: APIRoute = async ({ request }) => {
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

  // Generar slug único
  const baseSlug = slugify(body.name.trim())
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)
    if (existing.length === 0) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const productId = crypto.randomUUID()

  const [product] = await db
    .insert(products)
    .values({
      id: productId,
      slug,
      name: body.name.trim(),
      description: body.description.trim(),
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId,
      brandId: body.brandId,
      basePrice: Math.round(body.basePrice),
      featured: body.featured ?? false,
      status: body.status ?? 'active',
    })
    .returning()

  // Crear variante default automáticamente
  await db.insert(productVariants).values({
    id: crypto.randomUUID(),
    productId,
    color: null,
    size: null,
    priceOverride: null,
    status: 'active',
  })

  return Response.json(product, { status: 201 })
}
