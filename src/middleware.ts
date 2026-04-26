import { defineMiddleware } from 'astro:middleware'
import { getAuth } from './lib/auth'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url)

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const auth = getAuth()
    const session = await auth.api.getSession({ headers: context.request.headers })

    if (!session) {
      return context.redirect('/login')
    }

    context.locals.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as any).role ?? 'editor',
    }
    context.locals.session = {
      id: session.session.id,
      userId: session.session.userId,
      expiresAt: session.session.expiresAt,
    }
  }

  // Agent discovery: Link headers on homepage (RFC 8288 / RFC 9727)
  if (pathname === '/') {
    const response = await next()
    response.headers.append('Link', '</sitemap.xml>; rel="describedby"; type="application/xml"')
    response.headers.append('Link', '</robots.txt>; rel="describedby"; type="text/plain"')
    return response
  }

  return next()
})
