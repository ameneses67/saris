import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ url }) => {
  const origin = url.origin

  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /login

Sitemap: ${origin}/sitemap.xml
`

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
