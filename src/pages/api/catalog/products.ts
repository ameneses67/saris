import type { APIRoute } from 'astro'
import { and, desc, eq, exists, gte, like, lte, or, sql } from 'drizzle-orm'
import { getDb } from '../../../db'
import { brands, discounts, productPhotos, products, productVariants } from '../../../db/schema'
import { resolveDiscount } from '../../../lib/resolveDiscount'

const LIMIT = 20

export const GET: APIRoute = async ({ url }) => {
  const sp = url.searchParams
  const categoryId = sp.get('category') || undefined
  const subcategoryId = sp.get('subcategory') || undefined
  const brandId = sp.get('brand') || undefined
  const color = sp.get('color') || undefined
  const size = sp.get('size') || undefined
  const minPrice = sp.get('minPrice') ? Math.round(parseFloat(sp.get('minPrice')!) * 100) : undefined
  const maxPrice = sp.get('maxPrice') ? Math.round(parseFloat(sp.get('maxPrice')!) * 100) : undefined
  const q = sp.get('q') || undefined
  const page = Math.max(1, parseInt(sp.get('page') || '1'))
  const offset = (page - 1) * LIMIT

  const db = getDb()

  const conditions = [eq(products.status, 'active')] as ReturnType<typeof eq>[]

  if (categoryId) conditions.push(eq(products.categoryId, categoryId))
  if (subcategoryId) conditions.push(eq(products.subcategoryId, subcategoryId))
  if (brandId) conditions.push(eq(products.brandId, brandId))
  if (minPrice !== undefined) conditions.push(gte(products.basePrice, minPrice))
  if (maxPrice !== undefined) conditions.push(lte(products.basePrice, maxPrice))
  if (q) {
    conditions.push(
      or(like(products.name, `%${q}%`), like(products.description, `%${q}%`)) as ReturnType<typeof eq>
    )
  }
  if (color) {
    conditions.push(
      exists(
        db.select({ _: sql`1` }).from(productVariants).where(
          and(eq(productVariants.productId, products.id), eq(productVariants.color, color), eq(productVariants.status, 'active'))
        )
      ) as unknown as ReturnType<typeof eq>
    )
  }
  if (size) {
    conditions.push(
      exists(
        db.select({ _: sql`1` }).from(productVariants).where(
          and(eq(productVariants.productId, products.id), eq(productVariants.size, size), eq(productVariants.status, 'active'))
        )
      ) as unknown as ReturnType<typeof eq>
    )
  }

  const [rows, activeDiscounts] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        subcategoryId: products.subcategoryId,
        brandId: products.brandId,
        brandName: brands.name,
        basePrice: products.basePrice,
        mainPhotoKey: productPhotos.r2Key,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(productPhotos, and(eq(productPhotos.productId, products.id), eq(productPhotos.sortOrder, 0)))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(LIMIT + 1)
      .offset(offset),
    db.select().from(discounts).where(eq(discounts.active, true)),
  ])

  const hasMore = rows.length > LIMIT
  const pageRows = hasMore ? rows.slice(0, LIMIT) : rows

  const result = pageRows.map((p) => {
    const resolved = resolveDiscount(
      { id: p.id, categoryId: p.categoryId, subcategoryId: p.subcategoryId, brandId: p.brandId, basePrice: p.basePrice },
      { color: null, size: null, priceOverride: null },
      activeDiscounts,
    )
    return { ...p, discountedPrice: resolved?.finalPrice ?? null }
  })

  return Response.json({ products: result, hasMore, page })
}
