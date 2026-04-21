import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { products } from '../db/schema'

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin
  const db = getDb()

  const activeProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(products.updatedAt)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const staticUrls = [
    `  <url>\n    <loc>${origin}/</loc>\n    <priority>1.0</priority>\n    <changefreq>weekly</changefreq>\n  </url>`,
    `  <url>\n    <loc>${origin}/catalogo</loc>\n    <priority>0.9</priority>\n    <changefreq>daily</changefreq>\n  </url>`,
  ]

  const productUrls = activeProducts.map(
    (p) =>
      `  <url>\n    <loc>${origin}/p/${p.slug}</loc>\n    <lastmod>${fmt(p.updatedAt)}</lastmod>\n    <priority>0.8</priority>\n    <changefreq>weekly</changefreq>\n  </url>`,
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...productUrls].join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
