import type { APIRoute } from 'astro'
import { getAuth } from '../../../lib/auth'

export const ALL: APIRoute = async (context) => {
  const auth = getAuth(context.locals.runtime.env)
  return auth.handler(context.request)
}
