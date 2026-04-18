import { defineMiddleware } from 'astro:middleware'
import { getAuth } from './lib/auth'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url)

  if (pathname.startsWith('/admin')) {
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

  return next()
})
